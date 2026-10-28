import { createAgent } from "@nexo-assist/agent/engine";
import { createProfileReader } from "@nexo-assist/agent/profile";
import { createConversationStore } from "@nexo-assist/agent/store";
import type { Database } from "@nexo-assist/db";
import type { Context } from "hono";

import { type ChatEnv, chooseUnderstander } from "./chat-agent";
import type { ConsoleAccess } from "./console";
import { createTicketService } from "./tickets";

/** The analyst of one request; the actor comes from the session (TKT-06, AUTH-15). */
export function createConsoleResolver({
	getDb,
	getSession,
	env,
}: {
	getDb: () => Database;
	getSession: (
		db: Database,
		headers: Headers,
	) => Promise<{ user: { id: string } } | null>;
	env: ChatEnv;
}) {
	return async (c: Context): Promise<ConsoleAccess> => {
		const db = getDb();
		const session = await getSession(db, c.req.raw.headers);
		const access = await createTicketService({ db, env, session });
		if (!access.ok)
			return {
				ok: false,
				status: access.error === "UNAUTHENTICATED" ? 401 : 403,
			};
		if (access.actor.kind !== "analyst") return { ok: false, status: 403 };
		const store = createConversationStore({ db });
		const profileOf = createProfileReader(db);
		return {
			ok: true,
			analyst: access.actor,
			service: access.service,
			store,
			agent: createAgent({
				tickets: access.service,
				understander: chooseUnderstander(env).understander,
				store,
				profileOf,
			}),
			nameOf: async (id) => (await profileOf(id)).name,
		};
	};
}
