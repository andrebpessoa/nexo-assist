import { describe, expect, test } from "bun:test";
import type { TicketService } from "@nexo-assist/tickets";

import { agentHarness } from "./testing";
import {
	actionLine,
	confidenceBand,
	conversationTotals,
	helpLabel,
	panelFor,
	progressLabel,
} from "./transparency";
import type { DecisionRecord } from "./types";
import type { ScriptedTurn } from "./understand-scripted";

const OPEN: ScriptedTurn = {
	understanding: {
		intent: "abrir_chamado",
		confidence: 90,
		fields: {
			title: "VPN não conecta, erro 809",
			description: "A VPN não conecta e preciso apresentar às 14h",
			type: "INC",
			typeConfidence: 90,
			category: "Rede e VPN",
			categoryConfidence: 90,
			affected: "Só eu",
			blocksWork: true,
			sameDayCommitment: true,
		},
	},
};

const base: DecisionRecord = {
	intent: "outro",
	confidence: 100,
	extracted: {},
	action: "responder",
	rule: "Anexo A: saudação",
	reason: "Saudação.",
	tools: [],
};

async function drafted() {
	const h = await agentHarness({ turns: [OPEN] });
	const turn = await h.agent.send(h.ana, {
		text: "A VPN não conecta e preciso apresentar às 14h",
	});
	return turn.decision as DecisionRecord;
}

describe("transparency", () => {
	test("labels only from executed steps", async () => {
		const d = await drafted();
		expect(actionLine(d)).toEqual([
			{ label: "buscou na central de ajuda", ok: true },
			{ label: "consultou seus chamados", ok: true },
			{ label: "classificou a prioridade", ok: true },
			{ label: "consultou o SLA", ok: true },
			{ label: "montou o rascunho", ok: true },
		]);
		// A repeated step shows once; a step outside the catalog never shows.
		const shown = actionLine({
			...base,
			tools: [
				{
					name: "chamados.consultar",
					ok: true,
					attempts: 1,
					target: "INC-20311",
				},
				{ name: "regra.prazo", ok: true, attempts: 1, kind: "rule" },
				{ name: "regra.prazo", ok: true, attempts: 1, kind: "rule" },
				{ name: "algo.novo", ok: true, attempts: 1 },
			],
		});
		expect(shown.map((s) => s.label)).toEqual([
			"consultou o INC-20311",
			"calculou o prazo",
		]);
	});

	test("service down shows failed label", async () => {
		const h = await agentHarness({
			turns: [OPEN],
			wrap: (s: TicketService): TicketService => ({
				...s,
				list: async () => ({
					ok: false,
					error: { code: "SERVICE_UNAVAILABLE", message: "fora" },
				}),
			}),
		});
		const turn = await h.agent.send(h.ana, { text: "VPN não conecta" });
		expect(actionLine(turn.decision as DecisionRecord)).toContainEqual({
			label: "não conseguiu consultar seus chamados",
			ok: false,
		});
		const transferFailed = actionLine({
			...base,
			tools: [{ name: "chamados.transferir", ok: false, attempts: 4 }],
		});
		expect(transferFailed[0]?.label).toBe(
			"não conseguiu transferir para um analista",
		);
	});

	test("progress in gerund", () => {
		expect(progressLabel("chamados.listar")).toBe("consultando seus chamados…");
		expect(progressLabel("chamados.consultar", "INC-20311")).toBe(
			"consultando o INC-20311…",
		);
		expect(progressLabel("modelo.entender")).toBe("entendendo sua mensagem…");
	});

	test("no tools label", () => {
		expect(
			actionLine({
				...base,
				tools: [
					{ name: "modelo.entender", ok: true, attempts: 1, kind: "model" },
				],
			}),
		).toEqual([{ label: "respondeu sem consultar sistemas", ok: true }]);
	});

	test("panel understood", async () => {
		const p = panelFor(await drafted(), "employee");
		expect(p.understood.intent).toBe("Abrir chamado");
		expect(p.understood.data).toContainEqual({
			label: "Problema",
			value: "VPN não conecta, erro 809",
		});
		expect(p.understood.data).toContainEqual({
			label: "Afetados",
			value: "Só eu",
		});
		expect(p.understood.data).toContainEqual({
			label: "Compromisso no mesmo dia",
			value: "Sim",
		});
		expect(p.understood.data.map((x) => x.label)).not.toContain(
			"typeConfidence",
		);
	});

	test("panel did", async () => {
		const d = await drafted();
		const p = panelFor(d, "employee");
		expect(p.did).toEqual({
			action: "Montou o rascunho do chamado",
			rule: d.rule,
		});
	});

	test("confidence band", () => {
		expect(confidenceBand(80)).toBe("alta");
		expect(confidenceBand(79)).toBe("média");
		expect(confidenceBand(60)).toBe("média");
		expect(confidenceBand(59)).toBe("baixa");
		expect(
			panelFor({ ...base, confidence: 72 }, "employee").confidence,
		).toEqual({
			pct: 72,
			band: "média",
		});
	});

	test("why in three sentences", () => {
		const p = panelFor(
			{ ...base, reason: "Um. Dois! Três? Quatro. Cinco." },
			"employee",
		);
		expect(p.why).toBe("Um. Dois! Três?");
	});

	test("panel steps", async () => {
		const p = panelFor(await drafted(), "employee");
		const search = p.steps.find((s) => s.tool === "central.buscar");
		expect(search).toMatchObject({
			label: "buscou na central de ajuda",
			request: "A VPN não conecta e preciso apresentar às 14h",
			attempts: 1,
			ok: true,
		});
		expect(search?.durationMs).toBeNumber();
	});

	test("transfer panel", async () => {
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
		const turn = await h.agent.send(h.ana, { text: "quero um analista" });
		const p = panelFor(turn.decision as DecisionRecord, "employee");
		expect(p.transfer).toEqual({
			trigger: "Pedido do funcionário",
			summary: turn.decision?.transfer?.summary ?? "",
		});
		expect(panelFor(base, "employee").transfer).toBeUndefined();
	});

	test("employee panel", async () => {
		// Another employee's ticket: the panel shows what the service said to Ana, nothing more.
		const h = await agentHarness({
			turns: [
				{
					understanding: {
						intent: "consultar_chamado",
						confidence: 90,
						ticketNumber: "INC-20305",
					},
				},
			],
		});
		const turn = await h.agent.send(h.ana, { text: "E o INC-20305?" });
		const p = panelFor(
			{
				...(turn.decision as DecisionRecord),
				model: "m",
				usage: { inputTokens: 9, outputTokens: 9, costUsd: 1 },
			},
			"employee",
		);
		const json = JSON.stringify(p);
		expect(json).not.toContain("VPN com erro 809");
		expect(p.steps.find((s) => s.tool === "chamados.consultar")?.error).toBe(
			"NOT_FOUND",
		);
		expect(p.cost).toBeUndefined();
		expect(json).not.toContain("inputTokens");
		expect(p.time).toBeString();
	});

	test("analyst panel", async () => {
		const d = {
			...(await drafted()),
			model: "google/gemini-2.5-flash-lite",
			latencyMs: 1234,
			usage: { inputTokens: 1200, outputTokens: 80, costUsd: 0.00015 },
		};
		const p = panelFor(d, "analyst");
		expect(p.cost).toEqual({
			model: "google/gemini-2.5-flash-lite",
			inputTokens: 1200,
			outputTokens: 80,
			costUsd: 0.00015,
		});
		expect(p.time).toBe("1,2 s");
		// An old record without the new fields hides them.
		const old = panelFor(base, "analyst");
		expect(old.time).toBeUndefined();
		expect(old.cost).toBeUndefined();
	});

	test("help label", () => {
		const asked: DecisionRecord = {
			...base,
			confidence: 42,
			action: "transferir",
			transfer: { trigger: "confianca_baixa", summary: "…" },
		};
		expect(helpLabel([{ ...base, confidence: 99 }, asked, null])).toBe(
			"Agent pediu ajuda · confiança 42%",
		);
		expect(helpLabel([base])).toBeNull();
	});

	test("conversation totals", () => {
		const u = (i: number, o: number, c: number): DecisionRecord => ({
			...base,
			usage: { inputTokens: i, outputTokens: o, costUsd: c },
		});
		expect(
			conversationTotals([u(100, 10, 0.0001), null, base, u(50, 5, 0.00005)]),
		).toEqual({
			inputTokens: 150,
			outputTokens: 15,
			tokens: 165,
			costUsd: 0.00015,
		});
	});
});
