import type { Priority, Team } from "@nexo-assist/tickets";
import { addBusinessMinutes } from "@nexo-assist/tickets/rules/business-hours";

const CONTACT_BUSINESS_MINUTES = 120;
const CRITICAL_CONTACT_MS = 60 * 60_000;

/** Crítica and overdue tickets go to N2; everything else to N1. */
export function teamFor(priority: Priority, vencido: boolean): Team {
	return priority === "Crítica" || vencido ? "Suporte N2" : "Suporte N1";
}

/** An analyst contacts within 2 business hours; Crítica within 1 clock hour (AD-004). */
export function contactDeadline(priority: Priority, now: Date): Date {
	if (priority === "Crítica")
		return new Date(now.getTime() + CRITICAL_CONTACT_MS);
	return addBusinessMinutes(now, CONTACT_BUSINESS_MINUTES);
}
