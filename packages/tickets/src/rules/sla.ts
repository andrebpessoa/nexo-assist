import type { Priority, Status } from "../types";
import { addBusinessMinutes, businessMinutesBetween } from "./business-hours";
import { isOpen } from "./transitions";

const MINUTE = 60_000;

/** Minutes added to the SLA anchor; Crítica counts calendar time, the others business time (TKT-17). */
export const SLA_MINUTES: Record<Priority, number> = {
	Crítica: 60,
	Alta: 4 * 60,
	Média: 3 * 10 * 60,
	Baixa: 5 * 10 * 60,
};

export function deadlineFor(priority: Priority, anchor: Date): Date {
	if (priority === "Crítica")
		return new Date(anchor.getTime() + SLA_MINUTES.Crítica * MINUTE);
	return addBusinessMinutes(anchor, SLA_MINUTES[priority]);
}

export interface SlaTicket {
	priority: Priority;
	status: Status;
	slaAnchorAt: Date;
}

/** Whether an open ticket is past its deadline and by how much (TKT-19). Closed tickets are never overdue. */
export function overdue(
	ticket: SlaTicket,
	now: Date,
): { vencido: boolean; atrasoMinutos: number } {
	const deadline = deadlineFor(ticket.priority, ticket.slaAnchorAt);
	if (!isOpen(ticket.status) || now <= deadline)
		return { vencido: false, atrasoMinutos: 0 };
	const atrasoMinutos =
		ticket.priority === "Crítica"
			? Math.floor((now.getTime() - deadline.getTime()) / MINUTE)
			: businessMinutesBetween(deadline, now);
	return { vencido: true, atrasoMinutos };
}
