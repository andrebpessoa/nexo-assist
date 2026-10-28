import type { ConsoleList, ConsoleListItem } from "./api";

export const NOW = new Date("2026-10-28T13:10:00.000Z");

export function item(over: Partial<ConsoleListItem> = {}): ConsoleListItem {
	return {
		id: "c1",
		userId: "u-ana",
		name: "Ana Souza",
		department: "Financeiro",
		state: "aguardando_analista",
		assigneeId: null,
		assigneeName: null,
		status: { kind: "transferida", ticket: "INC-20311" },
		ticket: "INC-20311",
		tickets: ["INC-20311"],
		contactBy: "2026-10-28T15:05:00.000Z",
		preview: { role: "employee", text: "Está parado há 5 dias." },
		lastAt: "2026-10-28T13:05:00.000Z",
		unread: 2,
		recent: true,
		...over,
	};
}

export const list = (
	items: ConsoleListItem[] = [item()],
	over: Partial<ConsoleList> = {},
): ConsoleList => ({
	items,
	counts: {
		todas: items.length,
		para_voce: items.filter((i) => i.state === "aguardando_analista").length,
		com_agent: items.filter((i) => i.status.kind === "agent").length,
		minhas: items.filter((i) => i.status.kind === "voce").length,
	},
	me: { name: "Rafael Lima", team: "Suporte N2" },
	...over,
});

import type { ConsoleConversation, ConsoleMessage } from "./api";

let seq = 0;
export const message = (
	role: ConsoleMessage["role"],
	text: string,
	createdAt: string,
	over: Partial<ConsoleMessage> = {},
): ConsoleMessage => ({
	seq: ++seq,
	role,
	text,
	blocks: [{ kind: "text", text }],
	decision: null,
	createdAt,
	...over,
});

const transferDecision = {
	intent: "falar_com_analista" as const,
	confidence: 95,
	extracted: {},
	action: "transferir" as const,
	rule: "Anexo A: transferir com resumo",
	reason: "Pediu um analista.",
	tools: [
		{
			name: "chamados.transferir",
			ok: true,
			attempts: 1,
			target: "INC-20311",
			kind: "service" as const,
		},
	],
};

/** Ana's conversation as in capture 04. */
export function anaConversation(
	over: Partial<ConsoleListItem> = {},
	extra: ConsoleMessage[] = [],
): ConsoleConversation {
	return {
		conversation: item({ unread: 0, ...over }),
		messages: [
			message(
				"employee",
				"Qual o status do meu chamado?",
				"2026-10-28T13:01:00.000Z",
			),
			message(
				"agent",
				"Você tem 3 chamados abertos.",
				"2026-10-28T13:01:10.000Z",
				{
					blocks: [
						{
							kind: "ticket_list",
							question:
								"Você tem 3 chamados abertos. Sobre qual deles quer saber?",
							tickets: [
								{
									number: "INC-20311",
									title: "Notebook lento após atualização",
									type: "INC",
									category: "Hardware",
									priority: "Média",
									status: "Aguardando analista",
									openedAt: "2026-10-23T13:00:00.000Z",
									updatedAt: "2026-10-23T13:00:00.000Z",
									deadlineAt: "2026-10-26T13:00:00.000Z",
									vencido: true,
									atrasoMinutos: 100,
								},
							],
						},
					],
				},
			),
			message("employee", "INC-20311", "2026-10-28T13:02:00.000Z"),
			message(
				"employee",
				"Quero falar com um analista.",
				"2026-10-28T13:04:00.000Z",
			),
			message(
				"agent",
				"Encaminhei para o Suporte N2. Um analista vai falar com você em até 2 h úteis.",
				"2026-10-28T13:05:00.000Z",
				{ decision: transferDecision },
			),
			message(
				"system",
				"Transferida para Suporte N2",
				"2026-10-28T13:05:01.000Z",
			),
			...extra,
		].map((m, i) => ({ ...m, seq: i + 1 })),
	};
}

import type { TicketDetailJson, TicketJson, TicketsPanelData } from "./api";

export const ticket = (over: Partial<TicketJson> = {}): TicketJson => ({
	number: "INC-20311",
	title: "Notebook lento após atualização",
	type: "INC",
	category: "Hardware",
	priority: "Média",
	status: "Aguardando analista",
	openedAt: "2026-10-23T13:00:00.000Z",
	updatedAt: "2026-10-28T13:05:00.000Z",
	deadlineAt: "2026-10-26T13:00:00.000Z",
	vencido: true,
	...over,
});

export const detail = (
	over: Partial<TicketDetailJson> = {},
): TicketDetailJson => ({
	...ticket(),
	description: "Depois da atualização o notebook demora 10 minutos para ligar.",
	notes: [
		{
			author: "Ana Souza",
			body: "Já reiniciei duas vezes.",
			at: "2026-10-24T12:00:00.000Z",
		},
	],
	events: [
		{ kind: "criado", actor: "Ana Souza", at: "2026-10-23T13:00:00.000Z" },
		{
			kind: "transferido",
			actor: "Nexo Assist",
			team: "Suporte N2",
			at: "2026-10-28T13:05:00.000Z",
		},
	],
	...over,
});

export const panel = (
	over: Partial<TicketsPanelData> = {},
): TicketsPanelData => ({
	current: detail(),
	tickets: [
		ticket(),
		ticket({
			number: "REQ-10442",
			title: "Acesso à pasta Financeiro/2026",
			type: "REQ",
			status: "Em andamento",
			category: "Acesso",
		}),
		ticket({
			number: "INC-20519",
			title: "Impressora do 3º andar",
			status: "Aberto",
			category: "Impressora",
		}),
		ticket({
			number: "INC-19870",
			title: "VPN caindo",
			status: "Resolvido",
			category: "Rede",
		}),
		ticket({
			number: "REQ-10002",
			title: "Licença do Excel",
			type: "REQ",
			status: "Fechado",
			category: "Software",
		}),
		ticket({
			number: "INC-18000",
			title: "Mouse quebrado",
			status: "Resolvido",
			category: "Hardware",
		}),
	],
	open: 3,
	closed: 3,
	...over,
});
