import type { Database } from "@nexo-assist/db";
import {
	type Actor,
	TEAMS,
	type Team,
	type TicketService,
} from "@nexo-assist/tickets";
import { withSimulatedFailure } from "@nexo-assist/tickets/failure";
import { createTicketRepository } from "@nexo-assist/tickets/repository";
import { createTicketService as createBaseService } from "@nexo-assist/tickets/service";

/** The Worker env as strings; defaults live in `.env.schema` and `alchemy.run.ts`. */
export interface TicketsEnv {
	TICKETS_FAILURE_RATE?: string;
	TICKETS_EXTRA_LATENCY_MS?: string;
}

export type TicketsAccess =
	| { ok: true; actor: Actor; service: TicketService }
	| { ok: false; error: "UNAUTHENTICATED" | "NO_PROFILE" };

const DEFAULT_RATE = 0.1;

export function readFailureConfig(env: TicketsEnv) {
	const rate = Number(env.TICKETS_FAILURE_RATE ?? DEFAULT_RATE);
	const latency = Number(env.TICKETS_EXTRA_LATENCY_MS ?? 0);
	return {
		rate: Number.isFinite(rate) ? Math.min(Math.max(rate, 0), 1) : DEFAULT_RATE,
		extraLatencyMs: Number.isFinite(latency) && latency > 0 ? latency : 0,
	};
}

const isTeam = (value: string | null): value is Team =>
	TEAMS.includes(value as Team);

/**
 * The service for one request. The actor comes from the Better Auth session and the `profile`
 * table, never from a parameter the model or the client sends (TKT-06). Takes `env` as a
 * parameter instead of importing `cloudflare:workers`, so it runs under `bun test`.
 */
export async function createTicketService({
	db,
	env,
	session,
	random,
}: {
	db: Database;
	env: TicketsEnv;
	session: { user: { id: string } } | null;
	random?: () => number;
}): Promise<TicketsAccess> {
	if (!session) return { ok: false, error: "UNAUTHENTICATED" };
	const found = await createTicketRepository(db).getProfile(session.user.id);
	if (!found) return { ok: false, error: "NO_PROFILE" };
	const actor: Actor =
		found.role === "analyst"
			? {
					kind: "analyst",
					userId: found.userId,
					name: found.name,
					team: isTeam(found.team) ? found.team : "Suporte N1",
				}
			: { kind: "employee", userId: found.userId };
	const service = withSimulatedFailure(createBaseService({ db }), {
		...readFailureConfig(env),
		random,
	});
	return { ok: true, actor, service };
}
