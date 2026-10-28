import {
	emptyJudgement,
	emptyUnderstanding,
	type Judgement,
	type Understander,
	type Understanding,
} from "./understand";

export interface ScriptedTurn {
	understanding?: Partial<Omit<Understanding, "fields">> & {
		fields?: Partial<Understanding["fields"]>;
	};
	judgement?: Partial<Judgement>;
}

/**
 * Plays back what a model would have understood, one turn per employee message. Tests and the
 * scripted evaluation use it so the rules are measured without a network (D-03).
 */
export function createScriptedUnderstander(
	turns: ScriptedTurn[],
): Understander & {
	calls: { understand: number; judge: number };
	push(turn: ScriptedTurn): void;
} {
	const queue = [...turns];
	let current: ScriptedTurn | undefined;
	const calls = { understand: 0, judge: 0 };
	return {
		calls,
		push(turn) {
			queue.push(turn);
		},
		async understand() {
			calls.understand++;
			current = queue.shift();
			if (!current) throw new Error("scripted understander: no turn left");
			const base = emptyUnderstanding();
			const u = current.understanding ?? {};
			return {
				understanding: {
					...base,
					...u,
					fields: { ...base.fields, ...u.fields },
				},
				usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
			};
		},
		async judge() {
			calls.judge++;
			return {
				judgement: { ...emptyJudgement(), ...current?.judgement },
				usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
			};
		},
	};
}
