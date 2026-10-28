import { describe, expect, test } from "bun:test";

import { agentHarness, said } from "./testing";

async function updateDrafted() {
	const h = await agentHarness({
		turns: [
			{ understanding: { intent: "complementar_chamado", confidence: 88 } },
			{
				understanding: {
					intent: "complementar_chamado",
					confidence: 88,
					noteText: "Agora o SharePoint dá erro 403.",
				},
			},
		],
	});
	const list = await h.agent.send(h.ana, {
		text: "Quero acrescentar uma informação",
	});
	const asked = await h.agent.send(h.ana, {
		action: "select",
		number: "INC-20298",
	});
	const draft = await h.agent.send(h.ana, {
		text: "Agora o SharePoint dá erro 403.",
	});
	return { ...h, list, asked, draft };
}

describe("update a ticket", () => {
	test("update draft", async () => {
		const { list, asked, draft, store } = await updateDrafted();
		expect(list.blocks[0]).toMatchObject({ kind: "ticket_list" });
		expect(said(asked.blocks)).toBe(
			"O que você quer acrescentar ao INC-20298?",
		);
		expect(draft.blocks).toContainEqual({
			kind: "update_draft",
			number: "INC-20298",
			note: "Agora o SharePoint dá erro 403.",
			status: "Aguardando confirmação",
		});
		expect((await store.get(draft.conversationId))?.pending).toMatchObject({
			kind: "update_draft",
			number: "INC-20298",
		});
	});

	test("update confirmed", async () => {
		const { agent, ana, service } = await updateDrafted();
		const actor = { kind: "employee" as const, userId: ana };
		const before = await service.get(actor, "INC-20298");
		const done = await agent.send(ana, { action: "confirm" });
		expect(said(done.blocks)).toBe("Anexei a informação ao INC-20298.");
		expect(done.decision?.action).toBe("complementar_chamado");
		const after = await service.get(actor, "INC-20298");
		if (!before.ok || !after.ok) throw new Error("seed changed");
		expect(after.value.notes).toHaveLength(before.value.notes.length + 1);
		expect(after.value.notes.map((n) => n.body)).toContain(
			"Agora o SharePoint dá erro 403.",
		);
	});
});
