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
});
