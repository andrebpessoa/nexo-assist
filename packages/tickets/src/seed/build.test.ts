import { describe, expect, test } from "bun:test";

import { overdue } from "../rules/sla";
import { canReopen } from "../rules/transitions";
import { buildSeed } from "./build";

// Different moments of the week, so the relative dates hold whenever the seed runs.
const moments = [
	new Date("2026-10-28T10:00:00-03:00"), // Wednesday morning
	new Date("2026-11-02T08:30:00-03:00"), // Monday right after opening
	new Date("2026-11-01T15:00:00-03:00"), // Sunday
	new Date("2026-10-30T17:59:00-03:00"), // Friday before closing
];

const now = moments[0] as Date;
const seed = buildSeed(now);
const ticket = (number: string) => {
	const found = seed.tickets.find((candidate) => candidate.number === number);
	if (!found) throw new Error(`${number} missing from the seed`);
	return found;
};
const DAY = 24 * 60 * 60_000;

describe("buildSeed", () => {
	test("people: at least 5 employees with Ana Souza and 2 analysts with Rafael Lima N2", () => {
		const employees = seed.users.filter((person) => person.role === "employee");
		const analysts = seed.users.filter((person) => person.role === "analyst");
		expect(employees.length).toBeGreaterThanOrEqual(5);
		expect(analysts.length).toBeGreaterThanOrEqual(2);
		expect(employees).toContainEqual(
			expect.objectContaining({
				name: "Ana Souza",
				email: "ana.souza@nexo.com.br",
				department: "Financeiro",
				os: "Windows 11",
			}),
		);
		expect(analysts).toContainEqual(
			expect.objectContaining({ name: "Rafael Lima", team: "Suporte N2" }),
		);
		expect(analysts.some((person) => person.team === "Suporte N1")).toBe(true);
		for (const person of employees) {
			expect(person.email).toMatch(/^[a-z.]+@nexo\.com\.br$/);
			expect(person.department).toBeTruthy();
			expect(person.os).toBeTruthy();
		}
		expect(new Set(seed.users.map((person) => person.email)).size).toBe(
			seed.users.length,
		);
	});

	test("articles: 5 to 10, with VPN erro 809 and the service desk hours", () => {
		expect(seed.articles.length).toBeGreaterThanOrEqual(5);
		expect(seed.articles.length).toBeLessThanOrEqual(10);
		const vpn = seed.articles.find(
			(article) => article.slug === "vpn-erro-809",
		);
		expect(vpn?.body).toContain(
			"reinstale o cliente de VPN pelo portal de softwares",
		);
		expect(vpn?.appliesWhen).toContain("Windows 10");
		const hours = seed.articles.find(
			(article) => article.slug === "horario-service-desk",
		);
		expect(hours?.body).toContain("de segunda a sexta, das 8h às 18h");
		for (const article of seed.articles) {
			expect(article.title && article.body && article.appliesWhen).toBeTruthy();
			expect(article.keywords.length).toBeGreaterThan(0);
		}
	});

	test("tickets: the Anexo B cases relative to now", () => {
		const inc20311 = ticket("INC-20311");
		expect(inc20311).toMatchObject({
			title: "Notebook lento após atualização do Windows",
			category: "Hardware",
			priority: "Média",
			status: "Aguardando analista",
			requester: "ana.souza@nexo.com.br",
		});
		expect(now.getTime() - inc20311.updatedAt.getTime()).toBe(6 * DAY);

		const req10442 = ticket("REQ-10442");
		expect(req10442).toMatchObject({
			type: "REQ",
			category: "Hardware",
			priority: "Baixa",
			status: "Aprovado",
		});

		const inc20150 = ticket("INC-20150");
		expect(inc20150).toMatchObject({
			category: "Acesso",
			priority: "Média",
			status: "Resolvido",
		});
		expect(now.getTime() - (inc20150.resolvedAt?.getTime() ?? 0)).toBe(4 * DAY);
		expect(canReopen(inc20150, now)).toBe(true);

		const oldResolved = seed.tickets.filter(
			(t) => t.status === "Resolvido" && !canReopen(t, now),
		);
		expect(oldResolved.length).toBeGreaterThanOrEqual(1);

		const others = seed.tickets.filter(
			(t) => t.requester !== "ana.souza@nexo.com.br",
		);
		expect(new Set(others.map((t) => t.requester)).size).toBeGreaterThanOrEqual(
			2,
		);
	});

	test("tickets: INC-20311 is overdue and INC-20298 is not, whenever the seed runs", () => {
		for (const moment of moments) {
			const data = buildSeed(moment);
			const find = (number: string) =>
				data.tickets.find((t) => t.number === number);
			expect(
				overdue(find("INC-20311") ?? ticket("INC-20311"), moment).vencido,
			).toBe(true);
			expect(
				overdue(find("INC-20298") ?? ticket("INC-20298"), moment).vencido,
			).toBe(false);
		}
	});

	test("tickets: consistent references and dates", () => {
		const emails = new Set(seed.users.map((person) => person.email));
		expect(new Set(seed.tickets.map((t) => t.number)).size).toBe(
			seed.tickets.length,
		);
		for (const t of seed.tickets) {
			expect(t.number).toMatch(new RegExp(`^${t.type}-\\d{5}$`));
			expect(emails.has(t.requester)).toBe(true);
			if (t.assignee) expect(emails.has(t.assignee)).toBe(true);
			expect(t.openedAt.getTime()).toBeLessThanOrEqual(t.updatedAt.getTime());
			expect(t.updatedAt.getTime()).toBeLessThanOrEqual(now.getTime());
			expect(t.events[0]?.kind).toBe("criado");
			for (const entry of [...t.notes, ...t.events]) {
				expect(emails.has("author" in entry ? entry.author : entry.actor)).toBe(
					true,
				);
			}
		}
	});

	test("is deterministic for the same moment", () => {
		expect(buildSeed(now)).toEqual(seed);
	});
});
