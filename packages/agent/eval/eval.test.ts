import { describe, expect, test } from "bun:test";

import { CONVERSATIONS } from "./conversations";
import { runEval } from "./run";

describe("evaluation", () => {
	test("eval set", async () => {
		expect(CONVERSATIONS.length).toBeGreaterThanOrEqual(22);
		const report = await runEval();
		const wrong = report.checks.filter((c) => !c.ok);
		expect(wrong).toEqual([]);
		expect(report.accuracy).toBeGreaterThanOrEqual(0.9);
		expect(report.byRule.length).toBeGreaterThanOrEqual(10);
	});

	test("pauses between conversations and reports tokens and cost per conversation", async () => {
		const pauses: number[] = [];
		const report = await runEval(undefined, {
			pauseMs: 250,
			sleep: async (ms) => {
				pauses.push(ms);
			},
		});
		expect(pauses).toEqual(Array(CONVERSATIONS.length - 1).fill(250));
		expect(report.usage).toEqual({
			inputTokens: 0,
			outputTokens: 0,
			costUsd: 0,
			costPerConversationUsd: 0,
		});
	});
});
