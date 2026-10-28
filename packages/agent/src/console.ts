import type { ConsoleRow, StoredMessage } from "./store";
import type { Block, ConversationState } from "./types";

export type ConsoleAction = "assume" | "reply" | "return" | "close";
export type TransitionError = "TAKEN" | "NOT_YOURS" | "INVALID_TRANSITION";

export type TransitionResult =
	| {
			ok: true;
			state: ConversationState;
			assigneeId: string | null;
			/** False when the move leaves the conversation as it was (assume twice, reply). */
			changed: boolean;
	  }
	| { ok: false; code: TransitionError };

/**
 * The conversation state machine of the console (CON-23 to CON-29, design D-04). Pure: the server
 * applies the result with a conditional update, so a race still has one winner (CON-24).
 */
export function transition(
	conv: { state: ConversationState; assigneeId: string | null },
	action: ConsoleAction,
	me: string,
): TransitionResult {
	const mine = conv.state === "com_analista" && conv.assigneeId === me;
	const theirs = conv.state === "com_analista" && !mine;
	const invalid = { ok: false, code: "INVALID_TRANSITION" } as const;
	switch (action) {
		case "assume":
			if (mine)
				return {
					ok: true,
					state: "com_analista",
					assigneeId: me,
					changed: false,
				};
			if (theirs) return { ok: false, code: "TAKEN" };
			if (conv.state === "encerrada") return invalid;
			return { ok: true, state: "com_analista", assigneeId: me, changed: true };
		case "reply":
			if (mine)
				return {
					ok: true,
					state: "com_analista",
					assigneeId: me,
					changed: false,
				};
			return theirs ? { ok: false, code: "NOT_YOURS" } : invalid;
		case "return":
			if (mine || conv.state === "aguardando_analista")
				return { ok: true, state: "agent", assigneeId: null, changed: true };
			return theirs ? { ok: false, code: "NOT_YOURS" } : invalid;
		case "close":
			if (theirs) return { ok: false, code: "NOT_YOURS" };
			if (conv.state === "encerrada") return invalid;
			return {
				ok: true,
				state: "encerrada",
				assigneeId: conv.assigneeId,
				changed: true,
			};
	}
}

export type ConsoleStatus =
	| { kind: "transferida"; ticket: string | null }
	| { kind: "pediu_ajuda"; confidence: number }
	| { kind: "agent" }
	| { kind: "resolvida" }
	| { kind: "voce" }
	| { kind: "outro_analista"; assigneeId: string | null }
	| { kind: "encerrada" };

/** One line of the console list, computed on the server (CON-02 to CON-07). */
export interface ConsoleItem {
	id: string;
	userId: string;
	name: string;
	department: string | null;
	state: ConversationState;
	assigneeId: string | null;
	status: ConsoleStatus;
	/** The ticket of the conversation (design D-05). */
	ticket: string | null;
	/** Every ticket number the conversation mentions, for the search (CON-08). */
	tickets: string[];
	contactBy: string | null;
	preview: { role: StoredMessage["role"]; text: string } | null;
	lastAt: string;
	unread: number;
	/** Not a closed conversation older than 7 days (CON-06). */
	recent: boolean;
}

export const CONSOLE_FILTERS = [
	"todas",
	"para_voce",
	"com_agent",
	"minhas",
] as const;
export type ConsoleFilter = (typeof CONSOLE_FILTERS)[number];

const HOUR = 3_600_000;
const RESOLVED_AFTER = 24 * HOUR;
const KEEP_CLOSED = 7 * 24 * HOUR;
const TICKET = /^(INC|REQ)-\d+$/;

function numbersIn(block: Block): string[] {
	switch (block.kind) {
		case "ticket_card":
			return [block.ticket.number];
		case "ticket_list":
			return block.tickets.map((t) => t.number);
		case "ticket_draft":
			return block.number ? [block.number] : [];
		case "update_draft":
		case "reopen_draft":
			return [block.number];
		default:
			return [];
	}
}

/** The last transfer of the conversation: its deadline and the decision behind it. */
function lastTransfer(messages: StoredMessage[]) {
	for (const m of [...messages].reverse())
		for (const b of m.blocks)
			if (b.kind === "transfer") return { contactBy: b.contactBy, message: m };
	return null;
}

/** The conversation's ticket: the last one transferred, else the last one shown or created (D-05). */
function ticketOf(messages: StoredMessage[], mentioned: string[]) {
	for (const m of [...messages].reverse()) {
		const moved = m.decision?.tools.findLast(
			(t) => t.name === "chamados.transferir" && t.ok && t.target,
		);
		if (moved?.target) return moved.target;
	}
	return mentioned.at(-1) ?? null;
}

export function summarize(row: ConsoleRow, now: Date, me: string): ConsoleItem {
	const { conversation: conv, messages } = row;
	const mentioned: string[] = [];
	const add = (n: string) => {
		if (!mentioned.includes(n)) mentioned.push(n);
	};
	for (const m of messages) {
		if (m.role === "employee" && TICKET.test(m.text.trim())) add(m.text.trim());
		for (const b of m.blocks) for (const n of numbersIn(b)) add(n);
	}
	const ticket = ticketOf(messages, mentioned);
	const spoken = messages.filter((m) => m.role !== "system");
	const last = spoken.at(-1) ?? null;
	const lastAt = (messages.at(-1)?.createdAt ?? row.updatedAt).toISOString();
	const transfer = lastTransfer(messages);
	const waiting = conv.state === "aguardando_analista";

	let status: ConsoleStatus;
	if (waiting) {
		const d = transfer?.message.decision;
		status =
			d?.transfer?.trigger === "confianca_baixa"
				? { kind: "pediu_ajuda", confidence: d.confidence }
				: { kind: "transferida", ticket };
	} else if (conv.state === "com_analista")
		status =
			conv.assigneeId === me
				? { kind: "voce" }
				: { kind: "outro_analista", assigneeId: conv.assigneeId };
	else if (conv.state === "encerrada") status = { kind: "encerrada" };
	else if (
		last?.role === "agent" &&
		now.getTime() - last.createdAt.getTime() > RESOLVED_AFTER
	)
		status = { kind: "resolvida" };
	else status = { kind: "agent" };

	return {
		id: conv.id,
		userId: conv.userId,
		name: row.employee.name,
		department: row.employee.department,
		state: conv.state,
		assigneeId: conv.assigneeId,
		status,
		ticket,
		tickets: mentioned,
		contactBy: waiting ? (transfer?.contactBy ?? null) : null,
		preview: last ? { role: last.role, text: last.text } : null,
		lastAt,
		unread: messages.filter(
			(m) => m.role === "employee" && m.seq > conv.readSeq,
		).length,
		recent: !(
			conv.state === "encerrada" &&
			now.getTime() - row.updatedAt.getTime() > KEEP_CLOSED
		),
	};
}

export function inFilter(item: ConsoleItem, filter: ConsoleFilter): boolean {
	switch (filter) {
		case "para_voce":
			return item.state === "aguardando_analista";
		case "com_agent":
			return item.status.kind === "agent";
		case "minhas":
			return item.status.kind === "voce";
		case "todas":
			return item.recent;
	}
}

export function filterCounts(
	items: ConsoleItem[],
): Record<ConsoleFilter, number> {
	return Object.fromEntries(
		CONSOLE_FILTERS.map((f) => [f, items.filter((i) => inFilter(i, f)).length]),
	) as Record<ConsoleFilter, number>;
}

/** Waiting first by the nearest contact deadline, then the rest by the last message (CON-07). */
export function order(items: ConsoleItem[]): ConsoleItem[] {
	const deadline = (i: ConsoleItem) =>
		i.contactBy ? Date.parse(i.contactBy) : Number.POSITIVE_INFINITY;
	return [...items].sort((a, b) => {
		const wa = a.state === "aguardando_analista";
		const wb = b.state === "aguardando_analista";
		if (wa !== wb) return wa ? -1 : 1;
		if (wa) return deadline(a) - deadline(b);
		return Date.parse(b.lastAt) - Date.parse(a.lastAt);
	});
}
