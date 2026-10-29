import { createAgent } from "@nexo-assist/agent/engine";
import { createProfileReader } from "@nexo-assist/agent/profile";
import { createConversationStore } from "@nexo-assist/agent/store";
import type { Understander } from "@nexo-assist/agent/understand";
import {
	createMastraUnderstander,
	DEFAULT_MODEL,
} from "@nexo-assist/agent/understand-mastra";
import type { Database } from "@nexo-assist/db";
import type { Context } from "hono";

import type { ChatAccess } from "./chat";
import { createDevUnderstander } from "./dev-understander";
import { createTicketService, type TicketsEnv } from "./tickets";
import { createUsageLimiter, limitsFrom, meter, type UsageEnv } from "./usage";

export interface ChatEnv extends TicketsEnv, UsageEnv {
	GOOGLE_GENERATIVE_AI_API_KEY?: string;
	/** `provider/model` for the Mastra model router; Flash-Lite when empty (AD-008, AD-017). */
	LLM_MODEL?: string;
	DEV_SEED_ENABLED?: string;
}

const unavailable: Understander = {
	understand: () => Promise.reject(new Error("model not configured")),
	judge: () => Promise.reject(new Error("model not configured")),
};

/** Gemini through Mastra with a key; keywords in local dev; otherwise the model is down (D-06). */
export function chooseUnderstander(
	env: ChatEnv,
	make: (o: { apiKey: string; modelId: string }) => Understander = (o) =>
		createMastraUnderstander(o),
): {
	understander: Understander;
	modelId: string | undefined;
} {
	const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
	const modelId = env.LLM_MODEL?.trim() || DEFAULT_MODEL;
	if (apiKey)
		return {
			understander: make({ apiKey, modelId }),
			modelId,
		};
	if (env.DEV_SEED_ENABLED === "true")
		return { understander: createDevUnderstander(), modelId: "dev-keywords" };
	return { understander: unavailable, modelId: undefined };
}

/** The employee's agent for one request; the actor comes from the session (TKT-06). */
export function createChatResolver({
	getDb,
	getSession,
	env,
	makeUnderstander,
}: {
	getDb: () => Database;
	getSession: (
		db: Database,
		headers: Headers,
	) => Promise<{ user: { id: string } } | null>;
	env: ChatEnv;
	/** The Mastra understander unless a test gives another. */
	makeUnderstander?: (o: { apiKey: string; modelId: string }) => Understander;
}) {
	return async (c: Context): Promise<ChatAccess> => {
		const db = getDb();
		const session = await getSession(db, c.req.raw.headers);
		const access = await createTicketService({ db, env, session });
		if (!access.ok)
			return {
				ok: false,
				status: access.error === "UNAUTHENTICATED" ? 401 : 403,
			};
		if (access.actor.kind !== "employee") return { ok: false, status: 403 };
		const userId = access.actor.userId;
		const profileOf = createProfileReader(db);
		const { name } = await profileOf(userId);
		const chosen = chooseUnderstander(env, makeUnderstander);
		const usage = createUsageLimiter({ db, limits: limitsFrom(env) });
		// Every model call takes one from the day's budget (DLV-13).
		const understander = meter(chosen.understander, usage.reserveModelCall);
		const { modelId } = chosen;
		return {
			ok: true,
			userId,
			firstName: name.split(" ")[0] ?? name,
			agentFor: (onStep) =>
				createAgent({
					tickets: access.service,
					understander,
					store: createConversationStore({ db }),
					profileOf,
					onStep,
					// One JSON line per decision, without message text (TRN-17).
					log: (line) => console.log(line),
					modelId,
				}),
		};
	};
}
