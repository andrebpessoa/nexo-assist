import { describe, expect, test } from "bun:test";
import type { Result } from "@nexo-assist/tickets";
import { withModelLimits, withTicketRetry } from "./retry";

const down: Result<number> = {
	ok: false,
	error: { code: "SERVICE_UNAVAILABLE", message: "fora" },
};
const never = () => new Promise<void>(() => {});

describe("retry", () => {
	test("service unavailable retries", async () => {
		const waits: number[] = [];
		const keys: string[] = [];
		const sleep = async (ms: number) => {
			waits.push(ms);
		};
		let calls = 0;
		const ok = await withTicketRetry(async () => {
			keys.push("key-1");
			calls++;
			return calls < 3 ? down : { ok: true, value: 7 };
		}, sleep);
		expect(ok).toEqual({ result: { ok: true, value: 7 }, attempts: 3 });
		expect(waits).toEqual([500, 1000]);

		waits.length = 0;
		calls = 0;
		const failed = await withTicketRetry(async () => {
			calls++;
			return down;
		}, sleep);
		expect(failed.result).toEqual(down);
		expect(failed.attempts).toBe(4);
		expect(waits).toEqual([500, 1000, 2000]);

		calls = 0;
		const notFound = await withTicketRetry(async () => {
			calls++;
			return {
				ok: false,
				error: { code: "NOT_FOUND", message: "x" },
			} as Result<number>;
		}, sleep);
		expect(calls).toBe(1);
		expect(notFound.attempts).toBe(1);
	});

	test("rate limit waits and retries once", async () => {
		const waits: number[] = [];
		const sleep = async (ms: number) => {
			waits.push(ms);
		};
		let calls = 0;
		const limited = Object.assign(new Error("quota"), { statusCode: 429 });
		const later = await withModelLimits(
			async () => {
				calls++;
				if (calls === 1) throw limited;
				return "ok";
			},
			{ sleep, timer: never },
		);
		expect(later).toEqual({ ok: true, value: "ok", attempts: 2 });
		expect(waits).toEqual([2000]);

		waits.length = 0;
		calls = 0;
		const hinted = Object.assign(new Error("quota"), {
			statusCode: 429,
			responseHeaders: { "retry-after": "5" },
		});
		const still = await withModelLimits(
			async () => {
				calls++;
				throw hinted;
			},
			{ sleep, timer: never },
		);
		expect(still).toEqual({ ok: false, reason: "rate_limited", attempts: 2 });
		expect(waits).toEqual([5000]);

		waits.length = 0;
		calls = 0;
		const wrapped = new Error("agent stream", { cause: limited });
		const unwrapped = await withModelLimits(
			async () => {
				calls++;
				if (calls === 1) throw wrapped;
				return "ok";
			},
			{ sleep, timer: never },
		);
		expect(unwrapped).toEqual({ ok: true, value: "ok", attempts: 2 });
	});

	test("model failure and timeout", async () => {
		const sleep = async () => {};
		const failed = await withModelLimits(
			async () => {
				throw new Error("boom");
			},
			{ sleep, timer: never },
		);
		expect(failed).toEqual({ ok: false, reason: "failed", attempts: 1 });
		const timers: number[] = [];
		const slow = await withModelLimits(() => new Promise<string>(() => {}), {
			sleep,
			timer: async (ms) => {
				timers.push(ms);
			},
		});
		expect(slow).toEqual({ ok: false, reason: "timeout", attempts: 1 });
		expect(timers).toEqual([30_000]);
	});
});
