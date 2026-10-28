import type { AgentInput, StepEvent } from "@nexo-assist/agent/engine";
import type {
	Block,
	ConversationState,
	DecisionRecord,
	MessageRole,
} from "@nexo-assist/agent/types";

import { readSse } from "./stream";

export interface ChatMessage {
	seq: number;
	role: MessageRole;
	blocks: Block[];
	decision: DecisionRecord | null;
	createdAt: string;
}

export interface ChatHistory {
	conversation: {
		id: string;
		state: ConversationState;
		/** What the server is holding for the next step, e.g. `ticket_draft`. */
		pending: string | null;
	};
	messages: ChatMessage[];
	count: number;
	limit: number;
	firstName: string;
	contactBy: string | null;
}

export type SendResult =
	| {
			kind: "done";
			blocks: Block[];
			decision: DecisionRecord | null;
			count: number;
			silent: boolean;
	  }
	| { kind: "interrupted"; partial: string }
	| { kind: "failed" }
	| { kind: "refused"; error: string; message: string };

export interface SendHandlers {
	onStep: (event: StepEvent) => void;
	onDelta: (text: string) => void;
}

export interface ChatApi {
	history(): Promise<ChatHistory>;
	send(input: AgentInput, on: SendHandlers): Promise<SendResult>;
	newConversation(): Promise<ChatHistory>;
	health(): Promise<boolean>;
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** The browser client of `/chat/*`; the session cookie goes with every call. */
export function createChatApi(base: string, fetchFn: Fetch = fetch): ChatApi {
	const url = (path: string) => `${base.replace(/\/$/, "")}${path}`;
	const json = async (path: string, init?: RequestInit) => {
		const res = await fetchFn(url(path), { credentials: "include", ...init });
		if (!res.ok) throw new Error(`chat ${path}: ${res.status}`);
		return (await res.json()) as ChatHistory;
	};
	return {
		history: () => json("/chat/history"),
		newConversation: () => json("/chat/new", { method: "POST" }),
		async health() {
			try {
				return (await fetchFn(url("/"), { cache: "no-store" })).ok;
			} catch {
				return false;
			}
		},
		async send(input, on) {
			let res: Response;
			try {
				res = await fetchFn(url("/chat/send"), {
					method: "POST",
					credentials: "include",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(input),
				});
			} catch {
				return { kind: "failed" };
			}
			if (res.status === 400 || res.status === 429) {
				const body = (await res.json().catch(() => ({}))) as {
					error?: string;
					message?: string;
				};
				return {
					kind: "refused",
					error: body.error ?? "invalid",
					message: body.message ?? "",
				};
			}
			if (!res.ok || !res.body) return { kind: "failed" };
			let partial = "";
			let done: SendResult | null = null;
			let broken = false;
			try {
				await readSse(res.body, (event, data) => {
					if (event === "step") on.onStep(data as StepEvent);
					else if (event === "delta") {
						const text = (data as { text: string }).text;
						partial += text;
						on.onDelta(text);
					} else if (event === "done")
						done = {
							kind: "done",
							...(data as Omit<Extract<SendResult, { kind: "done" }>, "kind">),
						};
					else if (event === "error") broken = true;
				});
			} catch {
				broken = true;
			}
			if (done && !broken) return done;
			return { kind: "interrupted", partial };
		},
	};
}
