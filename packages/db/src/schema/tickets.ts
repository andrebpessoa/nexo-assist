import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

/** 1:1 with Better Auth's `user`, so the generated auth schema stays untouched (AD-015). */
export const profile = sqliteTable("profile", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	role: text("role", { enum: ["employee", "analyst"] }).notNull(),
	department: text("department"),
	os: text("os"),
	team: text("team"),
	passwordChangedAt: timestamp("password_changed_at"),
});

export const ticket = sqliteTable(
	"ticket",
	{
		id: text("id").primaryKey(),
		number: text("number").notNull(),
		type: text("type").notNull(),
		title: text("title").notNull(),
		description: text("description").notNull(),
		category: text("category").notNull(),
		item: text("item"),
		priority: text("priority").notNull(),
		affected: text("affected").notNull(),
		status: text("status").notNull(),
		requesterId: text("requester_id")
			.notNull()
			.references(() => user.id),
		assigneeId: text("assignee_id").references(() => user.id),
		openedAt: timestamp("opened_at").notNull(),
		updatedAt: timestamp("updated_at").notNull(),
		/** Last update by the team; the deadline is computed from it on every read (TKT-20, TKT-21). */
		slaAnchorAt: timestamp("sla_anchor_at").notNull(),
		resolvedAt: timestamp("resolved_at"),
		idempotencyKey: text("idempotency_key"),
	},
	(table) => [
		uniqueIndex("ticket_number_unique").on(table.number),
		uniqueIndex("ticket_idempotency_key_unique").on(table.idempotencyKey),
		index("ticket_requester_updated_idx").on(
			table.requesterId,
			table.updatedAt,
		),
	],
);

export const ticketNote = sqliteTable(
	"ticket_note",
	{
		id: text("id").primaryKey(),
		ticketId: text("ticket_id")
			.notNull()
			.references(() => ticket.id, { onDelete: "cascade" }),
		authorId: text("author_id")
			.notNull()
			.references(() => user.id),
		body: text("body").notNull(),
		createdAt: timestamp("created_at").notNull(),
	},
	(table) => [index("ticket_note_ticket_idx").on(table.ticketId)],
);

export const ticketEvent = sqliteTable(
	"ticket_event",
	{
		id: text("id").primaryKey(),
		ticketId: text("ticket_id")
			.notNull()
			.references(() => ticket.id, { onDelete: "cascade" }),
		kind: text("kind").notNull(),
		actorId: text("actor_id")
			.notNull()
			.references(() => user.id),
		summary: text("summary"),
		team: text("team"),
		createdAt: timestamp("created_at").notNull(),
	},
	(table) => [index("ticket_event_ticket_idx").on(table.ticketId)],
);

/** Next number per ticket type; bumped in the same batch as the insert (design.md › TicketRepository). */
export const ticketCounter = sqliteTable("ticket_counter", {
	type: text("type").primaryKey(),
	value: integer("value").notNull(),
});

export const kbArticle = sqliteTable("kb_article", {
	slug: text("slug").primaryKey(),
	title: text("title").notNull(),
	body: text("body").notNull(),
	appliesWhen: text("applies_when").notNull(),
	keywords: text("keywords", { mode: "json" }).$type<string[]>().notNull(),
});
