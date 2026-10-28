import type { TicketDraft, TicketView } from "@nexo-assist/agent/types";

/** The draft of capture 02 (D-381). */
export const draft: TicketDraft = {
	title: "VPN não conecta no notebook — erro 809",
	description:
		"Desde 20/10 o notebook (Windows 11) não conecta na VPN e mostra o erro 809. Precisa dela para a reunião das 14h.",
	type: "INC",
	category: "Rede e VPN",
	item: null,
	affected: "Só eu",
	priority: "Alta",
	priorityReason:
		"Impede uma pessoa de trabalhar e há compromisso no mesmo dia.",
	deadlineAt: "2026-10-28T16:43:00.000Z",
	blocksWork: true,
	sameDayCommitment: true,
	workaround: false,
};

/** INC-20311 of capture 03, overdue. */
export const ticket: TicketView = {
	number: "INC-20311",
	title: "Notebook lento após atualização",
	type: "INC",
	category: "Hardware",
	priority: "Média",
	status: "Aguardando analista",
	openedAt: "2026-10-16T17:20:00.000Z",
	updatedAt: "2026-10-23T13:00:00.000Z",
	deadlineAt: "2026-10-21T17:20:00.000Z",
	vencido: true,
	atrasoMinutos: 7200,
};
