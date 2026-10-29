import { agentHarness } from "../src/testing";
import type { Understander } from "../src/understand";
import {
	CONVERSATIONS,
	type EvalConversation,
	type Expected,
} from "./conversations";

interface CheckResult {
	conversation: string;
	step: number;
	field: keyof Expected;
	expected: string;
	got: string | null;
	ok: boolean;
}

export interface EvalUsage {
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	costPerConversationUsd: number;
}

export interface EvalReport {
	conversations: number;
	checks: CheckResult[];
	byRule: { rule: string; passed: number; total: number }[];
	accuracy: number;
	usage: EvalUsage;
}

type Tokens = { inputTokens: number; outputTokens: number; costUsd: number };

/** Totals and the cost per conversation the README quotes, rounded to a millionth of a dollar. */
export function usageOf(tokens: Tokens, conversations: number): EvalUsage {
	return {
		...tokens,
		costUsd: Math.round(tokens.costUsd * 1e6) / 1e6,
		costPerConversationUsd:
			Math.round((tokens.costUsd / conversations) * 1e6) / 1e6,
	};
}

async function runOne(
	conversation: EvalConversation,
	understander: (() => Understander) | undefined,
	tokens: Tokens,
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
		const used = turn.decision?.usage;
		if (used) {
			tokens.inputTokens += used.inputTokens;
			tokens.outputTokens += used.outputTokens;
			tokens.costUsd += used.costUsd;
		}
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

/** The ids after `--only` (`--only a,b` or `--only=a,b`), each once; `null` without the flag. */
export function onlyArg(argv: string[]): string[] | null {
	const at = argv.findIndex((a) => a === "--only" || a.startsWith("--only="));
	if (at < 0) return null;
	const flag = argv[at] as string;
	const value = flag.includes("=") ? flag.slice(7) : (argv[at + 1] ?? "");
	return [
		...new Set(
			value
				.split(",")
				.map((id) => id.trim())
				.filter(Boolean),
		),
	];
}

/** The conversations `--only` names, in the order given; every one without it. */
export function selectConversations(
	only: string[] | null,
):
	| { ok: true; conversations: EvalConversation[] }
	| { ok: false; unknown: string[] } {
	if (!only) return { ok: true, conversations: CONVERSATIONS };
	const ids = [...new Set(only)];
	// `--only` with no id is a mistake, not a run of zero conversations.
	if (!ids.length) return { ok: false, unknown: [] };
	const unknown = ids.filter((id) => !CONVERSATIONS.some((c) => c.id === id));
	if (unknown.length) return { ok: false, unknown };
	return {
		ok: true,
		conversations: ids.map(
			(id) => CONVERSATIONS.find((c) => c.id === id) as EvalConversation,
		),
	};
}

/** Only a full live run is recorded in RESULT.md; a partial one would hide the others. */
export function writesResult({
	live,
	only,
}: {
	live: boolean;
	only: string[] | null;
}): boolean {
	return live && only === null;
}

/**
 * Runs every conversation (or the ones given); `understander` builds a real model per conversation for `--live`.
 * `pauseMs` waits between conversations so a free tier's per-minute limit holds.
 */
export async function runEval(
	understander?: () => Understander,
	{
		pauseMs = 0,
		sleep = (ms: number) => Bun.sleep(ms),
		conversations = CONVERSATIONS,
	}: {
		pauseMs?: number;
		sleep?: (ms: number) => Promise<void>;
		conversations?: EvalConversation[];
	} = {},
): Promise<EvalReport> {
	const checks: CheckResult[] = [];
	const rules = new Map<string, { passed: number; total: number }>();
	const tokens: Tokens = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
	for (const [index, conversation] of conversations.entries()) {
		if (index > 0 && pauseMs > 0) await sleep(pauseMs);
		const results = await runOne(conversation, understander, tokens);
		checks.push(...results);
		const tally = rules.get(conversation.rule) ?? { passed: 0, total: 0 };
		tally.total += results.length;
		tally.passed += results.filter((r) => r.ok).length;
		rules.set(conversation.rule, tally);
	}
	const passed = checks.filter((c) => c.ok).length;
	return {
		conversations: conversations.length,
		checks,
		byRule: [...rules].map(([rule, t]) => ({ rule, ...t })),
		accuracy: checks.length ? passed / checks.length : 0,
		usage: usageOf(tokens, conversations.length),
	};
}
