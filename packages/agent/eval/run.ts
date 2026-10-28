import { agentHarness } from "../src/testing";
import type { Understander } from "../src/understand";
import {
	CONVERSATIONS,
	type EvalConversation,
	type Expected,
} from "./conversations";

export interface CheckResult {
	conversation: string;
	step: number;
	field: keyof Expected;
	expected: string;
	got: string | null;
	ok: boolean;
}

export interface EvalReport {
	conversations: number;
	checks: CheckResult[];
	byRule: { rule: string; passed: number; total: number }[];
	accuracy: number;
}

async function runOne(
	conversation: EvalConversation,
	understander?: () => Understander,
): Promise<CheckResult[]> {
	const turns = conversation.steps.flatMap((s) =>
		s.scripted ? [s.scripted] : [],
	);
	const h = await agentHarness({
		turns,
		understander: understander?.(),
	});
	const userId = h.ids[conversation.user] as string;
	const results: CheckResult[] = [];
	for (const [index, step] of conversation.steps.entries()) {
		const turn = await h.agent.send(userId, step.send);
		const draft = turn.blocks.find((b) => b.kind === "ticket_draft");
		const got: Record<keyof Expected, string | null> = {
			intent: turn.decision?.intent ?? null,
			action: turn.decision?.action ?? null,
			type: draft?.kind === "ticket_draft" ? draft.draft.type : null,
			category: draft?.kind === "ticket_draft" ? draft.draft.category : null,
			priority: draft?.kind === "ticket_draft" ? draft.draft.priority : null,
		};
		for (const [field, expected] of Object.entries(step.expect) as [
			keyof Expected,
			string,
		][])
			results.push({
				conversation: conversation.id,
				step: index + 1,
				field,
				expected,
				got: got[field],
				ok: got[field] === expected,
			});
	}
	return results;
}

/** Runs every conversation; `understander` builds a real model per conversation for `--live`. */
export async function runEval(
	understander?: () => Understander,
): Promise<EvalReport> {
	const checks: CheckResult[] = [];
	const rules = new Map<string, { passed: number; total: number }>();
	for (const conversation of CONVERSATIONS) {
		const results = await runOne(conversation, understander);
		checks.push(...results);
		const tally = rules.get(conversation.rule) ?? { passed: 0, total: 0 };
		tally.total += results.length;
		tally.passed += results.filter((r) => r.ok).length;
		rules.set(conversation.rule, tally);
	}
	const passed = checks.filter((c) => c.ok).length;
	return {
		conversations: CONVERSATIONS.length,
		checks,
		byRule: [...rules].map(([rule, t]) => ({ rule, ...t })),
		accuracy: checks.length ? passed / checks.length : 0,
	};
}
