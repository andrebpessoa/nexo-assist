import { describe, expect, test } from "bun:test";

import { COPY } from "./copy";
import { agentHarness, said, toolNames } from "./testing";
import type { ScriptedTurn } from "./understand-scripted";

const FULL = {
	title: "Notebook não liga",
	description: "Meu notebook não liga desde hoje cedo",
	type: "INC" as const,
	typeConfidence: 90,
	category: "Hardware" as const,
	categoryConfidence: 90,
	affected: "Só eu" as const,
	blocksWork: true,
};

const open = (
	fields: Partial<typeof FULL> | Record<string, unknown> = FULL,
	judgement: ScriptedTurn["judgement"] = {},
): ScriptedTurn => ({
	understanding: { intent: "abrir_chamado", confidence: 90, fields },
	judgement,
});

async function drafted(turns: ScriptedTurn[] = [open()]) {
	const h = await agentHarness({ turns });
	const actor = { kind: "employee" as const, userId: h.ana };
	const count = async () => {
		const r = await h.service.list(actor);
		return r.ok ? r.value.length : -1;
	};
	const before = await count();
	const draft = await h.agent.send(h.ana, { text: FULL.description });
	return { ...h, actor, count, before, draft };
}

describe("open a ticket", () => {
	test("checks tickets before draft", async () => {
		const { draft } = await drafted();
		expect(draft.decision?.action).toBe("rascunho_chamado");
		const names = toolNames(draft.decision);
		expect(names).toContain("chamados.listar");
		expect(names).not.toContain("chamados.criar");
	});

	test("open duplicate", async () => {
		const { draft, store } = await drafted([
			open(FULL, { sameProblemNumber: "INC-20311", sameProblemConfidence: 85 }),
		]);
		expect(said(draft.blocks)).toContain("Você já tem o INC-20311 aberto");
		expect(draft.blocks).toContainEqual(
			expect.objectContaining({ kind: "update_draft", number: "INC-20311" }),
		);
		expect((await store.get(draft.conversationId))?.pending).toMatchObject({
			kind: "update_draft",
			number: "INC-20311",
		});
	});

	test("recent resolved", async () => {
		const { draft } = await drafted([
			open(FULL, { sameProblemNumber: "INC-20150", sameProblemConfidence: 80 }),
		]);
		expect(draft.decision?.action).toBe("rascunho_reabrir");
		expect(draft.blocks).toContainEqual(
			expect.objectContaining({ kind: "reopen_draft", number: "INC-20150" }),
		);
	});

	test("old resolved", async () => {
		const { draft } = await drafted([
			open(FULL, { sameProblemNumber: "INC-19877", sameProblemConfidence: 80 }),
		]);
		const card = draft.blocks.find((b) => b.kind === "ticket_draft");
		expect(card?.kind === "ticket_draft" && card.draft.description).toContain(
			"Relacionado ao chamado INC-19877",
		);
	});

	test("infers type and category", async () => {
		const sure = await drafted();
		const card = sure.draft.blocks.find((b) => b.kind === "ticket_draft");
		expect(card).toMatchObject({
			draft: { type: "INC", category: "Hardware" },
		});

		const unsure = await drafted([open({ ...FULL, typeConfidence: 40 })]);
		expect(unsure.draft.blocks).toContainEqual(
			expect.objectContaining({ kind: "options", question: COPY.typeQuestion }),
		);
	});

	test("asks affected", async () => {
		const { draft } = await drafted([open({ ...FULL, affected: null })]);
		expect(said(draft.blocks)).toBe(COPY.affectedQuestion);
		expect(draft.blocks).toContainEqual({
			kind: "options",
			question: COPY.affectedQuestion,
			options: ["Só eu", "Minha equipe", "Toda a empresa", "Não sei"],
		});
	});

	test("draft fields", async () => {
		const { draft } = await drafted();
		const card = draft.blocks.find((b) => b.kind === "ticket_draft");
		expect(card).toMatchObject({
			status: "Aguardando confirmação",
			draft: {
				title: FULL.title,
				description: FULL.description,
				type: "INC",
				category: "Hardware",
				priority: "Alta",
				affected: "Só eu",
				deadlineAt: expect.any(String),
			},
		});
		const reason =
			card?.kind === "ticket_draft" ? card.draft.priorityReason : "";
		expect(reason.length).toBeGreaterThan(0);
		expect(said(draft.blocks)).toContain(reason);
	});

	test("nothing before confirm", async () => {
		const { count, before } = await drafted();
		expect(await count()).toBe(before);
	});

	test("confirm once", async () => {
		const { agent, ana, count, before } = await drafted();
		const done = await agent.send(ana, { action: "confirm" });
		expect(done.decision?.action).toBe("criar_chamado");
		expect(said(done.blocks)).toMatch(
			/Pronto: abri o chamado INC-\d+ com prioridade Alta\. Prazo de resposta: até \d{2}\/\d{2} às \d{2}:\d{2}\./,
		);
		const again = await agent.send(ana, { action: "confirm" });
		expect(toolNames(again.decision)).not.toContain("chamados.criar");
		expect(await count()).toBe(before + 1);
	});

	test("edit recalculates", async () => {
		const { agent, ana } = await drafted();
		const opened = await agent.send(ana, { action: "edit" });
		expect(opened.blocks).toContainEqual(
			expect.objectContaining({ editable: true }),
		);
		const wider = await agent.send(ana, {
			action: "edit",
			edits: { affected: "Minha equipe" },
		});
		expect(wider.blocks).toContainEqual(
			expect.objectContaining({
				draft: expect.objectContaining({ priority: "Crítica" }),
			}),
		);
		const renamed = await agent.send(ana, {
			action: "edit",
			edits: { title: "Notebook morto" },
		});
		expect(renamed.blocks).toContainEqual(
			expect.objectContaining({
				draft: expect.objectContaining({
					priority: "Crítica",
					title: "Notebook morto",
				}),
			}),
		);
	});

	test("cancel", async () => {
		const { agent, ana, store, count, before } = await drafted();
		const turn = await agent.send(ana, { action: "cancel" });
		expect(said(turn.blocks)).toBe(COPY.cancelled);
		expect(turn.blocks).toContainEqual(
			expect.objectContaining({ status: "Cancelado" }),
		);
		expect((await store.get(turn.conversationId))?.pending).toBeNull();
		expect(await count()).toBe(before);
	});

	test("text confirmation", async () => {
		const { agent, ana, understander, count, before } = await drafted();
		const turn = await agent.send(ana, { text: "pode criar" });
		expect(turn.decision?.action).toBe("criar_chamado");
		expect(understander.calls.understand).toBe(1);
		expect(await count()).toBe(before + 1);
	});

	test("workaround counts as not blocking", async () => {
		const excel = {
			title: "Excel trava com planilhas grandes",
			description: "O Excel trava ao abrir planilhas grandes",
			type: "INC" as const,
			typeConfidence: 90,
			category: "Software" as const,
			categoryConfidence: 90,
			affected: "Só eu" as const,
			workaround: true,
			blocksWork: null,
		};
		const { draft } = await drafted([open(excel)]);
		expect(draft.decision?.action).toBe("rascunho_chamado");
		expect(said(draft.blocks)).not.toContain(COPY.blocksQuestion);
		expect(draft.blocks).toContainEqual(
			expect.objectContaining({
				kind: "ticket_draft",
				draft: expect.objectContaining({
					priority: "Média",
					blocksWork: false,
					workaround: true,
				}),
			}),
		);

		const unsaid = await drafted([open({ ...excel, workaround: false })]);
		expect(unsaid.draft.decision?.action).toBe("perguntar");
		expect(said(unsaid.draft.blocks)).toContain(COPY.blocksQuestion);

		// What the person said about blocking wins over the alternative, in the same turn or earlier.
		const blocking = expect.objectContaining({
			kind: "ticket_draft",
			draft: expect.objectContaining({ priority: "Alta", blocksWork: true }),
		});
		const sameTurn = await drafted([open({ ...excel, blocksWork: true })]);
		expect(sameTurn.draft.blocks).toContainEqual(blocking);

		const earlier = await drafted([
			open({
				...excel,
				affected: undefined,
				workaround: null,
				blocksWork: true,
			}),
			{
				understanding: {
					intent: "abrir_chamado",
					confidence: 90,
					fields: { affected: "Só eu", workaround: true, blocksWork: null },
				},
			},
		]);
		expect(earlier.draft.decision?.action).toBe("perguntar");
		const answered = await earlier.agent.send(earlier.ana, {
			text: "Só comigo, e uso o Excel online enquanto isso.",
		});
		expect(answered.blocks).toContainEqual(blocking);
	});
});
