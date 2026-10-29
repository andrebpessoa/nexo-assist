import type { Understander } from "@nexo-assist/agent/understand";
import type { Database } from "@nexo-assist/db";
import { usageCounter } from "@nexo-assist/db/schema/index";
import { eq, lt, sql } from "drizzle-orm";

export interface UsageLimits {
	perMinute: number;
	dailyModelCalls: number;
}

export interface UsageEnv {
	RATE_LIMIT_PER_MINUTE?: string;
	LLM_DAILY_LIMIT?: string;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function positiveInt(value: string | undefined, fallback: number): number {
	const n = Number(value?.trim() || Number.NaN);
	return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** 10 messages per user per minute and 400 model calls per day unless the env says otherwise. */
export function limitsFrom(env: UsageEnv): UsageLimits {
	return {
		perMinute: positiveInt(env.RATE_LIMIT_PER_MINUTE, 10),
		dailyModelCalls: positiveInt(env.LLM_DAILY_LIMIT, 400),
	};
}

/**
 * Fixed-window counters in D1, shared by every Worker isolate (DLV-13): messages per user per
 * minute, and model calls per UTC day.
 */
export function createUsageLimiter({
	db,
	limits,
	now = () => new Date(),
}: {
	db: Database;
	limits: UsageLimits;
	now?: () => Date;
}) {
	const dayKey = () => `model:${now().toISOString().slice(0, 10)}`;

	async function bump(key: string, windowMs: number): Promise<number> {
		const t = now().getTime();
		const expiresAt = new Date(Math.floor(t / windowMs) * windowMs + windowMs);
		const [row] = await db
			.insert(usageCounter)
			.values({ key, count: 1, expiresAt })
			.onConflictDoUpdate({
				target: usageCounter.key,
				set: { count: sql`${usageCounter.count} + 1` },
			})
			.returning({ count: usageCounter.count });
		return row?.count ?? 1;
	}

	async function modelCallsToday(): Promise<number> {
		const [row] = await db
			.select({ count: usageCounter.count })
			.from(usageCounter)
			.where(eq(usageCounter.key, dayKey()));
		return row?.count ?? 0;
	}

	return {
		modelCallsToday,
		/** Counts the message; false when the user is over the minute or the day's budget is spent. */
		async admitMessage(userId: string): Promise<boolean> {
			await db.delete(usageCounter).where(lt(usageCounter.expiresAt, now()));
			if ((await modelCallsToday()) >= limits.dailyModelCalls) return false;
			const minute = Math.floor(now().getTime() / MINUTE);
			const count = await bump(`msg:${userId}:${minute}`, MINUTE);
			return count <= limits.perMinute;
		},
		countModelCall: async (): Promise<void> => {
			await bump(dayKey(), DAY);
		},
	};
}

/** The same understander, counting each call to the model. */
export function meter(
	understander: Understander,
	count: () => Promise<void>,
): Understander {
	return {
		understand: async (input) => {
			await count();
			return understander.understand(input);
		},
		judge: async (input) => {
			await count();
			return understander.judge(input);
		},
	};
}
