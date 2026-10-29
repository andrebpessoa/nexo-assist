import { describe, expect, test } from "bun:test";

import {
	type ConsoleAction,
	filterCounts,
	inFilter,
	order,
	summarize,
	transition,
} from "./console";
import type { ConsoleRow, StoredMessage } from "./store";
import type { ConversationState, DecisionRecord } from "./types";

const conv = (state: ConversationState, assigneeId: string | null = null) => ({
	state,
	assigneeId,
});
const ME = "rafael";
const OTHER = "marina";

describe("transition", () => {
	test("assume from waiting or from the agent passes to the analyst", () => {
		for (const from of ["aguardando_analista", "agent"] as const)
			expect(transition(conv(from), "assume", ME)).toEqual({
				ok: true,
				state: "com_analista",
				assigneeId: ME,
				changed: true,
			});
	});

	test("assume twice by the same analyst changes nothing", () => {
		expect(transition(conv("com_analista", ME), "assume", ME)).toEqual({
			ok: true,
			state: "com_analista",
			assigneeId: ME,
			changed: false,
		});
	});

	test("assume a conversation another analyst took is TAKEN", () => {
		expect(transition(conv("com_analista", OTHER), "assume", ME)).toEqual({
			ok: false,
			code: "TAKEN",
		});
	});

	test("reply only by the analyst who assumed", () => {
		expect(transition(conv("com_analista", ME), "reply", ME)).toMatchObject({
			ok: true,
			state: "com_analista",
			changed: false,
		});
		expect(transition(conv("com_analista", OTHER), "reply", ME)).toEqual({
			ok: false,
			code: "NOT_YOURS",
		});
	});

	test("return to the agent from the analyst or from waiting", () => {
		for (const c of [conv("com_analista", ME), conv("aguardando_analista")])
			expect(transition(c, "return", ME)).toEqual({
				ok: true,
				state: "agent",
				assigneeId: null,
				changed: true,
			});
		expect(transition(conv("com_analista", OTHER), "return", ME)).toEqual({
			ok: false,
			code: "NOT_YOURS",
		});
	});

	test("close from the analyst, from waiting and from the agent", () => {
		for (const c of [
			conv("com_analista", ME),
			conv("aguardando_analista"),
			conv("agent"),
		])
			expect(transition(c, "close", ME)).toMatchObject({
				ok: true,
				state: "encerrada",
				changed: true,
			});
		expect(transition(conv("com_analista", OTHER), "close", ME)).toEqual({
			ok: false,
			code: "NOT_YOURS",
		});
	});

	test("every other move is INVALID_TRANSITION", () => {
		const invalid: [ConversationState, ConsoleAction][] = [
			["encerrada", "assume"],
			["encerrada", "reply"],
			["encerrada", "return"],
			["encerrada", "close"],
			["agent", "reply"],
			["agent", "return"],
			["aguardando_analista", "reply"],
		];
		for (const [state, action] of invalid)
			expect(transition(conv(state), action, ME)).toEqual({
				ok: false,
				code: "INVALID_TRANSITION",
			});
	});
});

const NOW = new Date("2026-10-28T12:00:00-03:00");
const at = (minutesAgo: number) =>
	new Date(NOW.getTime() - minutesAgo * 60_000);
let seq = 0;
const msg = (
	role: StoredMessage["role"],
	text: string,
	minutesAgo: number,
	extra: Partial<StoredMessage> = {},
): StoredMessage => ({
	seq: ++seq,
	role,
	text,
	blocks: [{ kind: "text", text }],
	decision: null,
	createdAt: at(minutesAgo),
	...extra,
});
const decision = (over: Partial<DecisionRecord>): DecisionRecord => ({
	intent: "falar_com_analista",
	confidence: 90,
	extracted: {},
	action: "transferir",
	rule: "",
	reason: "",
	tools: [],
	...over,
});
const transferMsg = (
	minutesAgo: number,
	contactBy: Date,
	over: Partial<DecisionRecord> = {},
) =>
	msg("agent", "Chamei um analista.", minutesAgo, {
		blocks: [
			{
				kind: "transfer",
				team: "Suporte N2",
				contactBy: contactBy.toISOString(),
				summary: "",
			},
			{ kind: "text", text: "Chamei um analista." },
		],
		decision: decision(over),
	});
const row = (
	state: ConversationState,
	messages: StoredMessage[],
	over: Partial<ConsoleRow["conversation"]> = {},
	updatedAt = messages.at(-1)?.createdAt ?? NOW,
): ConsoleRow => ({
	conversation: {
		id: `c${++seq}`,
		userId: `u${seq}`,
		state,
		pending: null,
		summary: null,
		assigneeId: null,
		readSeq: 0,
		...over,
	},
	employee: { name: "Ana Souza", department: "Financeiro" },
	messages,
	updatedAt,
});

describe("summarize", () => {
	test("transferred with a ticket shows the number and the contact deadline", () => {
		const r = row("aguardando_analista", [
			msg("employee", "Quero falar com um analista.", 10),
			transferMsg(9, at(-120), {
				tools: [
					{
						name: "chamados.transferir",
						ok: true,
						attempts: 1,
						target: "INC-20311",
					},
				],
			}),
		]);
		const item = summarize(r, NOW, ME);
		expect(item.status).toEqual({ kind: "transferida", ticket: "INC-20311" });
		expect(item.ticket).toBe("INC-20311");
		expect(item.contactBy).toBe(at(-120).toISOString());
	});

	test("transferred without a ticket keeps the deadline for 'contato em'", () => {
		const item = summarize(
			row("aguardando_analista", [transferMsg(5, at(-25))]),
			NOW,
			ME,
		);
		expect(item.status).toEqual({ kind: "transferida", ticket: null });
		expect(item.contactBy).toBe(at(-25).toISOString());
	});

	test("low confidence shows 'pediu ajuda' with the confidence", () => {
		const item = summarize(
			row("aguardando_analista", [
				transferMsg(5, at(-60), {
					confidence: 41,
					transfer: { trigger: "confianca_baixa", summary: "" },
				}),
			]),
			NOW,
			ME,
		);
		expect(item.status).toEqual({ kind: "pediu_ajuda", confidence: 41 });
	});

	test("agent, resolved after 24 h, mine, someone else's and closed", () => {
		const agentNow = row("agent", [msg("agent", "Oi", 30)]);
		const stale = row("agent", [
			msg("employee", "Isso resolveu, obrigado!", 25 * 60 + 5),
			msg("agent", "Que bom!", 25 * 60),
		]);
		const mine = row("com_analista", [msg("employee", "Oi", 1)], {
			assigneeId: ME,
		});
		const theirs = row("com_analista", [msg("employee", "Oi", 1)], {
			assigneeId: OTHER,
		});
		const closed = row("encerrada", [
			msg("system", "Atendimento encerrado", 1),
		]);
		expect(summarize(agentNow, NOW, ME).status).toEqual({ kind: "agent" });
		expect(summarize(stale, NOW, ME).status).toEqual({ kind: "resolvida" });
		expect(summarize(mine, NOW, ME).status).toEqual({ kind: "voce" });
		expect(summarize(theirs, NOW, ME).status).toEqual({
			kind: "outro_analista",
			assigneeId: OTHER,
		});
		expect(summarize(closed, NOW, ME).status).toEqual({ kind: "encerrada" });
	});

	test("the employee saying it is solved marks it resolved", () => {
		const said = (text: string) =>
			summarize(
				row("agent", [
					msg("agent", "Tente reiniciar.", 3),
					msg("employee", text, 1),
				]),
				NOW,
				ME,
			).status;
		expect(said("Isso resolveu, obrigado!")).toEqual({ kind: "resolvida" });
		expect(said("Funcionou!")).toEqual({ kind: "resolvida" });
		expect(said("Deu certo, valeu")).toEqual({ kind: "resolvida" });
		expect(said("Não resolveu.")).toEqual({ kind: "agent" });
		expect(said("Ainda não funcionou")).toEqual({ kind: "agent" });
		expect(said("Reiniciei e nada")).toEqual({ kind: "agent" });
	});

	test("24 h of silence after the central's answer, agent or analyst, not after the employee's", () => {
		const analystLast = row("agent", [
			msg("employee", "Está lento.", 26 * 60),
			msg("analyst", "Atualizei o driver.", 25 * 60 + 2),
			msg("system", "Voltei para a conversa. Como posso ajudar?", 25 * 60),
		]);
		const employeeLast = row("agent", [
			msg("agent", "Tente reiniciar.", 26 * 60),
			msg("employee", "Vou tentar amanhã.", 25 * 60),
		]);
		expect(summarize(analystLast, NOW, ME).status).toEqual({
			kind: "resolvida",
		});
		expect(summarize(employeeLast, NOW, ME).status).toEqual({ kind: "agent" });
	});

	test("opening up to the employee's last message leaves nothing unread", () => {
		const m1 = msg("agent", "Oi", 3);
		const m2 = msg("employee", "Ainda aí?", 1);
		const item = summarize(
			row("aguardando_analista", [m1, m2], { readSeq: m2.seq }),
			NOW,
			ME,
		);
		expect(item.unread).toBe(0);
	});

	test("preview skips system lines; unread counts employee messages after read_seq", () => {
		const m1 = msg("employee", "Está parado há 5 dias.", 10);
		const m2 = msg("agent", "Vou chamar um analista.", 9);
		const m3 = msg("employee", "Quero falar com um analista.", 8);
		const m4 = msg("employee", "Ainda aí?", 7);
		const m5 = msg("system", "Transferida para Suporte N2", 6);
		const item = summarize(
			row("aguardando_analista", [m1, m2, m3, m4, m5], { readSeq: m2.seq }),
			NOW,
			ME,
		);
		expect(item.preview).toEqual({ role: "employee", text: "Ainda aí?" });
		expect(item.lastAt).toBe(m5.createdAt.toISOString());
		expect(item.unread).toBe(2);
	});

	test("ticket numbers the conversation mentions feed the search", () => {
		const item = summarize(
			row("agent", [
				msg("employee", "INC-20311", 5),
				msg("agent", "Aqui está", 4, {
					blocks: [
						{
							kind: "ticket_draft",
							draft: {} as never,
							status: "Criado",
							number: "REQ-10450",
						},
					],
				}),
			]),
			NOW,
			ME,
		);
		expect(item.tickets).toEqual(["INC-20311", "REQ-10450"]);
		expect(item.ticket).toBe("REQ-10450");
	});
});

describe("filters and order", () => {
	const waitingLate = row("aguardando_analista", [transferMsg(50, at(-90))]);
	const waitingSoon = row("aguardando_analista", [transferMsg(40, at(-25))]);
	const withAgent = row("agent", [msg("agent", "Oi", 1)]);
	const resolved = row("agent", [msg("agent", "Feito", 26 * 60)]);
	const mine = row("com_analista", [msg("employee", "Oi", 3)], {
		assigneeId: ME,
	});
	const theirs = row("com_analista", [msg("employee", "Oi", 2)], {
		assigneeId: OTHER,
	});
	const closedRecent = row("encerrada", [msg("system", "fim", 60)]);
	const closedOld = row("encerrada", [msg("system", "fim", 8 * 24 * 60)]);
	const items = [
		withAgent,
		resolved,
		waitingLate,
		mine,
		theirs,
		closedRecent,
		closedOld,
		waitingSoon,
	].map((r) => summarize(r, NOW, ME));

	test("counts per filter", () => {
		expect(filterCounts(items)).toEqual({
			todas: 7,
			para_voce: 2,
			com_agent: 1,
			minhas: 1,
		});
		expect(items.filter((i) => inFilter(i, "minhas")).map((i) => i.id)).toEqual(
			[mine.conversation.id],
		);
	});

	test("waiting first by nearest contact deadline, then by last message", () => {
		expect(
			order(items.filter((i) => inFilter(i, "todas"))).map((i) => i.id),
		).toEqual([
			waitingSoon.conversation.id,
			waitingLate.conversation.id,
			withAgent.conversation.id,
			theirs.conversation.id,
			mine.conversation.id,
			closedRecent.conversation.id,
			resolved.conversation.id,
		]);
	});
});
