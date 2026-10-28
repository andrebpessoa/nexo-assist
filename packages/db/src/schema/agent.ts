import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

/** One employee conversation with the agent; state and pending draft survive a restart (AGT-07). */
export const conversation = sqliteTable(
	"conversation",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		state: text("state", {
			enum: ["agent", "aguardando_analista", "com_analista", "encerrada"],
		}).notNull(),
		pending: text("pending", { mode: "json" }),
		summary: text("summary"),
		/** The analyst who assumed it (console-analista D-03). */
		assigneeId: text("assignee_id").references(() => user.id),
		/** Last message seq the console has read; unread = employee messages after it. */
		readSeq: integer("read_seq").notNull().default(0),
		createdAt: timestamp("created_at").notNull(),
		updatedAt: timestamp("updated_at").notNull(),
	},
	(table) => [index("conversation_user_idx").on(table.userId)],
);

/** Every message, with the blocks the chat draws and the decision record behind it (TRN-16). */
export const conversationMessage = sqliteTable(
	"conversation_message",
	{
		id: text("id").primaryKey(),
		conversationId: text("conversation_id")
			.notNull()
			.references(() => conversation.id, { onDelete: "cascade" }),
		seq: integer("seq").notNull(),
		role: text("role", {
			enum: ["employee", "agent", "analyst", "system"],
		}).notNull(),
		text: text("text").notNull(),
		blocks: text("blocks", { mode: "json" }).notNull(),
		decision: text("decision", { mode: "json" }),
		createdAt: timestamp("created_at").notNull(),
	},
	(table) => [
		uniqueIndex("conversation_message_seq_idx").on(
			table.conversationId,
			table.seq,
		),
	],
);
