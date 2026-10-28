import type { ConsoleFilter, ConsoleItem } from "@nexo-assist/agent/console";
import type {
	Block,
	DecisionRecord,
	MessageRole,
} from "@nexo-assist/agent/types";

export type ConsoleListItem = ConsoleItem & { assigneeName: string | null };

export interface ConsoleList {
	items: ConsoleListItem[];
	counts: Record<ConsoleFilter, number>;
	me: { name: string; team: string };
}

export interface ConsoleMessage {
	seq: number;
	role: MessageRole;
	text: string;
	blocks: Block[];
	decision: DecisionRecord | null;
	createdAt: string;
}

export interface ConsoleConversation {
	conversation: ConsoleListItem;
	messages: ConsoleMessage[];
}

/** A ticket as JSON: the service's dates arrive as ISO strings. */
export interface TicketJson {
	number: string;
	title: string;
	type: string;
	category: string;
	priority: string;
	status: string;
	openedAt: string;
	updatedAt: string;
	deadlineAt: string;
	vencido: boolean;
}

export interface TicketDetailJson extends TicketJson {
	description: string;
	notes: { author: string; body: string; at: string }[];
	events: {
		kind: string;
		actor: string;
		summary?: string;
		team?: string;
		at: string;
	}[];
}

export interface TicketsPanelData {
	current: TicketDetailJson | null;
	tickets: TicketJson[];
	open: number;
	closed: number;
}

export type ConsoleAction = "assume" | "reply" | "return" | "close";
export type ActionResult =
	| { ok: true }
	| { ok: false; error: string; message: string };

export interface ConsoleApi {
	list(): Promise<ConsoleList>;
	conversation(id: string): Promise<ConsoleConversation>;
	tickets(id: string): Promise<TicketsPanelData>;
	ticket(number: string): Promise<TicketDetailJson>;
	act(id: string, action: ConsoleAction, text?: string): Promise<ActionResult>;
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const FAILED = {
	ok: false,
	error: "NETWORK",
	message: "Não foi possível concluir. Tente de novo.",
} as const;

/** The browser client of `/console/*`; the session cookie goes with every call. */
export function createConsoleApi(
	base: string,
	fetchFn: Fetch = fetch,
): ConsoleApi {
	const get = async <T>(path: string): Promise<T> => {
		const res = await fetchFn(`${base}${path}`, { credentials: "include" });
		if (!res.ok) throw new Error(`${path}: ${res.status}`);
		return (await res.json()) as T;
	};
	return {
		list: () => get("/console/conversations"),
		conversation: (id) =>
			get(`/console/conversations/${encodeURIComponent(id)}`),
		tickets: (id) =>
			get(`/console/conversations/${encodeURIComponent(id)}/tickets`),
		ticket: (number) => get(`/console/tickets/${encodeURIComponent(number)}`),
		async act(id, action, text) {
			try {
				const res = await fetchFn(
					`${base}/console/conversations/${encodeURIComponent(id)}/${action}`,
					{
						method: "POST",
						credentials: "include",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(text === undefined ? {} : { text }),
					},
				);
				if (res.ok) return { ok: true };
				const body = (await res.json().catch(() => null)) as {
					error?: string;
					message?: string;
				} | null;
				return {
					ok: false,
					error: body?.error ?? String(res.status),
					message: body?.message ?? FAILED.message,
				};
			} catch {
				return FAILED;
			}
		},
	};
}
