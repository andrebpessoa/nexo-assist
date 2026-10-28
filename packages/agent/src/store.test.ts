import { describe, expect, test } from "bun:test";

import { createConversationStore } from "./store";
import { seededDb } from "./testing";
import type { Pending } from "./types";

describe("conversation store", () => {
	test("conversation survives a new agent", async () => {
		const { db, ids } = await seededDb();
		const first = createConversationStore({ db });
		const conv = await first.open(ids.ana as string);
		await first.append(conv.id, {
			role: "employee",
			text: "Minha VPN não conecta. Erro 809.",
			blocks: [{ kind: "text", text: "Minha VPN não conecta. Erro 809." }],
			decision: null,
		});
		const pending: Pending = { kind: "transfer_offer", number: "INC-20311" };
		await first.append(conv.id, {
			role: "agent",
			text: "Quer que eu chame um analista?",
			blocks: [{ kind: "text", text: "Quer que eu chame um analista?" }],
			decision: {
				intent: "consultar_chamado",
				confidence: 92,
				extracted: { ticketNumber: "INC-20311" },
				action: "mostrar_chamado",
				rule: "consulta",
				reason: "pediu status",
				tools: [{ name: "list", ok: true, attempts: 1 }],
			},
		});
		await first.update(conv.id, { pending, summary: "VPN" });

		const restarted = createConversationStore({ db });
		const again = await restarted.open(ids.ana as string);
		expect(again.id).toBe(conv.id);
		expect(again.pending).toEqual(pending);
		expect(again.summary).toBe("VPN");
		const messages = await restarted.messages(conv.id);
		expect(messages.map((m) => [m.seq, m.role])).toEqual([
			[1, "employee"],
			[2, "agent"],
		]);
		expect(messages[1]?.decision?.tools).toEqual([
			{ name: "list", ok: true, attempts: 1 },
		]);
		const bruno = await restarted.open(ids.bruno as string);
		expect(bruno.id).not.toBe(conv.id);
		expect(await restarted.messages(bruno.id)).toEqual([]);
	});
});

describe("console columns", () => {
	test("claim is conditional: of two analysts only one wins", async () => {
		const { db, ids } = await seededDb();
		const store = createConversationStore({ db });
		const conv = await store.open(ids.ana as string);
		await store.update(conv.id, { state: "aguardando_analista" });
		const from = ["aguardando_analista", "agent"] as const;
		const [a, b] = await Promise.all([
			store.claim(conv.id, from, {
				state: "com_analista",
				assigneeId: ids.rafael as string,
			}),
			store.claim(conv.id, from, {
				state: "com_analista",
				assigneeId: ids.marina as string,
			}),
		]);
		expect([a, b].filter(Boolean)).toHaveLength(1);
		const after = await store.get(conv.id);
		expect(after?.state).toBe("com_analista");
		expect([ids.rafael, ids.marina]).toContain(after?.assigneeId as string);
	});

	test("state, assignee and read mark survive a new store", async () => {
		const { db, ids } = await seededDb();
		const first = createConversationStore({ db });
		const conv = await first.open(ids.ana as string);
		await first.append(conv.id, {
			role: "employee",
			text: "Oi",
			blocks: [{ kind: "text", text: "Oi" }],
			decision: null,
		});
		expect(
			await first.claim(conv.id, ["agent"], {
				state: "com_analista",
				assigneeId: ids.rafael as string,
			}),
		).toBe(true);
		await first.markRead(conv.id, 1);

		const restarted = createConversationStore({ db });
		const again = await restarted.get(conv.id);
		expect(again).toMatchObject({
			state: "com_analista",
			assigneeId: ids.rafael,
			readSeq: 1,
		});
		const all = await restarted.listAll();
		const row = all.find((r) => r.conversation.id === conv.id);
		expect(row?.employee).toEqual({
			name: "Ana Souza",
			department: "Financeiro",
		});
		expect(row?.messages.map((m) => m.text)).toEqual(["Oi"]);
	});
});
