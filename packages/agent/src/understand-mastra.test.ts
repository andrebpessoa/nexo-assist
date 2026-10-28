import { describe, expect, test } from "bun:test";
import { MockLanguageModelV4 } from "ai/test";

import { emptyUnderstanding } from "./understand";
import { createMastraUnderstander } from "./understand-mastra";

const reply = (value: unknown) =>
	new MockLanguageModelV4({
		doGenerate: async () => ({
			content: [{ type: "text", text: JSON.stringify(value) }],
			finishReason: { unified: "stop", raw: "stop" },
			usage: {
				inputTokens: { total: 900, noCache: 900, cacheRead: 0, cacheWrite: 0 },
				outputTokens: { total: 60, text: 60, reasoning: 0 },
			},
			warnings: [],
		}),
	});

const input = {
	window: {
		summary: null,
		messages: [
			{ role: "employee" as const, text: "Minha VPN não conecta. Erro 809." },
		],
	},
	profile: { name: "Ana Souza", os: "Windows 11", department: "Financeiro" },
	pending: null,
};

describe("mastra understander", () => {
	test("mastra understander returns a valid understanding", async () => {
		const understood = {
			...emptyUnderstanding(),
			intent: "abrir_chamado",
			confidence: 88,
			fields: {
				...emptyUnderstanding().fields,
				category: "Rede e VPN",
				type: "INC",
			},
		};
		const u = createMastraUnderstander({
			model: reply(understood) as never,
			modelId: "google/gemini-2.5-flash-lite",
		});
		const out = await u.understand(input);
		expect(out.understanding.intent).toBe("abrir_chamado");
		expect(out.understanding.confidence).toBe(88);
		expect(out.understanding.fields.category).toBe("Rede e VPN");
		expect(out.usage).toEqual({
			inputTokens: 900,
			outputTokens: 60,
			costUsd: 0.000114,
		});

		const judged = await createMastraUnderstander({
			model: reply({
				articleSlug: "vpn-erro-809",
				articleFits: false,
				articleMisfitReason: "Windows 11",
				sameProblemNumber: null,
				sameProblemConfidence: 0,
			}) as never,
			modelId: "google/gemini-2.5-flash-lite",
		}).judge({
			message: "erro 809",
			profile: input.profile,
			articles: [],
			tickets: [],
		});
		expect(judged.judgement.articleFits).toBe(false);

		const bad = createMastraUnderstander({
			model: reply({ intent: "pizza", confidence: 300 }) as never,
			modelId: "x",
		});
		await expect(bad.understand(input)).rejects.toThrow();
	});
});
