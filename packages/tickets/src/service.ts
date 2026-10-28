import type { Database } from "@nexo-assist/db";

import { rankArticles } from "./kb";
import {
	createTicketRepository,
	type TicketChange,
	type TicketRow,
} from "./repository";
import { deadlineFor, overdue } from "./rules/sla";
import { canReopen, canUpdate, isOpen } from "./rules/transitions";
import { validateNewTicket, validateTransfer } from "./rules/validate";
import {
	type Actor,
	type Clock,
	fail,
	ok,
	type Result,
	type TicketDetail,
	type TicketService,
	type TicketSummary,
} from "./types";

const NOT_FOUND_MESSAGE = "Chamado não encontrado.";

export interface TicketServiceDeps {
	db: Database;
	clock?: Clock;
}

const systemClock: Clock = { now: () => new Date() };

function toSummary(row: TicketRow, now: Date): TicketSummary {
	return {
		number: row.number,
		title: row.title,
		type: row.type,
		category: row.category,
		item: row.item,
		priority: row.priority,
		status: row.status,
		openedAt: row.openedAt,
		updatedAt: row.updatedAt,
		deadlineAt: deadlineFor(row.priority, row.slaAnchorAt),
		...overdue(row, now),
	};
}

/** Rule errors are values; anything thrown (a D1 failure) becomes the same retryable code. */
async function guarded<T>(
	operation: string,
	run: () => Promise<Result<T>>,
): Promise<Result<T>> {
	try {
		return await run();
	} catch (error) {
		console.error(`[tickets] ${operation} failed`, error);
		return fail(
			"SERVICE_UNAVAILABLE",
			"O sistema de chamados não respondeu. Tente de novo em instantes.",
		);
	}
}

/** The only entry point of the simulated legacy ticket system (TKT-01). */
export function createTicketService({
	db,
	clock = systemClock,
}: TicketServiceDeps): TicketService {
	const repo = createTicketRepository(db);

	/** Employees only see their own tickets; someone else's ticket looks exactly like a missing one (TKT-05). */
	async function visibleTicket(
		actor: Actor,
		number: string,
	): Promise<TicketRow | undefined> {
		const row = await repo.getByNumber(number.trim().toUpperCase());
		if (!row) return undefined;
		if (actor.kind === "employee" && row.requesterId !== actor.userId)
			return undefined;
		return row;
	}

	async function detail(row: TicketRow): Promise<TicketDetail> {
		const { notes, events } = await repo.getHistory(row.id);
		return {
			...toSummary(row, clock.now()),
			description: row.description,
			affected: row.affected,
			requester: { id: row.requesterId, name: row.requesterName },
			notes,
			events: events.map((event) => ({
				kind: event.kind,
				actor: event.actor,
				at: event.at,
				...(event.summary ? { summary: event.summary } : {}),
				...(event.team ? { team: event.team } : {}),
			})),
		};
	}

	async function change(
		row: TicketRow,
		ticketChange: TicketChange,
	): Promise<Result<TicketDetail>> {
		await repo.applyChange(row.id, ticketChange);
		const changed = await repo.getByNumber(row.number);
		if (!changed) return fail("NOT_FOUND", NOT_FOUND_MESSAGE);
		return ok(await detail(changed));
	}

	return {
		list(actor, opts = {}) {
			return guarded("list", async () => {
				// TKT-06: an employee's requester comes from the session; a requesterId they pass is ignored.
				const rows =
					actor.kind === "employee"
						? await repo.listByRequester(actor.userId)
						: await repo.listAll(
								opts.requesterId ? { requesterId: opts.requesterId } : {},
							);
				const now = clock.now();
				const visible = opts.onlyOpen
					? rows.filter((row) => isOpen(row.status))
					: rows;
				return ok(visible.map((row) => toSummary(row, now)));
			});
		},

		get(actor, number) {
			return guarded("get", async () => {
				const row = await visibleTicket(actor, number);
				return row
					? ok(await detail(row))
					: fail("NOT_FOUND", NOT_FOUND_MESSAGE);
			});
		},

		create(actor, input, idempotencyKey) {
			return guarded("create", async () => {
				const valid = validateNewTicket(input);
				if (!valid.ok) return valid;
				const row = await repo.insertTicket({
					...valid.value,
					requesterId: actor.userId,
					now: clock.now(),
					// Scoped to the requester so one user's key can never return another user's ticket.
					idempotencyKey: `${actor.userId}:${idempotencyKey}`,
				});
				return ok(await detail(row));
			});
		},

		addNote(actor, number, body) {
			return guarded("addNote", async () => {
				const row = await visibleTicket(actor, number);
				if (!row) return fail("NOT_FOUND", NOT_FOUND_MESSAGE);
				const text = body.trim();
				if (!text)
					return fail("INVALID_TICKET", "A nota está vazia.", ["body"]);
				if (!canUpdate(row.status))
					return fail(
						"TICKET_CLOSED",
						`O chamado ${row.number} está ${row.status}.`,
					);
				const now = clock.now();
				const byTeam = actor.kind === "analyst";
				return change(row, {
					updatedAt: now,
					// TKT-20, TKT-21: a team update restarts the deadline; the employee's complement does not.
					...(byTeam ? { slaAnchorAt: now } : {}),
					note: { authorId: actor.userId, body: text },
					event: { kind: "atualizado", actorId: actor.userId },
				});
			});
		},

		reopen(actor, number, reason) {
			return guarded("reopen", async () => {
				const row = await visibleTicket(actor, number);
				if (!row) return fail("NOT_FOUND", NOT_FOUND_MESSAGE);
				const text = reason.trim();
				if (!text)
					return fail("INVALID_TICKET", "Informe o motivo da reabertura.", [
						"reason",
					]);
				const now = clock.now();
				if (!canReopen(row, now)) {
					return fail(
						"REOPEN_NOT_ALLOWED",
						"Só dá para reabrir chamado resolvido há 7 dias ou menos.",
					);
				}
				return change(row, {
					status: "Aguardando analista",
					updatedAt: now,
					slaAnchorAt: now,
					resolvedAt: null,
					note: { authorId: actor.userId, body: text },
					event: { kind: "reaberto", actorId: actor.userId, summary: text },
				});
			});
		},

		transfer(actor, number, transfer) {
			return guarded("transfer", async () => {
				const row = await visibleTicket(actor, number);
				if (!row) return fail("NOT_FOUND", NOT_FOUND_MESSAGE);
				const valid = validateTransfer(transfer);
				if (!valid.ok) return valid;
				if (!canUpdate(row.status))
					return fail(
						"TICKET_CLOSED",
						`O chamado ${row.number} está ${row.status}.`,
					);
				const now = clock.now();
				return change(row, {
					status: "Aguardando analista",
					updatedAt: now,
					slaAnchorAt: now,
					event: { kind: "transferido", actorId: actor.userId, ...valid.value },
				});
			});
		},

		assume(actor, number) {
			return guarded("assume", async () => {
				const row = await visibleTicket(actor, number);
				if (!row) return fail("NOT_FOUND", NOT_FOUND_MESSAGE);
				if (!canUpdate(row.status))
					return fail(
						"TICKET_CLOSED",
						`O chamado ${row.number} está ${row.status}.`,
					);
				const now = clock.now();
				return change(row, {
					status: "Em atendimento",
					assigneeId: actor.userId,
					updatedAt: now,
					slaAnchorAt: now,
					event: { kind: "assumido", actorId: actor.userId, team: actor.team },
				});
			});
		},

		searchArticles(query) {
			return guarded("searchArticles", async () =>
				ok(rankArticles(query, await repo.listArticles())),
			);
		},
	};
}
