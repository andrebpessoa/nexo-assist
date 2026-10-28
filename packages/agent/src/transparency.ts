/**
 * Turns a saved decision into what the chat and the console show (transparencia). Imports only
 * types, so the web can use it without pulling the model SDK.
 */
import type {
	AgentAction,
	DecisionRecord,
	Intent,
	ToolCall,
	TransferTrigger,
	Usage,
} from "./types";

interface StepCopy {
	done: string;
	doing: string;
}

/** The fixed catalog of action labels (TRN-02). Model calls show only in progress and the panel. */
const STEPS: Record<string, (target?: string) => StepCopy> = {
	"chamados.listar": () => ({
		done: "consultou seus chamados",
		doing: "consultando seus chamados",
	}),
	"central.buscar": () => ({
		done: "buscou na central de ajuda",
		doing: "buscando na central de ajuda",
	}),
	"regra.prioridade": () => ({
		done: "classificou a prioridade",
		doing: "classificando a prioridade",
	}),
	"regra.sla": () => ({ done: "consultou o SLA", doing: "consultando o SLA" }),
	"rascunho.montar": () => ({
		done: "montou o rascunho",
		doing: "montando o rascunho",
	}),
	"chamados.consultar": (target) => ({
		done: `consultou o ${target ?? "chamado"}`,
		doing: `consultando o ${target ?? "chamado"}`,
	}),
	"regra.prazo": () => ({
		done: "calculou o prazo",
		doing: "calculando o prazo",
	}),
	"chamados.criar": () => ({
		done: "criou o chamado",
		doing: "criando o chamado",
	}),
	"chamados.complementar": () => ({
		done: "atualizou o chamado",
		doing: "atualizando o chamado",
	}),
	"chamados.reabrir": () => ({
		done: "reabriu o chamado",
		doing: "reabrindo o chamado",
	}),
	"chamados.transferir": () => ({
		done: "transferiu para um analista",
		doing: "transferindo para um analista",
	}),
	"conversa.transferir": () => ({
		done: "transferiu para um analista",
		doing: "transferindo para um analista",
	}),
};

const MODEL_DOING: Record<string, string> = {
	"modelo.entender": "entendendo sua mensagem",
	"modelo.comparar": "comparando com a central e seus chamados",
};

export const NO_TOOLS_LABEL = "respondeu sem consultar sistemas";

export interface ActionLabel {
	label: string;
	ok: boolean;
}

function failed(done: string): string {
	// "consultou seus chamados" → "não conseguiu consultar seus chamados".
	const [verb = "", ...rest] = done.split(" ");
	const infinitive = verb.endsWith("ou")
		? `${verb.slice(0, -2)}ar`
		: verb.endsWith("iu")
			? `${verb.slice(0, -2)}ir`
			: verb;
	return ["não conseguiu", infinitive, ...rest].join(" ");
}

function stepLabel(step: ToolCall): ActionLabel | null {
	const copy = STEPS[step.name]?.(step.target);
	if (!copy) return null;
	return { label: step.ok ? copy.done : failed(copy.done), ok: step.ok };
}

/** The line above a reply: executed steps in order, without repeats (TRN-01 to TRN-05). */
export function actionLine(d: DecisionRecord): ActionLabel[] {
	const out: ActionLabel[] = [];
	for (const step of d.tools) {
		const l = stepLabel(step);
		if (l && !out.some((o) => o.label === l.label)) out.push(l);
	}
	return out.length ? out : [{ label: NO_TOOLS_LABEL, ok: true }];
}

/** What shows while a step runs (TRN-04). */
export function progressLabel(name: string, target?: string): string | null {
	const doing = STEPS[name]?.(target).doing ?? MODEL_DOING[name];
	return doing ? `${doing}…` : null;
}

export type ConfidenceBand = "alta" | "média" | "baixa";

export function confidenceBand(pct: number): ConfidenceBand {
	return pct >= 80 ? "alta" : pct >= 60 ? "média" : "baixa";
}

const INTENTS: Record<Intent, string> = {
	duvida: "Dúvida",
	consultar_chamado: "Consultar chamado",
	complementar_chamado: "Complementar chamado",
	abrir_chamado: "Abrir chamado",
	falar_com_analista: "Falar com um analista",
	fora_de_escopo: "Fora do escopo de TI",
	outro: "Conversa",
};

const ACTIONS: Record<AgentAction, string> = {
	responder: "Respondeu",
	perguntar: "Fez uma pergunta",
	responder_artigo: "Respondeu com um artigo da central",
	mostrar_chamado: "Mostrou o chamado",
	listar_chamados: "Listou seus chamados",
	rascunho_chamado: "Montou o rascunho do chamado",
	rascunho_atualizacao: "Montou o rascunho da atualização",
	rascunho_reabrir: "Montou o pedido de reabertura",
	criar_chamado: "Criou o chamado",
	complementar_chamado: "Atualizou o chamado",
	reabrir_chamado: "Reabriu o chamado",
	transferir: "Transferiu para um analista",
	redirecionar: "Indicou a área certa",
	recusar: "Recusou o pedido",
	descartar: "Descartou o rascunho",
	falha: "Não concluiu",
};

const FIELDS: Record<string, string> = {
	title: "Problema",
	description: "Descrição",
	type: "Tipo",
	category: "Categoria",
	item: "Item",
	affected: "Afetados",
	blocksWork: "Impede o trabalho",
	sameDayCommitment: "Compromisso no mesmo dia",
	workaround: "Tem alternativa",
	ticketNumber: "Chamado",
	ticketHint: "Pista do chamado",
	outOfScopeArea: "Área",
	noteText: "Informação nova",
	answer: "Resposta",
};

const TRIGGERS: Record<TransferTrigger, string> = {
	pedido: "Pedido do funcionário",
	critica: "Prioridade Crítica",
	vencido: "Prazo vencido",
	confianca_baixa: "Confiança baixa",
};

function value(v: unknown): string {
	if (typeof v === "boolean") return v ? "Sim" : "Não";
	return String(v);
}

function sentences(text: string, max: number): string {
	const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
	return parts
		.slice(0, max)
		.map((p) => p.trim())
		.join(" ");
}

function seconds(ms: number): string {
	return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}

export interface PanelStep {
	label: string;
	tool: string;
	ok: boolean;
	attempts: number;
	request?: string;
	result?: string;
	error?: string;
	durationMs?: number;
}

export interface DecisionPanel {
	understood: { intent: string; data: { label: string; value: string }[] };
	did: { action: string; rule: string };
	confidence: { pct: number; band: ConfidenceBand };
	why: string;
	steps: PanelStep[];
	transfer?: { trigger: string; summary: string };
	incomplete: boolean;
	/** Absent on records saved before the field existed. */
	time?: string;
	/** Analyst only (TRN-14). */
	cost?: {
		model: string | null;
		inputTokens: number;
		outputTokens: number;
		costUsd: number;
	};
}

/**
 * "Por que o Nexo fez isso" (TRN-06 to TRN-14). Everything comes from the record, which holds
 * only what the service returned to the conversation's owner (TRN-13).
 */
export function panelFor(
	d: DecisionRecord,
	audience: "employee" | "analyst",
): DecisionPanel {
	const panel: DecisionPanel = {
		understood: {
			intent: INTENTS[d.intent] ?? d.intent,
			data: Object.entries(d.extracted)
				.filter(([k]) => !k.endsWith("Confidence"))
				.map(([k, v]) => ({ label: FIELDS[k] ?? k, value: value(v) })),
		},
		did: { action: ACTIONS[d.action] ?? d.action, rule: d.rule },
		confidence: { pct: d.confidence, band: confidenceBand(d.confidence) },
		why: sentences(d.reason, 3),
		steps: d.tools.map((t) => {
			const step: PanelStep = {
				label:
					stepLabel(t)?.label ??
					progressLabel(t.name, t.target)?.replace("…", "") ??
					t.name,
				tool: t.name,
				ok: t.ok,
				attempts: t.attempts,
			};
			if (t.request !== undefined) step.request = t.request;
			if (t.result !== undefined) step.result = t.result;
			if (t.error !== undefined) step.error = t.error;
			if (t.durationMs !== undefined) step.durationMs = t.durationMs;
			return step;
		}),
		incomplete: d.incomplete ?? false,
	};
	if (d.transfer)
		panel.transfer = {
			trigger: TRIGGERS[d.transfer.trigger],
			summary: d.transfer.summary,
		};
	if (d.latencyMs !== undefined) panel.time = seconds(d.latencyMs);
	if (audience === "analyst" && d.usage && d.model !== undefined)
		panel.cost = {
			model: d.model,
			inputTokens: d.usage.inputTokens,
			outputTokens: d.usage.outputTokens,
			costUsd: d.usage.costUsd,
		};
	return panel;
}

/** "Agent pediu ajuda · confiança NN%" from the decision that transferred (TRN-15). */
export function helpLabel(
	decisions: readonly (DecisionRecord | null)[],
): string | null {
	const d = [...decisions].reverse().find((x) => x?.transfer);
	return d ? `Agent pediu ajuda · confiança ${d.confidence}%` : null;
}

/** Tokens and estimated cost of a conversation so far (TRN-18). */
export function conversationTotals(
	decisions: readonly (DecisionRecord | null)[],
): Usage & { tokens: number } {
	let inputTokens = 0;
	let outputTokens = 0;
	let costUsd = 0;
	for (const d of decisions) {
		if (!d?.usage) continue;
		inputTokens += d.usage.inputTokens;
		outputTokens += d.usage.outputTokens;
		costUsd += d.usage.costUsd;
	}
	return {
		inputTokens,
		outputTokens,
		tokens: inputTokens + outputTokens,
		costUsd: Math.round(costUsd * 1e6) / 1e6,
	};
}

/** The log line of one decision: ids, codes and numbers, never message text (TRN-17). */
export function decisionLog(
	ids: { conversationId: string; messageSeq: number },
	d: DecisionRecord,
) {
	return {
		event: "agent.decision",
		...ids,
		intent: d.intent,
		confidence: d.confidence,
		action: d.action,
		rule: d.rule,
		tools: d.tools.map((t) => ({
			name: t.name,
			ok: t.ok,
			attempts: t.attempts,
			durationMs: t.durationMs ?? null,
			error: t.error ?? null,
		})),
		latencyMs: d.latencyMs ?? null,
		model: d.model ?? null,
		usage: d.usage ?? null,
		transfer: d.transfer?.trigger ?? null,
		incomplete: d.incomplete ?? false,
	};
}
