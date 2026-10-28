import type { TicketSummary } from "@nexo-assist/tickets";
import {
	isOpen,
	REOPEN_WINDOW_MS,
} from "@nexo-assist/tickets/rules/transitions";

export type DuplicateAction =
	| { kind: "new" }
	| { kind: "complement"; ticket: TicketSummary }
	| { kind: "reopen"; ticket: TicketSummary }
	| { kind: "new_citing"; ticket: TicketSummary };

/**
 * The model says which of the employee's tickets is the same problem; the code decides what to do
 * with it: complement an open one, reopen one resolved 7 days ago or less, or cite an older one
 * (AGT-20, AGT-21, AGT-22).
 */
export function duplicateAction(
	tickets: TicketSummary[],
	sameProblemNumber: string | null,
	now: Date,
): DuplicateAction {
	const ticket = sameProblemNumber
		? tickets.find((t) => t.number === sameProblemNumber)
		: undefined;
	if (!ticket) return { kind: "new" };
	if (isOpen(ticket.status)) return { kind: "complement", ticket };
	if (
		ticket.status === "Resolvido" &&
		now.getTime() - ticket.updatedAt.getTime() <= REOPEN_WINDOW_MS
	)
		return { kind: "reopen", ticket };
	return { kind: "new_citing", ticket };
}
