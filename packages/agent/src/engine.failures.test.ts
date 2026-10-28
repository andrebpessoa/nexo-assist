import { describe, expect, test } from "bun:test";
import type { TicketService } from "@nexo-assist/tickets";

import { COPY } from "./copy";
import { agentHarness, type HarnessOptions, said } from "./testing";
import type { ScriptedTurn } from "./understand-scripted";

const OPEN: ScriptedTurn = {
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
};

async function drafted(options: HarnessOptions = {}) {
	const h = await agentHarness({ turns: [OPEN], ...options });
	const actor = { kind: "employee" as const, userId: h.ana };
	const count = async () => {
		const r = await h.service.list(actor);
		return r.ok ? r.value.length : -1;
	};
	const before = await count();
	const draft = await h.agent.send(h.ana, {
		text: "Meu notebook não liga desde hoje cedo",
	});
	const pending = async () =>
		(await h.store.get(draft.conversationId))?.pending;
	return { ...h, count, before, draft, pending };
}

const providerLimit = () =>
	Object.assign(new Error("wrapped"), {
		cause: { statusCode: 429, responseHeaders: {} },
	});

describe("failures", () => {
	test("failure keeps draft", async () => {
		// The ticket service is down for the whole retry budget.
		let down = true;
		const keys: string[] = [];
		const h = await drafted({
			wrap: (s: TicketService): TicketService => ({
				...s,
				create: async (actor, input, key) => {
					keys.push(key);
					return down
						? {
								ok: false,
								error: {
									code: "SERVICE_UNAVAILABLE",
									message: "O sistema de chamados está fora do ar.",
								},
							}
						: s.create(actor, input, key);
				},
			}),
		});
		const kept = await h.pending();
		const failed = await h.agent.send(h.ana, { action: "confirm" });
		expect(said(failed.blocks)).toContain("Não consegui criar o chamado agora");
		expect(failed.blocks).toContainEqual(
			expect.objectContaining({ kind: "options", options: [COPY.retryOption] }),
		);
		expect(h.sleeps).toEqual([500, 1000, 2000]);
		expect(await h.pending()).toEqual(kept);
		expect(await h.count()).toBe(h.before);

		down = false;
		const done = await h.agent.send(h.ana, { action: "retry" });
		expect(done.decision?.action).toBe("criar_chamado");
		expect(new Set(keys).size).toBe(1);
		expect(await h.count()).toBe(h.before + 1);

		// The model fails on a new message: the message and the draft stay, and retrying re-reads it.
		const m = await drafted();
		const draftKept = await m.pending();
		const lost = await m.agent.send(m.ana, {
			text: "Esqueci de dizer: a tela pisca antes",
		});
		expect(said(lost.blocks)).toBe(COPY.modelFailed);
		expect(await m.pending()).toEqual(draftKept);
		const texts = (await m.store.messages(lost.conversationId)).map(
			(x) => x.text,
		);
		expect(texts).toContain("Esqueci de dizer: a tela pisca antes");
		m.understander.push({ understanding: { intent: "outro", confidence: 90 } });
		const reread = await m.agent.send(m.ana, { action: "retry" });
		expect(reread.decision?.action).not.toBe("criar_chamado");
		expect(m.understander.calls.understand).toBe(3);
		expect(await m.count()).toBe(m.before);

		// The model passes 30 s.
		const t = await agentHarness({ timer: async () => {} });
		t.understander.understand = () => new Promise(() => {});
		const slow = await t.agent.send(t.ana, { text: "Minha VPN caiu" });
		expect(slow.decision?.reason).toBe("timeout");
		expect(said(slow.blocks)).toBe(COPY.modelFailed);
	});

	test("rate limited", async () => {
		const h = await drafted();
		const kept = await h.pending();
		let calls = 0;
		h.understander.understand = async () => {
			calls++;
			throw providerLimit();
		};
		const turn = await h.agent.send(h.ana, { text: "na verdade é para hoje" });
		expect(said(turn.blocks)).toBe(COPY.rateLimited);
		expect(turn.decision?.reason).toBe("rate_limited");
		expect(calls).toBe(2);
		expect(h.sleeps).toEqual([2000]);
		expect(await h.pending()).toEqual(kept);
		expect(await h.count()).toBe(h.before);
	});
});
