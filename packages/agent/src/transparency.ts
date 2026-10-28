/**
 * Turns a saved decision into what the chat and the console show (transparencia). Imports only
 * types, so the web can use it without pulling the model SDK.
 */
import type { DecisionRecord } from "./types";

/** The log line of one decision: ids, codes and numbers, never message text (TRN-17). */
export function decisionLog(conversationId: string, d: DecisionRecord) {
	return {
		event: "agent.decision",
		conversationId,
		intent: d.intent,
		confidence: d.confidence,
		action: d.action,
		rule: d.rule,
		tools: d.tools.map((t) => ({
			name: t.name,
			ok: t.ok,
			attempts: t.attempts,
			durationMs: t.durationMs ?? null,
			error: t.error ?? null,
		})),
		latencyMs: d.latencyMs ?? null,
		model: d.model ?? null,
		usage: d.usage ?? null,
		transfer: d.transfer?.trigger ?? null,
		incomplete: d.incomplete ?? false,
	};
}
