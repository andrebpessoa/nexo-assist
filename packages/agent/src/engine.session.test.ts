import { describe, expect, test } from "bun:test";

import { agentHarness, said, toolNames } from "./testing";

describe("session in the engine", () => {
	test("analyst at the limit transfers without the model", async () => {
		const { agent, ana, understander } = await agentHarness();
		const turn = await agent.send(ana, { action: "analyst" });
		expect(understander.calls.understand).toBe(0);
		expect(turn.decision?.action).toBe("transferir");
		expect(turn.decision?.transfer?.trigger).toBe("pedido");
		expect(toolNames(turn.decision)).toEqual([]);
		expect(turn.blocks.some((b) => b.kind === "transfer")).toBe(true);
		const { conversation } = await agent.history(ana);
		expect(conversation.state).toBe("aguardando_analista");
	});

	test("close opens a new conversation", async () => {
		const { agent, ana } = await agentHarness({
			turns: [{ understanding: { intent: "outro", confidence: 90 } }],
		});
		await agent.send(ana, { text: "oi" });
		const first = await agent.history(ana);
		await agent.close(first.conversation.id);
		const closed = await agent.history(ana);
		expect(closed.conversation.id).not.toBe(first.conversation.id);
		expect(closed.conversation.state).toBe("agent");
		expect(closed.messages).toEqual([]);
	});

	test("close leaves a system line in the old conversation", async () => {
		const { agent, ana, store } = await agentHarness();
		const { conversation } = await agent.history(ana);
		await agent.close(conversation.id);
		const old = await store.messages(conversation.id);
		expect(old.at(-1)?.role).toBe("system");
		expect(said(old.at(-1)?.blocks ?? [])).toBe("Atendimento encerrado");
		expect((await store.get(conversation.id))?.state).toBe("encerrada");
	});

	test("created draft carries the ticket number", async () => {
		const { agent, ana } = await agentHarness({
			turns: [
				{
					understanding: {
						intent: "abrir_chamado",
						confidence: 90,
						fields: {
							title: "Notebook não liga",
							description: "Meu notebook não liga desde hoje cedo",
							type: "INC",
							typeConfidence: 90,
							category: "Hardware",
							categoryConfidence: 90,
							affected: "Só eu",
							blocksWork: true,
						},
					},
				},
			],
		});
		await agent.send(ana, { text: "Meu notebook não liga desde hoje cedo" });
		const done = await agent.send(ana, { action: "confirm" });
		const card = done.blocks.find((b) => b.kind === "ticket_draft");
		expect(card?.kind === "ticket_draft" && card.status).toBe("Criado");
		expect(card?.kind === "ticket_draft" && card.number).toMatch(/^INC-\d+$/);
	});
});
