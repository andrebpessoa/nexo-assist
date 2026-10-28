import type { DecisionRecord } from "@nexo-assist/agent/types";

/** A decision like the one behind capture 02: the draft of a VPN ticket. */
export const drafted: DecisionRecord = {
	intent: "abrir_chamado",
	confidence: 88,
	extracted: {
		title: "VPN não conecta no notebook, erro 809",
		affected: "Só eu",
		sameDayCommitment: true,
	},
	action: "rascunho_chamado",
	rule: "Anexo A: prioridade por impacto e urgência; confirmar antes de criar",
	reason:
		"Prioridade Alta: impede uma pessoa de trabalhar e há compromisso no mesmo dia.",
	tools: [
		{
			name: "modelo.entender",
			kind: "model",
			ok: true,
			attempts: 1,
			durationMs: 640,
			result: "abrir_chamado · 88%",
		},
		{
			name: "regra.prioridade",
			kind: "rule",
			ok: true,
			attempts: 1,
			durationMs: 0,
			request: "afeta: Só eu; impede o trabalho: sim",
			result: "Alta",
		},
		{
			name: "regra.sla",
			kind: "rule",
			ok: true,
			attempts: 1,
			durationMs: 0,
			request: "Alta",
			result: "2026-10-28T13:43:00.000Z",
		},
		{
			name: "rascunho.montar",
			kind: "rule",
			ok: true,
			attempts: 1,
			durationMs: 0,
			request: "INC",
			result: "VPN não conecta no notebook, erro 809",
		},
	],
	usage: { inputTokens: 1840, outputTokens: 96, costUsd: 0.000222 },
	latencyMs: 1320,
	model: "google/gemini-2.5-flash-lite",
};
