import { CLOSED_STATUSES, type Status } from "../types";

export const REOPEN_WINDOW_MS = 7 * 24 * 60 * 60_000;

/** Open means anything but Resolvido, Fechado and Cancelado (TKT-03). */
export function isOpen(status: Status): boolean {
	return !(CLOSED_STATUSES as readonly Status[]).includes(status);
}

/** Notes and updates only go to open tickets (TKT-14). */
export function canUpdate(status: Status): boolean {
	return isOpen(status);
}

/** Only Resolvido tickets resolved 7 days ago or less can be reopened (TKT-15, TKT-16). */
export function canReopen(
	ticket: { status: Status; resolvedAt: Date | null },
	now: Date,
): boolean {
	if (ticket.status !== "Resolvido" || !ticket.resolvedAt) return false;
	return now.getTime() - ticket.resolvedAt.getTime() <= REOPEN_WINDOW_MS;
}
