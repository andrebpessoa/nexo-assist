import type { ConversationState } from "./types";

export type ConsoleAction = "assume" | "reply" | "return" | "close";
export type TransitionError = "TAKEN" | "NOT_YOURS" | "INVALID_TRANSITION";

export type TransitionResult =
	| {
			ok: true;
			state: ConversationState;
			assigneeId: string | null;
			/** False when the move leaves the conversation as it was (assume twice, reply). */
			changed: boolean;
	  }
	| { ok: false; code: TransitionError };

/**
 * The conversation state machine of the console (CON-23 to CON-29, design D-04). Pure: the server
 * applies the result with a conditional update, so a race still has one winner (CON-24).
 */
export function transition(
	conv: { state: ConversationState; assigneeId: string | null },
	action: ConsoleAction,
	me: string,
): TransitionResult {
	const mine = conv.state === "com_analista" && conv.assigneeId === me;
	const theirs = conv.state === "com_analista" && !mine;
	const invalid = { ok: false, code: "INVALID_TRANSITION" } as const;
	switch (action) {
		case "assume":
			if (mine)
				return {
					ok: true,
					state: "com_analista",
					assigneeId: me,
					changed: false,
				};
			if (theirs) return { ok: false, code: "TAKEN" };
			if (conv.state === "encerrada") return invalid;
			return { ok: true, state: "com_analista", assigneeId: me, changed: true };
		case "reply":
			if (mine)
				return {
					ok: true,
					state: "com_analista",
					assigneeId: me,
					changed: false,
				};
			return theirs ? { ok: false, code: "NOT_YOURS" } : invalid;
		case "return":
			if (mine || conv.state === "aguardando_analista")
				return { ok: true, state: "agent", assigneeId: null, changed: true };
			return theirs ? { ok: false, code: "NOT_YOURS" } : invalid;
		case "close":
			if (theirs) return { ok: false, code: "NOT_YOURS" };
			if (conv.state === "encerrada") return invalid;
			return {
				ok: true,
				state: "encerrada",
				assigneeId: conv.assigneeId,
				changed: true,
			};
	}
}
