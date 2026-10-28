import {
	type Actor,
	type Article,
	CATEGORIES,
	type Category,
	type Clock,
	type Priority,
	type Result,
	type TicketService,
	type TicketSummary,
} from "@nexo-assist/tickets";
import { deadlineFor } from "@nexo-assist/tickets/rules/sla";

import {
	COPY,
	elapsed,
	clock as hhmm,
	outOfScope,
	slaLabel,
	toView,
	when,
} from "./copy";
import {
	realSleep,
	type Sleep,
	withModelLimits,
	withTicketRetry,
} from "./retry";
import { isTextConfirmation } from "./rules/confirm";
import { contactDeadline, teamFor } from "./rules/contact";
import { duplicateAction } from "./rules/duplicates";
import {
	type AffectedAnswer,
	priorityFor,
	priorityReason,
	withImpactNote,
} from "./rules/priority";
import { transferSummary } from "./rules/summary";
import type { Conversation, ConversationStore, StoredMessage } from "./store";
import { decisionLog } from "./transparency";
import type {
	AgentAction,
	Block,
	DecisionRecord,
	Pending,
	TicketDraft,
	ToolCall,
	TransferTrigger,
	Usage,
} from "./types";
import {
	type EmployeeProfile,
	emptyJudgement,
	emptyUnderstanding,
	type Judgement,
	type Understander,
	type Understanding,
} from "./understand";
import { buildWindow } from "./window";

/** The rule of a failed create, update or reopen; only then does "Tentar de novo" confirm again. */
const WRITE_FAILED_RULE = "Falha ao gravar - rascunho mantido";

/** Below this the agent does not act and calls an analyst (AD-007, AGT-38). */
export const CONFIDENCE_THRESHOLD = 60;

export type AgentInput =
	| { text: string }
	| { action: "confirm" }
	| { action: "cancel" }
	| { action: "retry" }
	| { action: "edit"; edits?: Partial<TicketDraft> }
	| { action: "option"; value: string }
	| { action: "select"; number: string };

export interface AgentTurn {
	conversationId: string;
	/** True while an analyst owns the conversation: no reply and no model call (AGT-40). */
	silent: boolean;
	blocks: Block[];
	decision: DecisionRecord | null;
}

export interface AgentDeps {
	tickets: TicketService;
	understander: Understander;
	store: ConversationStore;
	profileOf: (userId: string) => Promise<EmployeeProfile>;
	clock?: Clock;
	sleep?: Sleep;
	/** The 30 s model deadline timer; tests pass one that never fires. */
	timer?: Sleep;
	newKey?: () => string;
	/** Start and end of each step, for the progress line (TRN-04). */
	onStep?: (event: StepEvent) => void;
	/** One JSON line per decision, without message text (TRN-17). */
	log?: (line: string) => void;
	modelId?: string;
}

export interface StepEvent {
	conversationId: string;
	name: string;
	target?: string;
	phase: "start" | "end";
	ok?: boolean;
}

interface Turn {
	conv: Conversation;
	actor: Actor;
	now: Date;
	text: string;
	profile: EmployeeProfile;
	u: Understanding;
	tools: ToolCall[];
	usage: Usage;
	history: StoredMessage[];
	startedAt: number;
	modelCalled: boolean;
}

interface Outcome {
	blocks: Block[];
	action: AgentAction;
	rule: string;
	reason: string;
	/** `undefined` keeps what was pending. */
	pending?: Pending | null;
	state?: Conversation["state"];
	incomplete?: boolean;
	transfer?: { trigger: TransferTrigger; summary: string };
}

class ModelUnavailable extends Error {
	constructor(readonly why: "rate_limited" | "failed" | "timeout") {
		super(why);
	}
}

const text = (t: string): Block => ({ kind: "text", text: t });
const options = (question: string, opts: readonly string[]): Block => ({
	kind: "options",
	question,
	options: [...opts],
});
const TYPE_OPTIONS: Record<string, "INC" | "REQ"> = {
	"Parou de funcionar": "INC",
	"É um pedido": "REQ",
};
const TRIED_LABELS: Partial<Record<AgentAction, string>> = {
	responder_artigo: "artigo da central de ajuda",
	mostrar_chamado: "consulta do chamado",
	listar_chamados: "consulta dos chamados",
	rascunho_chamado: "rascunho de chamado",
	criar_chamado: "chamado criado",
	complementar_chamado: "informação anexada ao chamado",
	reabrir_chamado: "chamado reaberto",
};

type Field = "type" | "category" | "affected" | "blocksWork";

function record(v: unknown): Record<string, unknown> | null {
	return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

/** A short, text-free summary of what a tool returned, for the panel. */
function describe(value: unknown): string {
	if (Array.isArray(value)) {
		const ids = value
			.slice(0, 3)
			.map((x) => record(x)?.number ?? record(x)?.slug)
			.filter((x): x is string => typeof x === "string");
		return `${value.length} resultado(s)${ids.length ? `: ${ids.join(", ")}` : ""}`;
	}
	const r = record(value);
	if (r && typeof r.number === "string")
		return typeof r.status === "string"
			? `${r.number} · ${r.status}`
			: r.number;
	return "ok";
}

function describeModel(value: unknown): string {
	const r = record(value);
	const u = record(r?.understanding);
	if (u) return `${u.intent} · ${u.confidence}%`;
	const j = record(r?.judgement);
	if (j)
		return `artigo: ${j.articleSlug ?? "nenhum"}${j.articleFits === false ? " (não serve)" : ""}; mesmo problema: ${j.sameProblemNumber ?? "nenhum"}`;
	return "ok";
}

function defined<T extends object>(o: T): T {
	return Object.fromEntries(
		Object.entries(o).filter(([, v]) => v !== undefined),
	) as T;
}

function blocksText(blocks: Block[]): string {
	return blocks
		.flatMap((b) =>
			b.kind === "text" ? [b.text] : b.kind === "options" ? [b.question] : [],
		)
		.join("\n");
}

export function createAgent(deps: AgentDeps) {
	const { tickets, understander, store } = deps;
	const clock = deps.clock ?? { now: () => new Date() };
	const sleep = deps.sleep ?? realSleep;
	const newKey = deps.newKey ?? (() => crypto.randomUUID());

	// ---- tools -------------------------------------------------------------

	function begin(turn: Turn, name: string, target?: string) {
		deps.onStep?.(
			defined({ conversationId: turn.conv.id, name, target, phase: "start" }),
		);
		return performance.now();
	}

	function end(turn: Turn, step: ToolCall, started: number) {
		turn.tools.push(
			defined({
				...step,
				durationMs: Math.round(performance.now() - started),
			}),
		);
		deps.onStep?.(
			defined({
				conversationId: turn.conv.id,
				name: step.name,
				target: step.target,
				phase: "end",
				ok: step.ok,
			}),
		);
	}

	async function tool<T>(
		turn: Turn,
		name: string,
		call: () => Promise<Result<T>>,
		info: { target?: string; request?: string } = {},
	): Promise<Result<T>> {
		const started = begin(turn, name, info.target);
		const { result, attempts } = await withTicketRetry(call, sleep);
		end(
			turn,
			{
				name,
				kind: "service",
				ok: result.ok,
				attempts,
				...info,
				...(result.ok
					? { result: describe(result.value) }
					: { error: result.error.code }),
			},
			started,
		);
		return result;
	}

	/** A rule run in code; it shows in the action line like a tool (TRN-02). */
	function rule(turn: Turn, name: string, request: string, result: string) {
		const started = begin(turn, name);
		end(
			turn,
			{ name, kind: "rule", ok: true, attempts: 1, request, result },
			started,
		);
	}

	async function model<T extends { usage?: Usage }>(
		turn: Turn,
		name: string,
		call: () => Promise<T>,
	): Promise<T> {
		const started = begin(turn, name);
		const outcome = await withModelLimits(call, { sleep, timer: deps.timer });
		end(
			turn,
			{
				name,
				kind: "model",
				ok: outcome.ok,
				attempts: outcome.attempts,
				...(outcome.ok
					? { result: describeModel(outcome.value) }
					: { error: outcome.reason }),
			},
			started,
		);
		turn.modelCalled = true;
		if (!outcome.ok) throw new ModelUnavailable(outcome.reason);
		const usage = outcome.value.usage;
		if (usage) {
			turn.usage.inputTokens += usage.inputTokens;
			turn.usage.outputTokens += usage.outputTokens;
			turn.usage.costUsd += usage.costUsd;
		}
		return outcome.value;
	}

	async function understand(turn: Turn): Promise<void> {
		const window = buildWindow(turn.history, turn.conv.summary);
		const { understanding } = await model(turn, "modelo.entender", () =>
			understander.understand({
				window,
				profile: turn.profile,
				pending: turn.conv.pending,
			}),
		);
		turn.u = understanding;
	}

	async function judge(
		turn: Turn,
		articles: Article[],
		list: TicketSummary[],
	): Promise<Judgement> {
		if (!articles.length && !list.length) return emptyJudgement();
		const { judgement } = await model(turn, "modelo.comparar", () =>
			understander.judge({
				message: turn.text,
				profile: turn.profile,
				articles,
				tickets: list.map(toView),
			}),
		);
		return judgement;
	}

	// ---- consulta ----------------------------------------------------------

	async function showTicket(turn: Turn, number: string): Promise<Outcome> {
		const got = await tool(
			turn,
			"chamados.consultar",
			() => tickets.get(turn.actor, number),
			{ target: number, request: number },
		);
		if (!got.ok) {
			if (got.error.code === "NOT_FOUND")
				return {
					blocks: [text(COPY.notFound)],
					action: "responder",
					rule: "Privacidade: só os chamados do próprio funcionário",
					reason: `${number} não está entre os chamados do funcionário.`,
					pending: null,
				};
			return serviceDown(turn, "consultar o chamado");
		}
		const t = got.value;
		rule(turn, "regra.prazo", t.priority, t.vencido ? "vencido" : "no prazo");
		const blocks: Block[] = [
			{ kind: "ticket_card", ticket: toView(t) },
			text(
				`O ${t.number} está ${t.status}. Aberto em ${when(t.openedAt)}, última atualização em ${when(t.updatedAt)}.`,
			),
		];
		if (!t.vencido)
			return {
				blocks,
				action: "mostrar_chamado",
				rule: "Consulta: card do chamado",
				reason: `Mostrou ${t.number}.`,
				pending: null,
			};
		blocks.push(
			text(
				`Ele está sem atualização há ${elapsed(t.updatedAt, turn.now)} e o prazo da prioridade ${t.priority} era de ${slaLabel(t.priority)}. Quer que eu chame um analista?`,
			),
			options("Quer que eu chame um analista?", COPY.overdueOptions),
		);
		return {
			blocks,
			action: "mostrar_chamado",
			rule: "Anexo A: vencido - oferecer analista",
			reason: `${t.number} passou do prazo da prioridade ${t.priority}.`,
			pending: { kind: "transfer_offer", number: t.number },
		};
	}

	async function openTickets(turn: Turn) {
		return tool(
			turn,
			"chamados.listar",
			() => tickets.list(turn.actor, { onlyOpen: true }),
			{ request: "abertos" },
		);
	}

	async function consult(turn: Turn): Promise<Outcome> {
		if (turn.u.aboutOtherPerson) return refuseOthers();
		if (turn.u.ticketNumber) return showTicket(turn, turn.u.ticketNumber);
		const listed = await openTickets(turn);
		if (!listed.ok) return serviceDown(turn, "consultar seus chamados");
		const open = listed.value;
		if (open.length === 0)
			return {
				blocks: [text(COPY.noOpen), options(COPY.noOpen, COPY.offerOptions)],
				action: "responder",
				rule: "Consulta: nenhum chamado aberto",
				reason: "O funcionário não tem chamados abertos.",
				pending: { kind: "offer_ticket", text: turn.text },
			};
		if (open.length === 1)
			return showTicket(turn, (open[0] as TicketSummary).number);
		if (turn.u.ticketHint) {
			const j = await judge(turn, [], open);
			if (
				j.sameProblemNumber &&
				j.sameProblemConfidence >= CONFIDENCE_THRESHOLD
			)
				return showTicket(turn, j.sameProblemNumber);
		}
		return {
			blocks: [
				{
					kind: "ticket_list",
					question: COPY.whichOne,
					tickets: open.map(toView),
				},
			],
			action: "listar_chamados",
			rule: "Consulta: mais de um aberto - perguntar qual",
			reason: `${open.length} chamados abertos e nenhum citado.`,
			pending: {
				kind: "select_ticket",
				purpose: "consultar",
				numbers: open.map((t) => t.number),
			},
		};
	}

	function refuseOthers(): Outcome {
		return {
			blocks: [text(COPY.ownTicketsOnly)],
			action: "recusar",
			rule: "Privacidade: cada um vê só os próprios chamados",
			reason: "Pedido sobre chamados de outra pessoa.",
			pending: null,
		};
	}

	// ---- complementar ------------------------------------------------------

	async function complementTicket(
		turn: Turn,
		number: string,
		note: string | null,
	): Promise<Outcome> {
		const got = await tool(
			turn,
			"chamados.consultar",
			() => tickets.get(turn.actor, number),
			{ target: number, request: number },
		);
		if (!got.ok)
			return got.error.code === "NOT_FOUND"
				? {
						blocks: [text(COPY.notFound)],
						action: "responder",
						rule: "Privacidade: só os chamados do próprio funcionário",
						reason: `${number} não é do funcionário.`,
						pending: null,
					}
				: serviceDown(turn, "consultar o chamado");
		if (!note)
			return {
				blocks: [text(`O que você quer acrescentar ao ${number}?`)],
				action: "perguntar",
				rule: "Anexo A: uma pergunta por vez",
				reason: "Falta o texto da atualização.",
				pending: { kind: "collect_note", number },
			};
		return {
			blocks: [
				text(`Vou acrescentar esta informação ao ${number}. Confirma?`),
				{
					kind: "update_draft",
					number,
					note,
					status: "Aguardando confirmação",
				},
			],
			action: "rascunho_atualizacao",
			rule: "Anexo A: confirmar antes de atualizar",
			reason: `Atualização de ${number} aguardando confirmação.`,
			pending: { kind: "update_draft", number, note },
		};
	}

	async function complement(turn: Turn): Promise<Outcome> {
		if (turn.u.ticketNumber)
			return complementTicket(turn, turn.u.ticketNumber, turn.u.noteText);
		const listed = await openTickets(turn);
		if (!listed.ok) return serviceDown(turn, "consultar seus chamados");
		const open = listed.value;
		if (open.length === 0)
			return {
				blocks: [text(COPY.noOpen), options(COPY.noOpen, COPY.offerOptions)],
				action: "responder",
				rule: "Complementar: nenhum chamado aberto",
				reason: "Nada aberto para complementar.",
				pending: { kind: "offer_ticket", text: turn.text },
			};
		if (open.length === 1)
			return complementTicket(
				turn,
				(open[0] as TicketSummary).number,
				turn.u.noteText,
			);
		return {
			blocks: [
				{
					kind: "ticket_list",
					question: COPY.whichToUpdate,
					tickets: open.map(toView),
				},
			],
			action: "listar_chamados",
			rule: "Complementar: mais de um aberto - perguntar qual",
			reason: `${open.length} chamados abertos.`,
			pending: {
				kind: "select_ticket",
				purpose: "complementar",
				numbers: open.map((t) => t.number),
			},
		};
	}

	// ---- central de ajuda e abertura ---------------------------------------

	async function helpCenter(turn: Turn): Promise<Outcome> {
		const found = await tool(
			turn,
			"central.buscar",
			() => tickets.searchArticles(turn.text),
			{ request: turn.text },
		);
		if (!found.ok) return serviceDown(turn, "consultar a central de ajuda");
		const articles = found.value;
		if (!articles.length)
			return {
				blocks: [
					text(COPY.noArticle),
					options(COPY.noArticle, COPY.offerOptions),
				],
				action: "responder",
				rule: "Central: nada encontrado - oferecer chamado",
				reason: "Nenhum artigo responde.",
				pending: { kind: "offer_ticket", text: turn.text },
			};
		const j = await judge(turn, articles, []);
		const article =
			articles.find((a) => a.slug === j.articleSlug) ??
			(articles[0] as Article);
		if (j.articleFits === false)
			return startTicket(turn, { misfit: article, skipHelpCenter: true });
		return answerWithArticle(article, false);
	}

	function answerWithArticle(article: Article, offerTicket: boolean): Outcome {
		const blocks: Block[] = [
			text(`Achei na central de ajuda: “${article.title}”.`),
			{
				kind: "article",
				slug: article.slug,
				title: article.title,
				steps: article.body,
			},
		];
		if (offerTicket)
			blocks.push(
				options("Se não resolver, eu abro um chamado.", COPY.offerOptions),
			);
		return {
			blocks,
			action: "responder_artigo",
			rule: "Central: o artigo responde - sem chamado",
			reason: `Artigo ${article.slug} vale para o funcionário.`,
			pending: offerTicket
				? { kind: "offer_ticket", text: article.title }
				: null,
		};
	}

	function fieldsFrom(
		turn: Turn,
		base: Partial<TicketDraft> = {},
	): Partial<TicketDraft> {
		const f = turn.u.fields;
		const merged: Partial<TicketDraft> = { ...base };
		if (f.title) merged.title = f.title;
		if (f.description) merged.description = f.description;
		if (f.type && (f.typeConfidence ?? 100) >= CONFIDENCE_THRESHOLD)
			merged.type = f.type;
		if (f.category && (f.categoryConfidence ?? 100) >= CONFIDENCE_THRESHOLD)
			merged.category = f.category;
		if (f.item) merged.item = f.item;
		if (f.affected) merged.affected = f.affected;
		if (f.blocksWork !== null) {
			merged.blocksWork = f.blocksWork;
			if (f.workaround === null) merged.workaround = !f.blocksWork;
		}
		if (f.workaround !== null) merged.workaround = f.workaround;
		if (f.sameDayCommitment !== null)
			merged.sameDayCommitment = f.sameDayCommitment;
		if (!merged.title) merged.title = turn.text.slice(0, 80);
		if (!merged.description) merged.description = turn.text;
		return merged;
	}

	function nextMissing(p: Partial<TicketDraft>): Field | null {
		if (!p.type) return "type";
		if (!p.category) return "category";
		if (!p.affected) return "affected";
		if (p.blocksWork === undefined) return "blocksWork";
		return null;
	}

	function question(field: Field): Block[] {
		switch (field) {
			case "type":
				return [
					text(COPY.typeQuestion),
					options(COPY.typeQuestion, Object.keys(TYPE_OPTIONS)),
				];
			case "category":
				return [
					text(COPY.categoryQuestion),
					options(COPY.categoryQuestion, CATEGORIES),
				];
			case "affected":
				return [
					text(COPY.affectedQuestion),
					options(COPY.affectedQuestion, COPY.affectedOptions),
				];
			case "blocksWork":
				return [
					text(COPY.blocksQuestion),
					options(COPY.blocksQuestion, COPY.blocksOptions),
				];
		}
	}

	function buildDraft(
		p: Partial<TicketDraft>,
		now: Date,
		citing?: string,
	): TicketDraft {
		const facts = {
			type: p.type ?? "INC",
			affected: (p.affected ?? "Só eu") as AffectedAnswer,
			blocksWork: p.blocksWork ?? false,
			sameDayCommitment: p.sameDayCommitment ?? false,
			workaround: p.workaround ?? !(p.blocksWork ?? false),
		};
		const priority = priorityFor(facts);
		let description = withImpactNote(p.description ?? "", facts.affected);
		if (citing && !description.includes(citing))
			description = `${description}\n\nRelacionado ao chamado ${citing}, resolvido há mais de 7 dias.`;
		return {
			title: (p.title ?? "").slice(0, 120),
			description,
			type: facts.type,
			category: (p.category ?? "Outros") as Category,
			item: p.item ?? null,
			affected: facts.affected,
			priority,
			priorityReason: priorityReason(facts, priority),
			deadlineAt: deadlineFor(priority, now).toISOString(),
			blocksWork: facts.blocksWork,
			sameDayCommitment: facts.sameDayCommitment,
			workaround: facts.workaround,
		};
	}

	function draftSteps(turn: Turn, draft: TicketDraft, classified: boolean) {
		if (classified) {
			rule(
				turn,
				"regra.prioridade",
				`afeta: ${draft.affected}; impede o trabalho: ${draft.blocksWork ? "sim" : "não"}`,
				draft.priority,
			);
			rule(turn, "regra.sla", draft.priority, draft.deadlineAt);
		}
		rule(turn, "rascunho.montar", draft.type, draft.title);
	}

	function continueDraft(
		turn: Turn,
		partial: Partial<TicketDraft>,
		citing: string | undefined,
		prefix: Block[] = [],
	): Outcome {
		const missing = nextMissing(partial);
		if (missing)
			return {
				blocks: [...prefix, ...question(missing)],
				action: "perguntar",
				rule: "Anexo A: uma pergunta por vez",
				reason: `Falta ${missing} para montar o rascunho.`,
				pending: { kind: "collect", field: missing, partial, citing },
			};
		const draft = buildDraft(partial, turn.now, citing);
		draftSteps(turn, draft, true);
		return {
			blocks: [
				...prefix,
				text(`${COPY.draftIntro} ${draft.priorityReason}`),
				{ kind: "ticket_draft", draft, status: "Aguardando confirmação" },
			],
			action: "rascunho_chamado",
			rule: "Anexo A: prioridade por impacto e urgência; confirmar antes de criar",
			reason: draft.priorityReason,
			pending: {
				kind: "ticket_draft",
				draft,
				idempotencyKey: newKey(),
				citing,
			},
		};
	}

	async function startTicket(
		turn: Turn,
		opts: {
			misfit?: Article;
			skipHelpCenter?: boolean;
			fromText?: string;
		} = {},
	): Promise<Outcome> {
		const prefix: Block[] = [];
		let articles: Article[] = [];
		if (!opts.skipHelpCenter) {
			const found = await tool(
				turn,
				"central.buscar",
				() => tickets.searchArticles(opts.fromText ?? turn.text),
				{ request: opts.fromText ?? turn.text },
			);
			if (found.ok) articles = found.value;
		}
		const listed = await tool(
			turn,
			"chamados.listar",
			() => tickets.list(turn.actor),
			{ request: "todos" },
		);
		if (!listed.ok) return serviceDown(turn, "consultar seus chamados");
		const j = await judge(turn, articles, listed.value);
		if (articles.length && j.articleSlug) {
			const article = articles.find((a) => a.slug === j.articleSlug);
			if (article && j.articleFits !== false)
				return answerWithArticle(article, true);
			if (article) opts.misfit = article;
		}
		if (opts.misfit)
			prefix.push(
				text(
					`O artigo “${opts.misfit.title}” não serve no seu caso: ${opts.misfit.appliesWhen} Vou montar um chamado.`,
				),
			);
		const same =
			j.sameProblemConfidence >= CONFIDENCE_THRESHOLD
				? j.sameProblemNumber
				: null;
		const dup = duplicateAction(listed.value, same, turn.now);
		if (dup.kind === "complement")
			return {
				...(await complementTicket(
					turn,
					dup.ticket.number,
					fieldsFrom(turn).description ?? turn.text,
				)),
				blocks: [
					...prefix,
					text(
						`Você já tem o ${dup.ticket.number} aberto sobre isso. Em vez de abrir outro, posso acrescentar esta informação a ele.`,
					),
					{
						kind: "update_draft",
						number: dup.ticket.number,
						note: fieldsFrom(turn).description ?? turn.text,
						status: "Aguardando confirmação",
					},
				],
				rule: "Anexo A: sem duplicar - complementar o chamado aberto",
			};
		if (dup.kind === "reopen") {
			const reason = fieldsFrom(turn).description ?? turn.text;
			return {
				blocks: [
					...prefix,
					text(
						`O ${dup.ticket.number} sobre isso foi resolvido há ${elapsed(dup.ticket.updatedAt, turn.now)}. Quer que eu reabra ele em vez de abrir outro?`,
					),
					{ kind: "reopen_draft", number: dup.ticket.number, reason },
				],
				action: "rascunho_reabrir",
				rule: "Anexo A: resolvido há 7 dias ou menos - reabrir",
				reason: `${dup.ticket.number} resolvido dentro da janela de 7 dias.`,
				pending: { kind: "reopen_draft", number: dup.ticket.number, reason },
			};
		}
		const citing = dup.kind === "new_citing" ? dup.ticket.number : undefined;
		return continueDraft(turn, fieldsFrom(turn), citing, prefix);
	}

	// ---- confirmar, editar, cancelar ---------------------------------------

	async function confirm(turn: Turn): Promise<Outcome> {
		const pending = turn.conv.pending;
		if (!pending)
			return {
				blocks: [text("Não há nada esperando confirmação agora.")],
				action: "responder",
				rule: "Confirmação sem rascunho",
				reason: "Nada pendente.",
			};
		switch (pending.kind) {
			case "ticket_draft": {
				const { draft, idempotencyKey } = pending;
				const created = await tool(
					turn,
					"chamados.criar",
					() => tickets.create(turn.actor, draft, idempotencyKey),
					{ request: draft.title },
				);
				if (!created.ok)
					return writeFailed(turn, "criar o chamado", created.error.message);
				const t = created.value;
				const done: Outcome = {
					blocks: [
						{ kind: "ticket_draft", draft, status: "Criado" },
						text(
							`Pronto: abri o chamado ${t.number} com prioridade ${t.priority}. Prazo de resposta: até ${when(t.deadlineAt)}.`,
						),
					],
					action: "criar_chamado",
					rule: "Anexo A: criar só depois do Confirmar",
					reason: `Confirmado pelo funcionário; ${t.number} criado.`,
					pending: null,
				};
				if (t.priority !== "Crítica") return done;
				const moved = await transfer(turn, {
					reason: "Chamado Crítico",
					number: t.number,
					priority: t.priority,
					vencido: false,
					trigger: "critica",
				});
				return {
					...moved,
					blocks: [...done.blocks, ...moved.blocks],
					rule: "Anexo A: Crítica - criar e transferir",
				};
			}
			case "update_draft": {
				const added = await tool(
					turn,
					"chamados.complementar",
					() => tickets.addNote(turn.actor, pending.number, pending.note),
					{ target: pending.number, request: pending.number },
				);
				if (!added.ok) {
					if (added.error.code === "TICKET_CLOSED")
						return {
							blocks: [
								text(
									`O ${pending.number} foi encerrado enquanto conversávamos. Quer que eu reabra ele com esta informação?`,
								),
								{
									kind: "reopen_draft",
									number: pending.number,
									reason: pending.note,
								},
							],
							action: "rascunho_reabrir",
							rule: "Chamado encerrado na confirmação - propor reabrir",
							reason: "TICKET_CLOSED na confirmação.",
							pending: {
								kind: "reopen_draft",
								number: pending.number,
								reason: pending.note,
							},
						};
					return writeFailed(turn, "anexar a informação", added.error.message);
				}
				return {
					blocks: [
						{
							kind: "update_draft",
							number: pending.number,
							note: pending.note,
							status: "Anexado",
						},
						text(`Anexei a informação ao ${pending.number}.`),
					],
					action: "complementar_chamado",
					rule: "Anexo A: atualizar só depois do Confirmar",
					reason: `Nota anexada a ${pending.number}.`,
					pending: null,
				};
			}
			case "reopen_draft": {
				const reopened = await tool(
					turn,
					"chamados.reabrir",
					() => tickets.reopen(turn.actor, pending.number, pending.reason),
					{ target: pending.number, request: pending.number },
				);
				if (!reopened.ok) {
					if (reopened.error.code === "REOPEN_NOT_ALLOWED")
						return continueDraft(
							turn,
							{ title: turn.text.slice(0, 80), description: pending.reason },
							pending.number,
							[
								text(
									`O ${pending.number} não pode mais ser reaberto. Vou montar um chamado novo que cita ele.`,
								),
							],
						);
					return writeFailed(turn, "reabrir o chamado", reopened.error.message);
				}
				const t = reopened.value;
				return {
					blocks: [
						text(
							`Reabri o ${t.number}. Prazo de resposta: até ${when(t.deadlineAt)}.`,
						),
						{ kind: "ticket_card", ticket: toView(t) },
					],
					action: "reabrir_chamado",
					rule: "Anexo A: reabrir só depois do Confirmar",
					reason: `${t.number} reaberto.`,
					pending: null,
				};
			}
			case "transfer_offer":
				return transferFor(
					turn,
					pending.number,
					"Prazo vencido; funcionário aceitou falar com um analista",
					"vencido",
				);
			case "offer_ticket":
				return startTicket(turn, {
					skipHelpCenter: true,
					fromText: pending.text,
				});
			default:
				return {
					blocks: [text("Não há nada esperando confirmação agora.")],
					action: "responder",
					rule: "Confirmação sem rascunho",
					reason: "Nada confirmável.",
				};
		}
	}

	function cancel(turn: Turn): Outcome {
		const pending = turn.conv.pending;
		const blocks: Block[] = [];
		if (pending?.kind === "ticket_draft")
			blocks.push({
				kind: "ticket_draft",
				draft: pending.draft,
				status: "Cancelado",
			});
		if (pending?.kind === "update_draft")
			blocks.push({
				kind: "update_draft",
				number: pending.number,
				note: pending.note,
				status: "Cancelado",
			});
		blocks.push(
			text(
				pending?.kind === "ticket_draft"
					? COPY.cancelled
					: "Tudo bem, não fiz nada.",
			),
		);
		return {
			blocks,
			action: "descartar",
			rule: "Cancelar descarta o rascunho",
			reason: "Funcionário cancelou.",
			pending: null,
		};
	}

	function edit(turn: Turn, edits?: Partial<TicketDraft>): Outcome {
		const pending = turn.conv.pending;
		if (pending?.kind !== "ticket_draft")
			return {
				blocks: [text("Não há rascunho para editar agora.")],
				action: "responder",
				rule: "Editar sem rascunho",
				reason: "Nada pendente.",
			};
		if (!edits)
			return {
				blocks: [
					text("Ajuste os campos do rascunho e confirme."),
					{
						kind: "ticket_draft",
						draft: pending.draft,
						status: "Aguardando confirmação",
						editable: true,
					},
				],
				action: "rascunho_chamado",
				rule: "Editar abre os campos do rascunho",
				reason: "Funcionário pediu para editar.",
			};
		const base = pending.draft;
		const changedFacts = [
			"affected",
			"blocksWork",
			"sameDayCommitment",
			"workaround",
			"type",
		].some((k) => k in edits);
		const description =
			edits.description ??
			base.description.replace(/\n\nImpacto não confirmado\.$/, "");
		const merged = { ...base, ...edits, description };
		const draft = changedFacts
			? buildDraft(merged, turn.now, pending.citing)
			: { ...base, ...edits };
		draftSteps(turn, draft, changedFacts);
		return {
			blocks: [
				text(`${COPY.draftIntro} ${draft.priorityReason}`),
				{ kind: "ticket_draft", draft, status: "Aguardando confirmação" },
			],
			action: "rascunho_chamado",
			rule: changedFacts
				? "Editar recalcula a prioridade"
				: "Editar mantém a prioridade",
			reason: draft.priorityReason,
			pending: {
				kind: "ticket_draft",
				draft,
				idempotencyKey: newKey(),
				citing: pending.citing,
			},
		};
	}

	// ---- transferência -----------------------------------------------------

	function tried(turn: Turn): string[] {
		const labels = turn.history
			.map((m) => (m.decision ? TRIED_LABELS[m.decision.action] : undefined))
			.filter((l): l is string => Boolean(l));
		return [...new Set(labels)];
	}

	function problem(turn: Turn): string {
		if (turn.u.fields.description) return turn.u.fields.description;
		const said = turn.history
			.filter((m) => m.role === "employee")
			.map((m) => m.text);
		return said.find((t) => t.length > 15) ?? said.at(-1) ?? turn.text;
	}

	async function transfer(
		turn: Turn,
		opts: {
			reason: string;
			number: string | null;
			priority: Priority | null;
			vencido: boolean;
			trigger: TransferTrigger;
		},
	): Promise<Outcome> {
		const priority = opts.priority ?? "Média";
		const team = teamFor(priority, opts.vencido);
		const contactBy = contactDeadline(priority, turn.now);
		const summary = transferSummary({
			problem: problem(turn),
			tried: tried(turn),
			ticketNumber: opts.number,
			priority: opts.priority,
			reason: opts.reason,
		});
		rule(turn, "regra.prazo", priority, contactBy.toISOString());
		const number = opts.number;
		if (number)
			await tool(
				turn,
				"chamados.transferir",
				() => tickets.transfer(turn.actor, number, { summary, team }),
				{ target: number, request: `${number} → ${team}` },
			);
		else rule(turn, "conversa.transferir", team, "aguardando_analista");
		return {
			blocks: [
				{ kind: "transfer", team, contactBy: contactBy.toISOString(), summary },
				text(
					`Chamei um analista do ${team}. Ele fala com você até ${hhmm(contactBy)}. ${COPY.silentNote}`,
				),
			],
			action: "transferir",
			rule: "Anexo A: transferir com resumo",
			reason: opts.reason,
			pending: null,
			state: "aguardando_analista",
			transfer: { trigger: opts.trigger, summary },
		};
	}

	async function transferFor(
		turn: Turn,
		number: string | null,
		reason: string,
		trigger: TransferTrigger,
	): Promise<Outcome> {
		if (!number)
			return transfer(turn, {
				reason,
				number: null,
				priority: null,
				vencido: false,
				trigger,
			});
		const got = await tool(
			turn,
			"chamados.consultar",
			() => tickets.get(turn.actor, number),
			{ target: number, request: number },
		);
		const t = got.ok ? got.value : null;
		return transfer(turn, {
			reason,
			number: t ? number : null,
			priority: t?.priority ?? null,
			vencido: t?.vencido ?? false,
			trigger,
		});
	}

	function relatedTicket(turn: Turn): string | null {
		if (turn.u.ticketNumber) return turn.u.ticketNumber;
		for (const m of [...turn.history].reverse()) {
			for (const b of m.blocks)
				if (b.kind === "ticket_card") return b.ticket.number;
		}
		return null;
	}

	// ---- falhas ------------------------------------------------------------

	function serviceDown(_turn: Turn, what: string): Outcome {
		return {
			blocks: [
				text(
					`Não consegui ${what} agora: o sistema de chamados não respondeu.`,
				),
				options("Quer tentar de novo?", [COPY.retryOption]),
			],
			action: "falha",
			rule: "Serviço indisponível depois das novas tentativas",
			reason: "SERVICE_UNAVAILABLE",
		};
	}

	function writeFailed(_turn: Turn, what: string, message: string): Outcome {
		return {
			blocks: [
				text(
					`Não consegui ${what} agora: ${message} O rascunho continua aqui.`,
				),
				options("Quer tentar de novo?", [COPY.retryOption]),
			],
			action: "falha",
			rule: WRITE_FAILED_RULE,
			reason: message,
		};
	}

	// ---- roteamento --------------------------------------------------------

	async function byIntent(turn: Turn): Promise<Outcome> {
		const u = turn.u;
		if (u.intent !== "outro" && u.confidence < CONFIDENCE_THRESHOLD)
			return transferFor(
				turn,
				relatedTicket(turn),
				`Agent pediu ajuda · confiança ${u.confidence}%`,
				"confianca_baixa",
			);
		if (u.manipulation)
			return {
				blocks: [text(COPY.refuseRules)],
				action: "recusar",
				rule: "Anexo A: seguir as regras",
				reason: "Pedido para ignorar regras ou agir por outra pessoa.",
			};
		if (u.aboutOtherPerson) return refuseOthers();
		if (u.intent === "falar_com_analista" || u.wantsAnalyst)
			return transferFor(
				turn,
				relatedTicket(turn),
				"Funcionário pediu um analista",
				"pedido",
			);
		switch (u.intent) {
			case "fora_de_escopo":
				return {
					blocks: [text(outOfScope(u.outOfScopeArea ?? "RH"))],
					action: "redirecionar",
					rule: "Anexo A: só TI",
					reason: `Assunto de ${u.outOfScopeArea ?? "outra área"}.`,
				};
			case "duvida":
				return helpCenter(turn);
			case "consultar_chamado":
				return consult(turn);
			case "complementar_chamado":
				return complement(turn);
			case "abrir_chamado":
				if (turn.conv.pending?.kind === "ticket_draft")
					return {
						blocks: [
							text(
								"Você tem um rascunho esperando confirmação. Quer descartar ele e abrir outro?",
							),
						],
						action: "perguntar",
						rule: "Um rascunho por vez",
						reason: "Rascunho pendente.",
					};
				return startTicket(turn);
			default:
				return {
					blocks: [text(COPY.greeting)],
					action: "responder",
					rule: "Saudação ou mensagem vaga",
					reason: "Sem pedido de TI.",
				};
		}
	}

	const declined = (reason: string): Outcome => ({
		blocks: [text(COPY.okNoThanks)],
		action: "responder",
		rule: "Oferta recusada",
		reason,
		pending: null,
	});

	async function withPending(turn: Turn): Promise<Outcome | null> {
		const p = turn.conv.pending;
		if (!p) return null;
		const u = turn.u;
		switch (p.kind) {
			case "collect":
				if (
					[
						"falar_com_analista",
						"consultar_chamado",
						"fora_de_escopo",
					].includes(u.intent) ||
					u.manipulation
				)
					return null;
				return continueDraft(turn, fieldsFrom(turn, p.partial), p.citing);
			case "collect_note":
				return complementTicket(turn, p.number, u.noteText ?? turn.text);
			case "transfer_offer":
				if (u.answer === "sim" || u.wantsAnalyst)
					return transferFor(
						turn,
						p.number,
						"Prazo vencido; funcionário aceitou falar com um analista",
						"vencido",
					);
				if (u.answer === "nao")
					return declined("Funcionário não quis analista.");
				return null;
			case "offer_ticket":
				if (u.answer === "sim")
					return startTicket(turn, { skipHelpCenter: true, fromText: p.text });
				if (u.answer === "nao")
					return declined("Funcionário não quis chamado.");
				return null;
			case "select_ticket":
				if (u.ticketNumber && p.numbers.includes(u.ticketNumber))
					return select(turn, u.ticketNumber);
				return null;
			case "ticket_draft":
			case "update_draft":
			case "reopen_draft":
				if (u.answer === "nao") return cancel(turn);
				return null;
		}
	}

	async function select(turn: Turn, number: string): Promise<Outcome> {
		const p = turn.conv.pending;
		if (p?.kind === "select_ticket" && p.purpose === "complementar")
			return complementTicket(turn, number, null);
		return showTicket(turn, number);
	}

	async function option(turn: Turn, value: string): Promise<Outcome | null> {
		const p = turn.conv.pending;
		if (value === COPY.retryOption) return retry(turn);
		if (!p) return null;
		if (p.kind === "collect") {
			const partial = { ...p.partial };
			if (
				p.field === "affected" &&
				(COPY.affectedOptions as readonly string[]).includes(value)
			)
				partial.affected = value as AffectedAnswer;
			else if (
				p.field === "blocksWork" &&
				(COPY.blocksOptions as readonly string[]).includes(value)
			) {
				partial.blocksWork = value === "Sim";
				partial.workaround = value !== "Sim";
			} else if (p.field === "type" && value in TYPE_OPTIONS)
				partial.type = TYPE_OPTIONS[value];
			else if (
				p.field === "category" &&
				(CATEGORIES as readonly string[]).includes(value)
			)
				partial.category = value as Category;
			else return null;
			return continueDraft(turn, partial, p.citing);
		}
		if (p.kind === "transfer_offer") {
			if (value === "Falar com um analista")
				return transferFor(
					turn,
					p.number,
					"Prazo vencido; funcionário aceitou falar com um analista",
					"vencido",
				);
			if (value === "Adicionar informação")
				return complementTicket(turn, p.number, null);
			if (value === "Não, obrigado")
				return declined("Funcionário não quis analista.");
		}
		if (p.kind === "offer_ticket") {
			if (value === "Abrir um chamado")
				return startTicket(turn, { skipHelpCenter: true, fromText: p.text });
			if (value === "Não, obrigado")
				return declined("Funcionário não quis chamado.");
		}
		if (p.kind === "select_ticket" && p.numbers.includes(value))
			return select(turn, value);
		return null;
	}

	async function retry(turn: Turn): Promise<Outcome> {
		const p = turn.conv.pending;
		const lastAgent = turn.history.filter((m) => m.role === "agent").at(-1);
		const writeFailed = lastAgent?.decision?.rule === WRITE_FAILED_RULE;
		if (
			writeFailed &&
			p &&
			["ticket_draft", "update_draft", "reopen_draft"].includes(p.kind)
		)
			return confirm(turn);
		const last = turn.history.filter((m) => m.role === "employee").at(-1);
		turn.text = last?.text ?? "";
		return fromText(turn);
	}

	async function fromText(turn: Turn): Promise<Outcome> {
		const p = turn.conv.pending;
		if (
			p &&
			p.kind !== "collect" &&
			p.kind !== "collect_note" &&
			p.kind !== "select_ticket" &&
			isTextConfirmation(turn.text)
		)
			return confirm(turn);
		if (p?.kind === "collect" || p?.kind === "select_ticket") {
			const byOption = await option(turn, turn.text.trim());
			if (byOption) return byOption;
		}
		await understand(turn);
		return (await withPending(turn)) ?? byIntent(turn);
	}

	// ---- turno -------------------------------------------------------------

	async function finish(turn: Turn, outcome: Outcome): Promise<AgentTurn> {
		const decision: DecisionRecord = {
			intent: turn.u.intent,
			confidence: turn.u.confidence,
			extracted: extracted(turn.u),
			action: outcome.action,
			rule: outcome.rule,
			reason: outcome.reason,
			tools: turn.tools,
			usage: {
				...turn.usage,
				costUsd: Math.round(turn.usage.costUsd * 1e6) / 1e6,
			},
			latencyMs: Math.round(performance.now() - turn.startedAt),
			model: turn.modelCalled ? (deps.modelId ?? null) : null,
			...(outcome.transfer ? { transfer: outcome.transfer } : {}),
			...(outcome.incomplete ? { incomplete: true } : {}),
		};
		const stored = await store.append(turn.conv.id, {
			role: "agent",
			text: blocksText(outcome.blocks),
			blocks: outcome.blocks,
			decision,
		});
		deps.log?.(
			JSON.stringify(
				decisionLog(
					{ conversationId: turn.conv.id, messageSeq: stored.seq },
					decision,
				),
			),
		);
		const patch: Parameters<ConversationStore["update"]>[1] = {};
		if (outcome.pending !== undefined) patch.pending = outcome.pending;
		if (outcome.state) patch.state = outcome.state;
		if (Object.keys(patch).length) await store.update(turn.conv.id, patch);
		return {
			conversationId: turn.conv.id,
			silent: false,
			blocks: outcome.blocks,
			decision,
		};
	}

	function extracted(u: Understanding): Record<string, unknown> {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(u.fields)) if (v !== null) out[k] = v;
		for (const k of [
			"ticketNumber",
			"ticketHint",
			"outOfScopeArea",
			"noteText",
			"answer",
		] as const)
			if (u[k] !== null) out[k] = u[k];
		return out;
	}

	async function send(userId: string, input: AgentInput): Promise<AgentTurn> {
		const conv = await store.open(userId);
		const said =
			"text" in input
				? input.text
				: input.action === "option"
					? input.value
					: input.action === "select"
						? input.number
						: null;
		if (said !== null)
			await store.append(conv.id, {
				role: "employee",
				text: said,
				blocks: [text(said)],
				decision: null,
			});
		else if (!("text" in input) && input.action !== "retry")
			await store.append(conv.id, {
				role: "employee",
				text: `[${input.action}]`,
				blocks: [],
				decision: null,
			});
		if (conv.state !== "agent")
			return {
				conversationId: conv.id,
				silent: true,
				blocks: [],
				decision: null,
			};
		const turn: Turn = {
			conv,
			actor: { kind: "employee", userId },
			now: clock.now(),
			text: said ?? "",
			profile: await deps.profileOf(userId),
			u: { ...emptyUnderstanding(), intent: "outro", confidence: 100 },
			tools: [],
			usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
			history: await store.messages(conv.id),
			startedAt: performance.now(),
			modelCalled: false,
		};
		try {
			let outcome: Outcome | null;
			if ("text" in input) outcome = await fromText(turn);
			else if (input.action === "confirm") outcome = await confirm(turn);
			else if (input.action === "cancel") outcome = cancel(turn);
			else if (input.action === "edit") outcome = edit(turn, input.edits);
			else if (input.action === "retry") outcome = await retry(turn);
			else if (input.action === "select")
				outcome = await select(turn, input.number);
			else
				outcome = (await option(turn, input.value)) ?? (await fromText(turn));
			return await finish(turn, outcome);
		} catch (error) {
			if (!(error instanceof ModelUnavailable)) throw error;
			const limited = error.why === "rate_limited";
			return finish(turn, {
				blocks: [
					text(limited ? COPY.rateLimited : COPY.modelFailed),
					options(limited ? COPY.rateLimited : COPY.modelFailed, [
						COPY.retryOption,
					]),
				],
				action: "falha",
				rule: limited
					? "Limite de uso do modelo"
					: "Modelo falhou ou passou de 30 s",
				reason: error.why,
				incomplete: true,
			});
		}
	}

	return {
		send,
		async history(userId: string) {
			const conv = await store.open(userId);
			return { conversation: conv, messages: await store.messages(conv.id) };
		},
		/** An analyst took the conversation (console). */
		async assume(conversationId: string) {
			await store.update(conversationId, { state: "com_analista" });
		},
		async analystSays(conversationId: string, said: string) {
			await store.append(conversationId, {
				role: "analyst",
				text: said,
				blocks: [text(said)],
				decision: null,
			});
		},
		/** The analyst hands the conversation back; the next turn reads their messages (AGT-41). */
		async returnToAgent(conversationId: string) {
			await store.update(conversationId, { state: "agent", pending: null });
			await store.append(conversationId, {
				role: "system",
				text: COPY.resumed,
				blocks: [text(COPY.resumed)],
				decision: null,
			});
		},
	};
}

export type Agent = ReturnType<typeof createAgent>;
