import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@libsql/client";
import type { Database } from "@nexo-assist/db";
import { relations } from "@nexo-assist/db/relations";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const migrationsFolder = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../../db/src/migrations",
);

/**
 * In-memory SQLite (libsql) with the real migrations applied (AD-014). Typed as the D1 `Database`
 * because both are async SQLite drivers with the same query builder and `batch`; the D1 smoke test
 * covers what could differ.
 */
export async function createTestDb(): Promise<Database> {
	const client = createClient({ url: ":memory:" });
	const db = drizzle({ client, relations });
	await migrate(db, { migrationsFolder });
	return db as unknown as Database;
}
