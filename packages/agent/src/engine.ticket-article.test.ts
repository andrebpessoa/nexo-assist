import { describe, expect, test } from "bun:test";

import { COPY } from "./copy";
import { agentHarness, said } from "./testing";
import type { Judgement } from "./understand";
import type { ScriptedTurn } from "./understand-scripted";

// The seed's help center finds "senha-bloqueada" for this text; Ana has INC-20311 open,
// INC-20150 resolved 7 days ago or less and INC-19877 resolved earlier.
const TEXT = "Minha senha do SAP bloqueou de novo, abre um chamado?";
const FIELDS = {
	title: "Senha do SAP bloqueada",
	description: "Senha do SAP bloqueou de novo",
	type: "INC" as const,
	typeConfidence: 90,
	category: "Acesso" as const,
	categoryConfidence: 90,
	affected: "Só eu" as const,
	blocksWork: true,
};
const RESOLVES: Partial<Judgement> = {
	articleSlug: "senha-bloqueada",
	articleFits: true,
	articleResolves: true,
	articleTried: false,
};

const ask = async (judgement: Partial<Judgement>) => {
	const turn: ScriptedTurn = {
		understanding: { intent: "abrir_chamado", confidence: 90, fields: FIELDS },
		judgement,
	};
	const h = await agentHarness({ turns: [turn] });
	const reply = await h.agent.send(h.ana, { text: TEXT });
	return { ...h, reply };
};
const hasArticle = (r: Awaited<ReturnType<typeof ask>>["reply"]) =>
	r.blocks.some((b) => b.kind === "article");

describe("article or ticket when asking for a ticket", () => {
	test("duplicate wins over the article", async () => {
		const open = await ask({
			...RESOLVES,
			sameProblemNumber: "INC-20311",
			sameProblemConfidence: 90,
		});
		expect(open.reply.decision?.action).toBe("rascunho_atualizacao");
		expect(hasArticle(open.reply)).toBe(false);

		const recent = await ask({
			...RESOLVES,
			sameProblemNumber: "INC-20150",
			sameProblemConfidence: 60,
		});
		expect(recent.reply.decision?.action).toBe("rascunho_reabrir");
		expect(hasArticle(recent.reply)).toBe(false);

		const old = await ask({
			...RESOLVES,
			sameProblemNumber: "INC-19877",
			sameProblemConfidence: 90,
		});
		expect(old.reply.decision?.action).toBe("rascunho_chamado");
		expect(hasArticle(old.reply)).toBe(false);
		expect(
			(await old.store.get(old.reply.conversationId))?.pending,
		).toMatchObject({ kind: "ticket_draft", citing: "INC-19877" });
	});

	test("no duplicate decides by the article", async () => {
		const unsure = await ask({
			...RESOLVES,
			sameProblemNumber: "INC-20150",
			sameProblemConfidence: 59,
		});
		expect(unsure.reply.decision?.action).toBe("responder_artigo");

		const notTheirs = await ask({
			...RESOLVES,
			sameProblemNumber: "INC-20305",
			sameProblemConfidence: 95,
		});
		expect(notTheirs.reply.decision?.action).toBe("responder_artigo");
	});

	test("article that resolves answers with a ticket offer", async () => {
		const { reply, store } = await ask(RESOLVES);
		expect(reply.decision?.action).toBe("responder_artigo");
		expect(reply.blocks).toContainEqual(
			expect.objectContaining({ kind: "article", slug: "senha-bloqueada" }),
		);
		expect(reply.blocks).toContainEqual(
			expect.objectContaining({
				kind: "options",
				options: [...COPY.offerOptions],
			}),
		);
		expect((await store.get(reply.conversationId))?.pending).toMatchObject({
			kind: "offer_ticket",
		});
	});

	test("article that does not resolve goes to the draft", async () => {
		for (const judgement of [
			{ ...RESOLVES, articleResolves: false },
			{ articleSlug: "senha-bloqueada", articleFits: true },
		]) {
			const { reply } = await ask(judgement);
			expect(reply.decision?.action).toBe("rascunho_chamado");
			expect(hasArticle(reply)).toBe(false);
			expect(said(reply.blocks)).not.toContain("não serve no seu caso");
		}
	});

	test("article already tried goes to the draft", async () => {
		const { reply } = await ask({ ...RESOLVES, articleTried: true });
		expect(reply.decision?.action).toBe("rascunho_chamado");
		expect(hasArticle(reply)).toBe(false);
		expect(said(reply.blocks)).not.toContain("não serve no seu caso");
	});

	test("article that resolves but does not fit says why", async () => {
		const { reply } = await ask({ ...RESOLVES, articleFits: false });
		expect(reply.decision?.action).toBe("rascunho_chamado");
		expect(hasArticle(reply)).toBe(false);
		const text = said(reply.blocks);
		expect(text).toContain("“Senha bloqueada");
		expect(text).toContain("não serve no seu caso");
		expect(text).toContain("outros sistemas pedem chamado de Acesso");
	});

	test("decision record shows the article signals", async () => {
		const comparar = async (judgement: Partial<Judgement>) =>
			(await ask(judgement)).reply.decision?.tools.find(
				(t) => t.name === "modelo.comparar",
			)?.result;
		expect(await comparar({ ...RESOLVES, articleResolves: false })).toContain(
			"artigo: senha-bloqueada (não resolve)",
		);
		expect(await comparar({ ...RESOLVES, articleTried: true })).toContain(
			"artigo: senha-bloqueada (já tentou)",
		);
		expect(await comparar(RESOLVES)).toBe(
			"artigo: senha-bloqueada; mesmo problema: nenhum",
		);
	});
});
