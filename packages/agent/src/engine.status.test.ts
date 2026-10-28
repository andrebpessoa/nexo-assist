import { describe, expect, test } from "bun:test";

import { COPY, slaLabel } from "./copy";
import { agentHarness, said, toolNames } from "./testing";

const consult = (extra: Record<string, unknown> = {}) => ({
	understanding: {
		intent: "consultar_chamado" as const,
		confidence: 90,
		...extra,
	},
});

describe("ticket status", () => {
	test("many open tickets list", async () => {
		const { agent, ana } = await agentHarness({ turns: [consult()] });
		const turn = await agent.send(ana, { text: "Como está o meu chamado?" });
		const list = turn.blocks.find((b) => b.kind === "ticket_list");
		expect(list).toMatchObject({ question: COPY.whichOne });
		const numbers =
			list?.kind === "ticket_list"
				? list.tickets.map((t) => t.number).sort()
				: [];
		expect(numbers).toEqual(["INC-20298", "INC-20311", "REQ-10442"]);
		for (const t of list?.kind === "ticket_list" ? list.tickets : [])
			expect(t).toMatchObject({
				title: expect.any(String),
				status: expect.any(String),
				openedAt: expect.any(String),
			});
	});

	test("one open ticket", async () => {
		const { agent, ids } = await agentHarness({ turns: [consult()] });
		const turn = await agent.send(ids.bruno as string, {
			text: "E o meu chamado?",
		});
		expect(turn.blocks[0]).toMatchObject({
			kind: "ticket_card",
			ticket: { number: "INC-20305" },
		});
		expect(turn.blocks.some((b) => b.kind === "ticket_list")).toBe(false);
	});

	test("no open ticket", async () => {
		const { agent, ids } = await agentHarness({ turns: [consult()] });
		const turn = await agent.send(ids.elisa as string, {
			text: "Tenho chamado aberto?",
		});
		expect(said(turn.blocks)).toBe(COPY.noOpen);
		expect(turn.blocks).toContainEqual(
			expect.objectContaining({
				kind: "options",
				options: [...COPY.offerOptions],
			}),
		);
	});

	test("ticket card", async () => {
		const { agent, ana } = await agentHarness({ turns: [consult()] });
		await agent.send(ana, { text: "Como está o meu chamado?" });
		const turn = await agent.send(ana, {
			action: "select",
			number: "INC-20298",
		});
		expect(turn.blocks[0]).toMatchObject({
			kind: "ticket_card",
			ticket: {
				number: "INC-20298",
				status: "Em andamento",
				category: expect.any(String),
				priority: "Alta",
				openedAt: expect.any(String),
				updatedAt: expect.any(String),
			},
		});
		expect(turn.decision?.action).toBe("mostrar_chamado");
	});

	test("overdue offer", async () => {
		const { agent, ana, store } = await agentHarness({
			turns: [consult({ ticketNumber: "INC-20311" })],
		});
		const turn = await agent.send(ana, { text: "E o INC-20311?" });
		const text = said(turn.blocks);
		expect(text).toContain("sem atualização há 6 dias");
		expect(text).toContain(`prioridade Média era de ${slaLabel("Média")}`);
		expect(turn.blocks).toContainEqual(
			expect.objectContaining({
				kind: "options",
				options: [...COPY.overdueOptions],
			}),
		);
		expect((await store.get(turn.conversationId))?.pending).toEqual({
			kind: "transfer_offer",
			number: "INC-20311",
		});
	});

	test("not found among yours", async () => {
		const { agent, ana } = await agentHarness({
			turns: [
				consult({ ticketNumber: "INC-20305" }),
				consult({ ticketNumber: "INC-99999" }),
			],
		});
		const others = await agent.send(ana, { text: "E o INC-20305?" });
		const missing = await agent.send(ana, { text: "E o INC-99999?" });
		expect(others.blocks).toEqual([{ kind: "text", text: COPY.notFound }]);
		expect(missing.blocks).toEqual(others.blocks);
	});

	test("other person's tickets", async () => {
		const { agent, ana } = await agentHarness({
			turns: [consult({ aboutOtherPerson: true })],
		});
		const turn = await agent.send(ana, { text: "Mostra os chamados do Bruno" });
		expect(said(turn.blocks)).toBe(COPY.ownTicketsOnly);
		expect(toolNames(turn.decision)).toEqual(["modelo.entender"]);
	});
});
