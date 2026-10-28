export const TICKET_TYPES = ["INC", "REQ"] as const;
export const CATEGORIES = [
	"Acesso",
	"Rede e VPN",
	"Hardware",
	"Software",
	"E-mail",
	"Outros",
] as const;
export const PRIORITIES = ["Crítica", "Alta", "Média", "Baixa"] as const;
export const AFFECTED = ["Só eu", "Minha equipe", "Toda a empresa"] as const;
export const STATUSES = [
	"Aguardando analista",
	"Em andamento",
	"Em atendimento",
	"Aprovado",
	"Resolvido",
	"Fechado",
	"Cancelado",
] as const;
export const CLOSED_STATUSES = ["Resolvido", "Fechado", "Cancelado"] as const;
export const TEAMS = ["Suporte N1", "Suporte N2"] as const;
export const EVENT_KINDS = [
	"criado",
	"transferido",
	"assumido",
	"atualizado",
	"reaberto",
	"resolvido",
] as const;

export type TicketType = (typeof TICKET_TYPES)[number];
export type Category = (typeof CATEGORIES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type Affected = (typeof AFFECTED)[number];
export type Status = (typeof STATUSES)[number];
export type Team = (typeof TEAMS)[number];
export type EventKind = (typeof EVENT_KINDS)[number];

export type Actor =
	| { kind: "employee"; userId: string }
	| { kind: "analyst"; userId: string; name: string; team: Team };
export type AnalystActor = Extract<Actor, { kind: "analyst" }>;

export type TicketErrorCode =
	| "NOT_FOUND"
	| "INVALID_TICKET"
	| "TICKET_CLOSED"
	| "REOPEN_NOT_ALLOWED"
	| "INVALID_TRANSFER"
	| "SERVICE_UNAVAILABLE";
export type TicketError = {
	code: TicketErrorCode;
	message: string;
	fields?: string[];
};
export type Result<T> =
	| { ok: true; value: T }
	| { ok: false; error: TicketError };

export interface TicketSummary {
	number: string;
	title: string;
	type: TicketType;
	category: Category;
	item: string | null;
	priority: Priority;
	status: Status;
	openedAt: Date;
	updatedAt: Date;
	deadlineAt: Date;
	vencido: boolean;
	atrasoMinutos: number;
}

export interface TicketNote {
	author: string;
	body: string;
	at: Date;
}

export interface TicketEvent {
	kind: EventKind;
	actor: string;
	summary?: string;
	team?: Team;
	at: Date;
}

export interface TicketDetail extends TicketSummary {
	description: string;
	affected: Affected;
	requester: { id: string; name: string };
	notes: TicketNote[];
	events: TicketEvent[];
}

export interface Article {
	slug: string;
	title: string;
	body: string;
	appliesWhen: string;
	keywords: string[];
}

/** What a caller (agent or console) sends to create a ticket; validated before anything is written. */
export interface NewTicketInput {
	title: string;
	description: string;
	type: string;
	category: string;
	item?: string | null;
	priority: string;
	affected: string;
}

export interface NewTicket {
	title: string;
	description: string;
	type: TicketType;
	category: Category;
	item: string | null;
	priority: Priority;
	affected: Affected;
}

export interface Transfer {
	summary: string;
	team: Team;
}

export interface Clock {
	now(): Date;
}

export interface TicketService {
	list(
		actor: Actor,
		opts?: { onlyOpen?: boolean; requesterId?: string },
	): Promise<Result<TicketSummary[]>>;
	get(actor: Actor, number: string): Promise<Result<TicketDetail>>;
	create(
		actor: Actor,
		input: NewTicketInput,
		idempotencyKey: string,
	): Promise<Result<TicketDetail>>;
	addNote(
		actor: Actor,
		number: string,
		body: string,
	): Promise<Result<TicketDetail>>;
	reopen(
		actor: Actor,
		number: string,
		reason: string,
	): Promise<Result<TicketDetail>>;
	transfer(
		actor: Actor,
		number: string,
		transfer: Transfer,
	): Promise<Result<TicketDetail>>;
	assume(actor: AnalystActor, number: string): Promise<Result<TicketDetail>>;
	searchArticles(query: string): Promise<Result<Article[]>>;
}

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(
	code: TicketErrorCode,
	message: string,
	fields?: string[],
): Result<T> => ({
	ok: false,
	error: fields ? { code, message, fields } : { code, message },
});
