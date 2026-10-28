import type { Database } from "@nexo-assist/db";
import { user } from "@nexo-assist/db/schema/index";
import { applySeed } from "@nexo-assist/tickets/seed/apply";
import { buildSeed } from "@nexo-assist/tickets/seed/build";
import { createTestDb } from "@nexo-assist/tickets/testing/db";

export const SEED_NOW = new Date("2026-10-28T10:00:00-03:00");

/** In-memory database with the seed applied; ids by e-mail prefix (`ana`, `bruno`, `rafael`). */
export async function seededDb(now: Date = SEED_NOW): Promise<{
	db: Database;
	ids: Record<string, string>;
}> {
	const db = await createTestDb();
	await applySeed(db, buildSeed(now));
	const users = await db.select({ id: user.id, email: user.email }).from(user);
	const ids = Object.fromEntries(
		users.map((u) => [u.email.split(".")[0] as string, u.id]),
	);
	return { db, ids };
}
