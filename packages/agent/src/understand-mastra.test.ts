import { describe, expect, test } from "bun:test";
import { MockLanguageModelV4 } from "ai/test";

import { emptyUnderstanding } from "./understand";
import {
	createMastraUnderstander,
	JUDGE_INSTRUCTIONS,
} from "./understand-mastra";

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
				articleResolves: true,
				articleTried: false,
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

	test("judge returns whether the article resolves and was tried", async () => {
		const judged = await createMastraUnderstander({
			model: reply({
				articleSlug: "senha-bloqueada",
				articleFits: true,
				articleMisfitReason: null,
				articleResolves: true,
				articleTried: true,
				sameProblemNumber: "INC-20150",
				sameProblemConfidence: 95,
			}) as never,
			modelId: "google/gemini-3.5-flash-lite",
		}).judge({
			message: "x",
			profile: input.profile,
			articles: [],
			tickets: [],
		});
		expect(judged.judgement).toMatchObject({
			articleResolves: true,
			articleTried: true,
		});

		const old = createMastraUnderstander({
			model: reply({
				articleSlug: null,
				articleFits: null,
				articleMisfitReason: null,
				sameProblemNumber: null,
				sameProblemConfidence: 0,
			}) as never,
			modelId: "google/gemini-3.5-flash-lite",
		});
		await expect(
			old.judge({
				message: "x",
				profile: input.profile,
				articles: [],
				tickets: [],
			}),
		).rejects.toThrow();
	});

	test("judge prompt defines resolves without a ticket", async () => {
		const model = reply({
			articleSlug: null,
			articleFits: null,
			articleMisfitReason: null,
			articleResolves: null,
			articleTried: null,
			sameProblemNumber: null,
			sameProblemConfidence: 0,
		});
		await createMastraUnderstander({
			model: model as never,
			modelId: "google/gemini-3.5-flash-lite",
		}).judge({
			message:
				"Minha senha do SAP bloqueou de novo e o autoatendimento não libera.",
			profile: input.profile,
			articles: [
				{
					slug: "senha-bloqueada",
					title: "Senha bloqueada",
					body: "Use o autoatendimento em senha.nexo.local para desbloquear.",
					appliesWhen: "Contas do SAP e da rede corporativa.",
					keywords: ["senha"],
				} as never,
			],
			tickets: [],
		});
		const sent = JSON.stringify(model.doGenerateCalls[0]?.prompt);
		// The judge reads the article's steps, or it cannot tell they were already tried.
		expect(sent).toContain("Use o autoatendimento em senha.nexo.local");
		expect(sent).toContain(JSON.stringify(JUDGE_INSTRUCTIONS).slice(1, 60));
		const rules = JUDGE_INSTRUCTIONS;
		expect(rules).toContain("articleResolves");
		expect(rules).toContain("sem chamado");
		// outro sintoma do mesmo programa
		expect(rules).toContain("Outlook não envia");
		expect(rules).toContain("sincronizar");
		// só diz como pedir um equipamento
		expect(rules).toContain("monitor");
		expect(rules).toContain("como pedir");
		// passo já feito
		expect(rules).toContain("articleTried");
		expect(rules).toContain("o autoatendimento não libera");
	});
});
