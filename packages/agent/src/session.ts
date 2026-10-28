import type { AgentInput } from "./engine";
import type { StoredMessage } from "./store";

/** Employee messages per conversation (AD-005, CHAT-22). */
export const MESSAGE_LIMIT = 30;
/** Longest message the chat accepts (CHAT-05). */
export const MAX_CHARS = 2000;

export type Admission = "ok" | "limit" | "too_long" | "empty";

/** Messages the employee wrote or picked; draft buttons leave a marker with no block and do not count. */
export function employeeCount(messages: readonly StoredMessage[]): number {
	return messages.filter((m) => m.role === "employee" && m.blocks.length > 0)
		.length;
}

const counts = (input: AgentInput) =>
	"text" in input || input.action === "option" || input.action === "select";

/** The server's own check, whatever the screen allows (CHAT-24). */
export function admit(
	messages: readonly StoredMessage[],
	input: AgentInput,
): Admission {
	if ("text" in input) {
		if (input.text.trim() === "") return "empty";
		if (input.text.length > MAX_CHARS) return "too_long";
	}
	if (counts(input) && employeeCount(messages) >= MESSAGE_LIMIT) return "limit";
	return "ok";
}
