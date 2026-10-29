import { describe, expect, test } from "bun:test";

import { agentHarness } from "@nexo-assist/agent/testing";
import type { Understander } from "@nexo-assist/agent/understand";
import { createTestDb } from "@nexo-assist/tickets/testing/db";
import { Hono } from "hono";

import { createChatRoutes } from "./chat";
import { createUsageLimiter, limitsFrom, meter } from "./usage";

const LIMITED = "Limite de uso atingido. Tente mais tarde.";

/** A clock the test moves by hand. */
function clockAt(iso: string) {
	let t = new Date(iso).getTime();
	return {
		now: () => new Date(t),
		advance: (ms: number) => {
			t += ms;
		},
	};
}

async function limiterAt(
	iso: string,
	limits = { perMinute: 10, dailyModelCalls: 400 },
) {
	const db = await createTestDb();
	const clock = clockAt(iso);
	return {
		clock,
		limiter: createUsageLimiter({ db, limits, now: clock.now }),
	};
}

describe("limits from env (DLV-13)", () => {
	test("defaults are 10 messages per minute and 400 model calls per day", () => {
		expect(limitsFrom({})).toEqual({ perMinute: 10, dailyModelCalls: 400 });
		expect(
			limitsFrom({ RATE_LIMIT_PER_MINUTE: "", LLM_DAILY_LIMIT: " " }),
		).toEqual({ perMinute: 10, dailyModelCalls: 400 });
	});

	test("env values replace the defaults", () => {
		expect(
			limitsFrom({ RATE_LIMIT_PER_MINUTE: "3", LLM_DAILY_LIMIT: "50" }),
		).toEqual({ perMinute: 3, dailyModelCalls: 50 });
	});
});

describe("messages per user per minute (DLV-13)", () => {
	test("the 11th message in the same minute is refused; another user still passes", async () => {
		const { limiter } = await limiterAt("2026-10-29T12:00:05Z");
		for (let i = 0; i < 10; i++)
			expect(await limiter.admitMessage("ana")).toBe(true);
		expect(await limiter.admitMessage("ana")).toBe(false);
		expect(await limiter.admitMessage("bruno")).toBe(true);
	});

	test("the next minute passes again", async () => {
		const { limiter, clock } = await limiterAt("2026-10-29T12:00:50Z");
		for (let i = 0; i < 10; i++) await limiter.admitMessage("ana");
		expect(await limiter.admitMessage("ana")).toBe(false);
		clock.advance(10_000);
		expect(await limiter.admitMessage("ana")).toBe(true);
	});
});

describe("model calls per day (DLV-13)", () => {
	test("each understand and judge call counts one", async () => {
		const { limiter } = await limiterAt("2026-10-29T12:00:00Z");
		const fake = {
			understand: async () => ({ understanding: {} }),
			judge: async () => ({ judgement: {} }),
		} as unknown as Understander;
		const metered = meter(fake, limiter.countModelCall);
		await metered.understand({} as never);
		await metered.judge({} as never);
		await metered.understand({} as never);
		expect(await limiter.modelCallsToday()).toBe(3);
	});

	test("with the daily cap reached every message is refused; the next day passes", async () => {
		const { limiter, clock } = await limiterAt("2026-10-29T23:59:00Z", {
			perMinute: 10,
			dailyModelCalls: 2,
		});
		expect(await limiter.admitMessage("ana")).toBe(true);
		await limiter.countModelCall();
		await limiter.countModelCall();
		expect(await limiter.admitMessage("bruno")).toBe(false);
		clock.advance(2 * 60_000);
		expect(await limiter.admitMessage("bruno")).toBe(true);
	});
});

describe("/chat/send under the limit (DLV-13)", () => {
	async function app(admitUsage: (userId: string) => Promise<boolean>) {
		const h = await agentHarness();
		return new Hono().route(
			"/",
			createChatRoutes({
				wordDelayMs: 0,
				admitUsage,
				resolve: async () => ({
					ok: true,
					userId: h.ana,
					firstName: "Ana",
					agentFor: () => h.agent,
				}),
			}),
		);
	}
	const send = (a: Hono) =>
		a.request("/chat/send", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ text: "oi" }),
		});

	test("a refused message answers 429 with the usage message", async () => {
		const res = await send(await app(async () => false));
		expect(res.status).toBe(429);
		expect(await res.json()).toEqual({
			error: "rate_limit",
			message: LIMITED,
		});
	});

	test("an admitted message streams the answer", async () => {
		const seen: string[] = [];
		const res = await send(
			await app(async (userId) => {
				seen.push(userId);
				return true;
			}),
		);
		expect(res.status).toBe(200);
		expect(await res.text()).toContain("event: done");
		expect(seen).toHaveLength(1);
	});
});
