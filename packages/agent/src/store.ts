import type { Database } from "@nexo-assist/db";
import {
	conversation,
	conversationMessage,
} from "@nexo-assist/db/schema/index";
import type { Clock } from "@nexo-assist/tickets";
import { asc, desc, eq, max } from "drizzle-orm";

import type {
	Block,
	ConversationState,
	DecisionRecord,
	MessageRole,
	Pending,
} from "./types";

export interface Conversation {
	id: string;
	userId: string;
	state: ConversationState;
	pending: Pending | null;
	summary: string | null;
}

export interface StoredMessage {
	seq: number;
	role: MessageRole;
	text: string;
	blocks: Block[];
	decision: DecisionRecord | null;
	createdAt: Date;
}

export type NewMessage = Omit<StoredMessage, "seq" | "createdAt">;

export interface ConversationStore {
	/** The user's latest conversation, or a new one. */
	open(userId: string): Promise<Conversation>;
	get(id: string): Promise<Conversation | null>;
	append(id: string, message: NewMessage): Promise<StoredMessage>;
	update(
		id: string,
		patch: Partial<Pick<Conversation, "state" | "pending" | "summary">>,
	): Promise<void>;
	messages(id: string): Promise<StoredMessage[]>;
}

type Row = typeof conversation.$inferSelect;
const toConversation = (row: Row): Conversation => ({
	id: row.id,
	userId: row.userId,
	state: row.state,
	pending: (row.pending as Pending | null) ?? null,
	summary: row.summary,
});

export function createConversationStore({
	db,
	clock = { now: () => new Date() },
	newId = () => crypto.randomUUID(),
}: {
	db: Database;
	clock?: Clock;
	newId?: () => string;
}): ConversationStore {
	const get = async (id: string) => {
		const [row] = await db
			.select()
			.from(conversation)
			.where(eq(conversation.id, id));
		return row ? toConversation(row) : null;
	};
	return {
		async open(userId) {
			const [row] = await db
				.select()
				.from(conversation)
				.where(eq(conversation.userId, userId))
				.orderBy(desc(conversation.createdAt))
				.limit(1);
			if (row) return toConversation(row);
			const now = clock.now();
			const id = newId();
			await db.insert(conversation).values({
				id,
				userId,
				state: "agent",
				pending: null,
				summary: null,
				createdAt: now,
				updatedAt: now,
			});
			return { id, userId, state: "agent", pending: null, summary: null };
		},
		get,
		async append(id, message) {
			const [last] = await db
				.select({ seq: max(conversationMessage.seq) })
				.from(conversationMessage)
				.where(eq(conversationMessage.conversationId, id));
			const seq = (last?.seq ?? 0) + 1;
			const createdAt = clock.now();
			await db.insert(conversationMessage).values({
				id: newId(),
				conversationId: id,
				seq,
				role: message.role,
				text: message.text,
				blocks: message.blocks,
				decision: message.decision,
				createdAt,
			});
			await db
				.update(conversation)
				.set({ updatedAt: createdAt })
				.where(eq(conversation.id, id));
			return { ...message, seq, createdAt };
		},
		async update(id, patch) {
			await db
				.update(conversation)
				.set({ ...patch, updatedAt: clock.now() })
				.where(eq(conversation.id, id));
		},
		async messages(id) {
			const rows = await db
				.select()
				.from(conversationMessage)
				.where(eq(conversationMessage.conversationId, id))
				.orderBy(asc(conversationMessage.seq));
			return rows.map((row) => ({
				seq: row.seq,
				role: row.role,
				text: row.text,
				blocks: row.blocks as Block[],
				decision: (row.decision as DecisionRecord | null) ?? null,
				createdAt: row.createdAt,
			}));
		},
	};
}
