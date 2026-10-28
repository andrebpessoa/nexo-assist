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
