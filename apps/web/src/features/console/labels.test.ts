import { describe, expect, test } from "bun:test";

import { item, NOW } from "./fixtures";
import { listTime, matches, previewText, statusLabel } from "./labels";

describe("statusLabel", () => {
	test("each state has its label", () => {
		const cases: [Parameters<typeof item>[0], string][] = [
			[{}, "Transferida · INC-20311"],
			[
				{
					status: { kind: "transferida", ticket: null },
					ticket: null,
					contactBy: "2026-10-28T13:35:00.000Z",
				},
				"Transferida · contato em 25 min",
			],
			[
				{ status: { kind: "pediu_ajuda", confidence: 41 } },
				"Agent pediu ajuda · confiança 41%",
			],
			[{ status: { kind: "agent" } }, "Agent atendendo"],
			[{ status: { kind: "resolvida" } }, "Resolvida pelo agent"],
			[{ status: { kind: "voce" } }, "Você está atendendo"],
			[
				{
					status: { kind: "outro_analista", assigneeId: "m" },
					assigneeName: "Marina Teixeira",
				},
				"Marina Teixeira está atendendo",
			],
			[{ status: { kind: "encerrada" } }, "Encerrada"],
		];
		for (const [over, label] of cases)
			expect(statusLabel(item(over), NOW).text).toBe(label);
	});
});

describe("list helpers", () => {
	test("time: now, today, yesterday, older", () => {
		expect(listTime("2026-10-28T13:09:40.000Z", NOW)).toBe("agora");
		expect(listTime("2026-10-28T13:05:00.000Z", NOW)).toBe("10:05");
		expect(listTime("2026-10-27T13:05:00.000Z", NOW)).toBe("ontem");
		expect(listTime("2026-10-20T13:05:00.000Z", NOW)).toBe("20/10");
	});

	test("search by name or ticket, ignoring case and accents", () => {
		const fabio = item({ name: "Fábio Nunes", tickets: ["REQ-10442"] });
		expect(matches(fabio, "fabio")).toBe(true);
		expect(matches(fabio, "FÁB")).toBe(true);
		expect(matches(fabio, "req-10442")).toBe(true);
		expect(matches(fabio, "10442")).toBe(true);
		expect(matches(fabio, "ana")).toBe(false);
		expect(matches(fabio, "  ")).toBe(true);
	});

	test("preview says who wrote it", () => {
		expect(
			previewText(item({ preview: { role: "agent", text: "Vou chamar." } })),
		).toBe("Nexo: Vou chamar.");
		expect(previewText(item())).toBe("Está parado há 5 dias.");
		expect(previewText(item({ preview: null }))).toBe("");
	});
});
