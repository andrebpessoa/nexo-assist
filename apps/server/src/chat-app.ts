import type { Understander } from "@nexo-assist/agent/understand";
import type { Database } from "@nexo-assist/db";

import { createChatRoutes } from "./chat";
import { type ChatEnv, createChatResolver } from "./chat-agent";
import { createUsageLimiter, limitsFrom } from "./usage";

/** The employee's `/chat/*` with the session, the agent and the usage limits wired (DLV-13). */
export function createChatApp({
	getDb,
	getSession,
	env,
	makeUnderstander,
	wordDelayMs,
}: {
	getDb: () => Database;
	getSession: (
		db: Database,
		headers: Headers,
	) => Promise<{ user: { id: string } } | null>;
	env: ChatEnv;
	makeUnderstander?: (o: { apiKey: string; modelId: string }) => Understander;
	wordDelayMs?: number;
}) {
	return createChatRoutes({
		wordDelayMs,
		admitUsage: (userId) =>
			createUsageLimiter({ db: getDb(), limits: limitsFrom(env) }).admitMessage(
				userId,
			),
		resolve: createChatResolver({ getDb, getSession, env, makeUnderstander }),
	});
}
