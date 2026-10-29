import type { Understander } from "@nexo-assist/agent/understand";
import type { Database } from "@nexo-assist/db";
import { usageCounter } from "@nexo-assist/db/schema/index";
import { and, count, eq, gt, lt, sql } from "drizzle-orm";

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
 * Usage limits in D1, shared by every Worker isolate (DLV-13): messages per user in the last 60 s
 * (one row per message), and model calls per UTC day (one counter, reserved before each call).
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

	async function modelCallsToday(): Promise<number> {
		const [row] = await db
			.select({ count: usageCounter.count })
			.from(usageCounter)
			.where(eq(usageCounter.key, dayKey()));
		return Math.min(row?.count ?? 0, limits.dailyModelCalls);
	}

	async function messagesLastMinute(prefix: string): Promise<number> {
		const [row] = await db
			.select({ n: count() })
			.from(usageCounter)
			.where(
				and(
					sql`substr(${usageCounter.key}, 1, ${prefix.length}) = ${prefix}`,
					gt(usageCounter.expiresAt, now()),
				),
			);
		return row?.n ?? 0;
	}

	return {
		modelCallsToday,
		/** Records the message; false when the user sent the limit in the last 60 s or the day's budget is spent. */
		async admitMessage(userId: string): Promise<boolean> {
			await db.delete(usageCounter).where(lt(usageCounter.expiresAt, now()));
			if ((await modelCallsToday()) >= limits.dailyModelCalls) return false;
			const prefix = `msg:${userId}:`;
			if ((await messagesLastMinute(prefix)) >= limits.perMinute) return false;
			const t = now().getTime();
			await db.insert(usageCounter).values({
				key: `${prefix}${t}:${crypto.randomUUID()}`,
				count: 1,
				expiresAt: new Date(t + MINUTE),
			});
			return true;
		},
		/** Takes one model call from the day's budget; false (nothing taken) when it is spent. */
		async reserveModelCall(): Promise<boolean> {
			const t = now().getTime();
			const [row] = await db
				.insert(usageCounter)
				.values({
					key: dayKey(),
					count: 1,
					expiresAt: new Date(Math.floor(t / DAY) * DAY + DAY),
				})
				.onConflictDoUpdate({
					target: usageCounter.key,
					set: { count: sql`${usageCounter.count} + 1` },
				})
				.returning({ count: usageCounter.count });
			return (row?.count ?? 1) <= limits.dailyModelCalls;
		},
	};
}

/** The day's model budget is spent; shaped as a 429 so the agent answers "muitas solicitações" (AGT-47). */
export class DailyModelLimit extends Error {
	readonly status = 429;
	constructor() {
		super("daily model limit reached");
	}
}

/** The same understander; each call first reserves one from the day's budget (DLV-13). */
export function meter(
	understander: Understander,
	reserve: () => Promise<boolean>,
): Understander {
	return {
		understand: async (input) => {
			if (!(await reserve())) throw new DailyModelLimit();
			return understander.understand(input);
		},
		judge: async (input) => {
			if (!(await reserve())) throw new DailyModelLimit();
			return understander.judge(input);
		},
	};
}
