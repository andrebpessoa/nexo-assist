import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Fixed-window counters for the deploy's usage limits (DLV-13): one row per key and window. */
export const usageCounter = sqliteTable("usage_counter", {
	key: text("key").primaryKey(),
	count: integer("count").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});
