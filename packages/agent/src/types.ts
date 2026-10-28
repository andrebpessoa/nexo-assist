import type {
	Affected,
	Category,
	Priority,
	Status,
	Team,
	TicketType,
} from "@nexo-assist/tickets";

import type { AffectedAnswer } from "./rules/priority";

export const INTENTS = [
	"duvida",
	"consultar_chamado",
	"complementar_chamado",
	"abrir_chamado",
	"falar_com_analista",
	"fora_de_escopo",
	"outro",
] as const;
export type Intent = (typeof INTENTS)[number];

export type ConversationState =
	| "agent"
	| "aguardando_analista"
	| "com_analista";
export type MessageRole = "employee" | "agent" | "analyst" | "system";

export type AgentAction =
	| "responder"
	| "perguntar"
	| "responder_artigo"
	| "mostrar_chamado"
	| "listar_chamados"
	| "rascunho_chamado"
	| "rascunho_atualizacao"
	| "rascunho_reabrir"
	| "criar_chamado"
	| "complementar_chamado"
	| "reabrir_chamado"
	| "transferir"
	| "redirecionar"
	| "recusar"
	| "descartar"
	| "falha";

export interface ToolCall {
	name: string;
	ok: boolean;
	attempts: number;
}

export interface Usage {
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
}

/** What the agent understood, did and why; saved with the reply (AGT-02, TRN-16). */
export interface DecisionRecord {
	intent: Intent;
	confidence: number;
	extracted: Record<string, unknown>;
	action: AgentAction;
	rule: string;
	reason: string;
	tools: ToolCall[];
	usage?: Usage;
}

/** Dates as ISO strings: blocks are stored as JSON and drawn as they were. */
export interface TicketView {
	number: string;
	title: string;
	type: TicketType;
	category: Category;
	priority: Priority;
	status: Status;
	openedAt: string;
	updatedAt: string;
	deadlineAt: string;
	vencido: boolean;
	atrasoMinutos: number;
}

export interface TicketDraft {
	title: string;
	description: string;
	type: TicketType;
	category: Category;
	item: string | null;
	affected: AffectedAnswer;
	priority: Priority;
	priorityReason: string;
	/** Answer deadline of the priority, counted from now. */
	deadlineAt: string;
	blocksWork: boolean;
	sameDayCommitment: boolean;
	workaround: boolean;
}

export type Block =
	| { kind: "text"; text: string }
	| { kind: "options"; question: string; options: string[] }
	| { kind: "article"; slug: string; title: string; steps: string }
	| { kind: "ticket_card"; ticket: TicketView }
	| { kind: "ticket_list"; question: string; tickets: TicketView[] }
	| {
			kind: "ticket_draft";
			draft: TicketDraft;
			status: "Aguardando confirmação" | "Criado" | "Cancelado";
			editable?: boolean;
	  }
	| {
			kind: "update_draft";
			number: string;
			note: string;
			status: "Aguardando confirmação" | "Anexado" | "Cancelado";
	  }
	| { kind: "reopen_draft"; number: string; reason: string }
	| { kind: "transfer"; team: Team; contactBy: string; summary: string };

/** What waits for the employee's next step; at most one at a time (AGT-32). */
export type Pending =
	| {
			kind: "ticket_draft";
			draft: TicketDraft;
			idempotencyKey: string;
			citing?: string;
	  }
	| { kind: "update_draft"; number: string; note: string }
	| { kind: "reopen_draft"; number: string; reason: string }
	| { kind: "transfer_offer"; number: string }
	| {
			kind: "select_ticket";
			purpose: "consultar" | "complementar";
			numbers: string[];
	  }
	| {
			kind: "collect";
			field: "affected" | "type" | "category" | "blocksWork";
			partial: Partial<TicketDraft>;
			citing?: string;
	  }
	| { kind: "offer_ticket"; text: string }
	| { kind: "collect_note"; number: string };

export type AffectedOption = Affected | "Não sei";
