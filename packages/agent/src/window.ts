import type { StoredMessage } from "./store";
import type { MessageRole, Usage } from "./types";

/** The model sees the last 20 messages plus a summary of the earlier ones (AGT-46). */
export const WINDOW_SIZE = 20;
const SUMMARY_LIMIT = 600;

export interface ModelWindow {
	summary: string | null;
	messages: { role: MessageRole; text: string }[];
}

/** The summary of what fell out of the window is built in code: no extra model call per turn. */
export function buildWindow(
	messages: StoredMessage[],
	summary: string | null,
): ModelWindow {
	const kept = messages.slice(-WINDOW_SIZE);
	const dropped = messages.slice(0, -WINDOW_SIZE);
	const earlier = dropped
		.filter((m) => m.role === "employee" || m.role === "analyst")
		.map((m) => m.text)
		.join(" | ");
	const parts = [summary, earlier ? `Antes: ${earlier}` : null].filter(Boolean);
	return {
		summary: parts.length ? parts.join(" ").slice(0, SUMMARY_LIMIT) : null,
		messages: kept.map((m) => ({ role: m.role, text: m.text })),
	};
}

/** US$ per million tokens on the paid tier; the free tier costs 0 but the log keeps the equivalent. */
const PRICES: Record<string, { input: number; output: number }> = {
	"google/gemini-3.5-flash-lite": { input: 0.3, output: 2.5 },
	"google/gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
	"google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
};

export function estimateCost(
	usage: { inputTokens: number; outputTokens: number },
	model: string,
): Usage {
	const price = PRICES[model];
	const costUsd = price
		? (usage.inputTokens * price.input + usage.outputTokens * price.output) /
			1_000_000
		: 0;
	return { ...usage, costUsd: Math.round(costUsd * 1e6) / 1e6 };
}
