import { describe, expect, test } from "bun:test";
import type { TicketSummary } from "@nexo-assist/tickets";
import { isTextConfirmation } from "./confirm";
import { contactDeadline, teamFor } from "./contact";
import { duplicateAction } from "./duplicates";

const now = new Date("2026-10-28T13:00:00-03:00");
const day = 24 * 60 * 60_000;
const t = (over: Partial<TicketSummary>): TicketSummary => ({
	number: "INC-1",
	title: "VPN",
	type: "INC",
	category: "Rede e VPN",
	item: null,
	priority: "Alta",
	status: "Em andamento",
	openedAt: now,
	updatedAt: now,
	deadlineAt: now,
	vencido: false,
	atrasoMinutos: 0,
	...over,
});

describe("rules", () => {
	test("team and contact deadline", () => {
		expect(teamFor("Crítica", false)).toBe("Suporte N2");
		expect(teamFor("Média", true)).toBe("Suporte N2");
		expect(teamFor("Alta", false)).toBe("Suporte N1");
		expect(contactDeadline("Crítica", now).toISOString()).toBe(
			"2026-10-28T17:00:00.000Z",
		);
		expect(contactDeadline("Alta", now).toISOString()).toBe(
			"2026-10-28T18:00:00.000Z",
		);
		const late = new Date("2026-10-28T17:30:00-03:00");
		expect(contactDeadline("Média", late).toISOString()).toBe(
			"2026-10-29T12:30:00.000Z",
		);
	});

	test("text confirmation", () => {
		for (const yes of [
			"sim",
			"Sim!",
			"pode criar",
			"Pode criar.",
			"confirmo",
			"ok",
			"pode sim",
		])
			expect(isTextConfirmation(yes)).toBe(true);
		for (const no of [
			"não",
			"sim, mas mude o título",
			"talvez",
			"cria outro",
			"",
		])
			expect(isTextConfirmation(no)).toBe(false);
	});

	test("duplicate action by status and the 7-day window", () => {
		const open = t({ number: "INC-1" });
		const recent = t({
			number: "INC-2",
			status: "Resolvido",
			updatedAt: new Date(now.getTime() - 7 * day),
		});
		const old = t({
			number: "INC-3",
			status: "Resolvido",
			updatedAt: new Date(now.getTime() - 7 * day - 1),
		});
		const all = [open, recent, old];
		expect(duplicateAction(all, null, now)).toEqual({ kind: "new" });
		expect(duplicateAction(all, "INC-9", now)).toEqual({ kind: "new" });
		expect(duplicateAction(all, "INC-1", now)).toEqual({
			kind: "complement",
			ticket: open,
		});
		expect(duplicateAction(all, "INC-2", now)).toEqual({
			kind: "reopen",
			ticket: recent,
		});
		expect(duplicateAction(all, "INC-3", now)).toEqual({
			kind: "new_citing",
			ticket: old,
		});
	});
});
