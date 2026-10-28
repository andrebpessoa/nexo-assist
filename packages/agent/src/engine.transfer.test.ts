import { describe, expect, test } from "bun:test";

import { agentHarness, said, toolNames } from "./testing";
import type { Block } from "./types";
import type { UnderstandInput } from "./understand";

const transferOf = (blocks: Block[]) =>
	blocks.find((b) => b.kind === "transfer");

const CRITICAL = {
	title: "Sistema de faturamento fora",
	description: "O faturamento parou para toda a equipe",
	type: "INC" as const,
	typeConfidence: 95,
	category: "Software" as const,
	categoryConfidence: 90,
	affected: "Minha equipe" as const,
	blocksWork: true,
};

describe("transfer to an analyst", () => {
	test("asks for analyst", async () => {
		const { agent, ana, store } = await agentHarness({
			turns: [
				{
					understanding: {
						intent: "falar_com_analista",
						confidence: 95,
						wantsAnalyst: true,
					},
				},
			],
		});
		const turn = await agent.send(ana, { text: "Quero falar com uma pessoa" });
		expect(turn.decision?.action).toBe("transferir");
		expect(transferOf(turn.blocks)).toMatchObject({ team: "Suporte N1" });
		expect(toolNames(turn.decision)).not.toContain("central.buscar");
		expect((await store.get(turn.conversationId))?.state).toBe(
			"aguardando_analista",
		);
	});

	test("critical creates and transfers", async () => {
		const { agent, ana, service } = await agentHarness({
			turns: [
				{
					understanding: {
						intent: "abrir_chamado",
						confidence: 92,
						fields: CRITICAL,
					},
				},
			],
		});
		const draft = await agent.send(ana, { text: CRITICAL.description });
		expect(draft.blocks).toContainEqual(
			expect.objectContaining({
				draft: expect.objectContaining({ priority: "Crítica" }),
			}),
		);
		const done = await agent.send(ana, { action: "confirm" });
		expect(done.decision?.rule).toBe("Anexo A: Crítica - criar e transferir");
		expect(said(done.blocks)).toMatch(
			/Pronto: abri o chamado (INC-\d+) com prioridade Crítica/,
		);
		expect(transferOf(done.blocks)).toMatchObject({ team: "Suporte N2" });
		const number = /INC-\d+/.exec(said(done.blocks))?.[0] as string;
		const ticket = await service.get({ kind: "employee", userId: ana }, number);
		expect(ticket.ok && ticket.value.events.map((e) => e.kind)).toContain(
			"transferido",
		);
	});

	test("overdue accepted", async () => {
		const { agent, ana } = await agentHarness({
			turns: [
				{
					understanding: {
						intent: "consultar_chamado",
						confidence: 90,
						ticketNumber: "INC-20311",
					},
				},
			],
		});
		await agent.send(ana, { text: "E o INC-20311?" });
		const turn = await agent.send(ana, {
			action: "option",
			value: "Falar com um analista",
		});
		expect(turn.decision?.action).toBe("transferir");
		expect(transferOf(turn.blocks)).toMatchObject({ team: "Suporte N2" });
	});

	test("low confidence", async () => {
		const { agent, ana } = await agentHarness({
			turns: [
				{
					understanding: {
						intent: "abrir_chamado",
						confidence: 45,
						fields: CRITICAL,
					},
				},
			],
		});
		const turn = await agent.send(ana, {
			text: "acho que tá tudo meio estranho",
		});
		expect(turn.decision?.action).toBe("transferir");
		expect(turn.decision?.reason).toBe("Agent pediu ajuda · confiança 45%");
		expect(turn.blocks.some((b) => b.kind === "ticket_draft")).toBe(false);
		expect(toolNames(turn.decision)).not.toContain("chamados.criar");
	});

	test("transfer summary", async () => {
		const { agent, ana, service } = await agentHarness({
			turns: [
				{
					understanding: {
						intent: "consultar_chamado",
						confidence: 90,
						ticketNumber: "INC-20311",
					},
				},
				{
					understanding: {
						intent: "falar_com_analista",
						confidence: 93,
						wantsAnalyst: true,
						ticketNumber: "INC-20311",
					},
				},
			],
		});
		await agent.send(ana, {
			text: "Meu notebook continua lento depois da atualização, e o INC-20311?",
		});
		const turn = await agent.send(ana, { text: "Quero um analista" });
		const summary = (transferOf(turn.blocks) as { summary: string }).summary;
		expect(summary).toContain("Problema: Meu notebook continua lento");
		expect(summary).toContain("Já tentado: consulta do chamado");
		expect(summary).toContain("Chamado: INC-20311");
		expect(summary).toContain("Prioridade: Média");
		expect(summary).toContain(
			"Motivo: Prazo vencido; funcionário aceitou falar com um analista",
		);
		expect(said(turn.blocks)).toMatch(
			/Chamei um analista do Suporte N2\. Ele fala com você até \d{2}:\d{2}\./,
		);
		const ticket = await service.get(
			{ kind: "employee", userId: ana },
			"INC-20311",
		);
		expect(ticket.ok && ticket.value.events.at(-1)).toMatchObject({
			kind: "transferido",
			summary,
		});
	});

	test("silent while with analyst", async () => {
		const { agent, ana, understander, store } = await agentHarness({
			turns: [
				{
					understanding: {
						intent: "falar_com_analista",
						confidence: 95,
						wantsAnalyst: true,
					},
				},
			],
		});
		const first = await agent.send(ana, { text: "Quero um analista" });
		const waiting = await agent.send(ana, { text: "Alô?" });
		await agent.assume(first.conversationId);
		const withAnalyst = await agent.send(ana, { text: "Oi, analista" });
		for (const t of [waiting, withAnalyst])
			expect(t).toMatchObject({ silent: true, blocks: [], decision: null });
		expect(understander.calls.understand).toBe(1);
		const texts = (await store.messages(first.conversationId)).map(
			(m) => m.text,
		);
		expect(texts).toContain("Oi, analista");
	});

	test("returned to agent", async () => {
		const { agent, ana, understander } = await agentHarness({
			turns: [
				{
					understanding: {
						intent: "falar_com_analista",
						confidence: 95,
						wantsAnalyst: true,
					},
				},
				{ understanding: { intent: "outro", confidence: 90 } },
			],
		});
		const inputs: UnderstandInput[] = [];
		const original = understander.understand.bind(understander);
		understander.understand = (input) => {
			inputs.push(input);
			return original(input);
		};
		const first = await agent.send(ana, { text: "Quero um analista" });
		await agent.assume(first.conversationId);
		await agent.analystSays(
			first.conversationId,
			"Reiniciei o seu acesso à VPN.",
		);
		await agent.returnToAgent(first.conversationId);
		const back = await agent.send(ana, { text: "Funcionou, obrigado" });
		expect(back.silent).toBe(false);
		expect(inputs.at(-1)?.window.messages).toContainEqual({
			role: "analyst",
			text: "Reiniciei o seu acesso à VPN.",
		});
	});
});
