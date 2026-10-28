import { describe, expect, test } from "bun:test";

import { deadlineFor, overdue } from "./sla";

const sp = (local: string) => new Date(`${local}-03:00`);

describe("deadline by priority", () => {
	test("Crítica adds 1 calendar hour, even on saturday 03:00", () => {
		expect(deadlineFor("Crítica", sp("2026-10-31T03:00:00"))).toEqual(
			sp("2026-10-31T04:00:00"),
		);
	});

	test("Alta adds 4 business hours", () => {
		expect(deadlineFor("Alta", sp("2026-10-30T16:00:00"))).toEqual(
			sp("2026-11-02T10:00:00"),
		);
	});

	test("Média adds 3 business days", () => {
		expect(deadlineFor("Média", sp("2026-10-26T09:00:00"))).toEqual(
			sp("2026-10-29T09:00:00"),
		);
	});

	test("Baixa adds 5 business days", () => {
		expect(deadlineFor("Baixa", sp("2026-10-26T09:00:00"))).toEqual(
			sp("2026-11-02T09:00:00"),
		);
	});
});

describe("overdue", () => {
	const ticket = {
		priority: "Alta",
		status: "Aguardando analista",
		slaAnchorAt: sp("2026-10-30T16:00:00"),
	} as const;

	test("open ticket past the deadline is vencido with the delay in business minutes", () => {
		expect(overdue(ticket, sp("2026-11-02T11:30:00"))).toEqual({
			vencido: true,
			atrasoMinutos: 90,
		});
	});

	test("open ticket before the deadline is not vencido", () => {
		expect(overdue(ticket, sp("2026-11-02T09:59:00"))).toEqual({
			vencido: false,
			atrasoMinutos: 0,
		});
	});

	test("exactly at the deadline is not vencido yet", () => {
		expect(overdue(ticket, sp("2026-11-02T10:00:00"))).toEqual({
			vencido: false,
			atrasoMinutos: 0,
		});
	});

	test("Crítica delay counts calendar minutes", () => {
		const critical = {
			...ticket,
			priority: "Crítica",
			slaAnchorAt: sp("2026-10-31T03:00:00"),
		} as const;
		expect(overdue(critical, sp("2026-10-31T05:15:00"))).toEqual({
			vencido: true,
			atrasoMinutos: 75,
		});
	});

	test("closed ticket is never vencido", () => {
		for (const status of ["Resolvido", "Fechado", "Cancelado"] as const) {
			expect(overdue({ ...ticket, status }, sp("2026-12-01T12:00:00"))).toEqual(
				{ vencido: false, atrasoMinutos: 0 },
			);
		}
	});
});
