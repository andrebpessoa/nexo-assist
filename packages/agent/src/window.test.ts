import { describe, expect, test } from "bun:test";

import type { StoredMessage } from "./store";
import { buildWindow, estimateCost, WINDOW_SIZE } from "./window";

const msg = (
	seq: number,
	role: StoredMessage["role"] = "employee",
): StoredMessage => ({
	seq,
	role,
	text: `mensagem ${seq}`,
	blocks: [],
	decision: null,
	createdAt: new Date(0),
});

describe("window", () => {
	test("window of twenty plus summary", () => {
		const short = buildWindow([msg(1), msg(2, "agent")], null);
		expect(short).toEqual({
			summary: null,
			messages: [
				{ role: "employee", text: "mensagem 1" },
				{ role: "agent", text: "mensagem 2" },
			],
		});
		const all = Array.from({ length: 25 }, (_, i) =>
			msg(i + 1, i % 2 ? "agent" : "employee"),
		);
		const long = buildWindow(all, "Ana falou da VPN.");
		expect(WINDOW_SIZE).toBe(20);
		expect(long.messages).toHaveLength(20);
		expect(long.messages[0]?.text).toBe("mensagem 6");
		expect(long.summary).toBe(
			"Ana falou da VPN. Antes: mensagem 1 | mensagem 3 | mensagem 5",
		);
		expect(buildWindow(all, null).summary).toBe(
			"Antes: mensagem 1 | mensagem 3 | mensagem 5",
		);

		const cost = estimateCost(
			{ inputTokens: 1_000_000, outputTokens: 1_000_000 },
			"google/gemini-2.5-flash-lite",
		);
		expect(cost).toEqual({
			inputTokens: 1_000_000,
			outputTokens: 1_000_000,
			costUsd: 0.5,
		});
		expect(
			estimateCost(
				{ inputTokens: 1_000_000, outputTokens: 1_000_000 },
				"google/gemini-3.5-flash-lite",
			).costUsd,
		).toBe(2.8);
		expect(
			estimateCost({ inputTokens: 10, outputTokens: 10 }, "outro/modelo")
				.costUsd,
		).toBe(0);
	});
});
