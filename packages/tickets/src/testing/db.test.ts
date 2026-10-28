import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { createTestDb } from "./db";

describe("createTestDb", () => {
	test("applies the migrations, including the 6 ticket tables", async () => {
		const db = await createTestDb();
		const rows = await db.all<{ name: string }>(
			sql`select name from sqlite_master where type = 'table'`,
		);
		const tables = rows.map((row) => row.name);
		for (const table of [
			"profile",
			"ticket",
			"ticket_note",
			"ticket_event",
			"ticket_counter",
			"kb_article",
			"user",
		]) {
			expect(tables).toContain(table);
		}
	});

	test("each call gets an empty, isolated database", async () => {
		const first = await createTestDb();
		await first.run(
			sql`insert into ticket_counter (type, value) values ('INC', 1)`,
		);
		const second = await createTestDb();
		expect(await second.all(sql`select * from ticket_counter`)).toEqual([]);
	});
});
