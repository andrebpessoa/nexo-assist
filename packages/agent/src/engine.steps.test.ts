import { describe, expect, test } from "bun:test";
import type { TicketService } from "@nexo-assist/tickets";

import { createConversationStore } from "./store";
import { agentHarness, type HarnessOptions } from "./testing";
import {
	createScriptedUnderstander,
	type ScriptedTurn,
} from "./understand-scripted";

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
const MESSAGE = "Meu notebook não liga desde hoje cedo";

const down = (s: TicketService): TicketService => ({
	...s,
	list: async () => ({
		ok: false,
		error: { code: "SERVICE_UNAVAILABLE", message: "fora do ar" },
	}),
});

async function open(options: HarnessOptions = {}) {
	const h = await agentHarness({ turns: [OPEN], ...options });
	const turn = await h.agent.send(h.ana, { text: MESSAGE });
	return { ...h, turn };
}

describe("decision steps", () => {
	test("step details", async () => {
		const { turn } = await open();
		const steps = turn.decision?.tools ?? [];
		expect(steps.map((s) => s.name)).toEqual([
			"modelo.entender",
			"central.buscar",
			"chamados.listar",
			"modelo.comparar",
			"regra.prioridade",
			"regra.sla",
			"rascunho.montar",
		]);
		for (const s of steps) {
			expect(s.ok).toBe(true);
			expect(s.attempts).toBe(1);
			expect(s.durationMs).toBeGreaterThanOrEqual(0);
			expect(s.result).toBeString();
		}
		const byName = Object.fromEntries(steps.map((s) => [s.name, s]));
		expect(byName["central.buscar"]?.request).toBe(MESSAGE);
		const draft = turn.blocks.find((b) => b.kind === "ticket_draft");
		expect(byName["regra.prioridade"]?.result).toBe(
			draft?.kind === "ticket_draft" ? draft.draft.priority : "",
		);
		expect(byName["modelo.entender"]?.result).toBe("abrir_chamado · 90%");

		// A step that failed after its retries keeps the attempts and the error.
		const failed = await open({ wrap: down });
		const listed = failed.turn.decision?.tools.find(
			(s) => s.name === "chamados.listar",
		);
		expect(listed).toMatchObject({
			ok: false,
			attempts: 4,
			error: "SERVICE_UNAVAILABLE",
		});
	});

	test("progress events", async () => {
		const events: { name: string; phase: string; ok?: boolean }[] = [];
		await open({ onStep: (e) => events.push(e) });
		expect(events.slice(0, 4)).toEqual([
			expect.objectContaining({ name: "modelo.entender", phase: "start" }),
			expect.objectContaining({
				name: "modelo.entender",
				phase: "end",
				ok: true,
			}),
			expect.objectContaining({ name: "central.buscar", phase: "start" }),
			expect.objectContaining({ name: "central.buscar", phase: "end" }),
		]);
		expect(events.filter((e) => e.phase === "start")).toHaveLength(
			events.filter((e) => e.phase === "end").length,
		);
	});

	test("transfer records trigger and summary", async () => {
		const h = await agentHarness({
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
		const turn = await h.agent.send(h.ana, { text: "quero falar com alguém" });
		expect(turn.decision?.transfer?.trigger).toBe("pedido");
		expect(turn.decision?.transfer?.summary).toContain(
			"quero falar com alguém",
		);
		expect(turn.decision?.tools.map((s) => s.name)).toContain(
			"conversa.transferir",
		);

		const low = await agentHarness({
			turns: [{ understanding: { intent: "abrir_chamado", confidence: 40 } }],
		});
		const unsure = await low.agent.send(low.ana, { text: "deu ruim aqui" });
		expect(unsure.decision?.transfer?.trigger).toBe("confianca_baixa");
	});

	test("interrupted reply", async () => {
		const scripted = createScriptedUnderstander([OPEN]);
		const h = await open({
			understander: {
				understand: scripted.understand,
				judge: async () => {
					throw new Error("model down");
				},
			},
		});
		// No article and no tickets would skip the judge; the seed has both for Ana.
		const d = h.turn.decision;
		expect(d?.action).toBe("falha");
		expect(d?.incomplete).toBe(true);
		expect(d?.tools.map((s) => s.name)).toEqual([
			"modelo.entender",
			"central.buscar",
			"chamados.listar",
			"modelo.comparar",
		]);
		expect(d?.tools.at(-1)?.ok).toBe(false);
	});

	test("decision survives restart", async () => {
		const h = await open({ modelId: "google/gemini-2.5-flash-lite" });
		expect(h.turn.decision?.model).toBe("google/gemini-2.5-flash-lite");
		expect(h.turn.decision?.latencyMs).toBeGreaterThanOrEqual(0);
		// A new store over the same database, as after a Worker restart.
		const again = createConversationStore({
			db: h.db,
			clock: { now: () => new Date() },
		});
		const messages = await again.messages(h.turn.conversationId);
		expect(messages.at(-1)?.decision).toEqual(h.turn.decision);
	});

	test("decision log", async () => {
		const lines: string[] = [];
		const h = await open({ log: (line) => lines.push(line) });
		expect(lines).toHaveLength(1);
		const entry = JSON.parse(lines[0] as string);
		expect(entry).toMatchObject({
			event: "agent.decision",
			conversationId: h.turn.conversationId,
			intent: "abrir_chamado",
			confidence: 90,
			action: "rascunho_chamado",
			rule: h.turn.decision?.rule,
		});
		expect(entry.tools.map((t: { name: string }) => t.name)).toContain(
			"chamados.listar",
		);
		expect(lines[0]).not.toContain("notebook");
		expect(lines[0]).not.toContain("Notebook");
	});
});
