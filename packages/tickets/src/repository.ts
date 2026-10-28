import type { Database } from "@nexo-assist/db";
import {
	kbArticle,
	profile,
	ticket,
	ticketCounter,
	ticketEvent,
	ticketNote,
	user,
} from "@nexo-assist/db/schema/index";
import { asc, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import type {
	Affected,
	Article,
	Category,
	EventKind,
	NewTicket,
	Priority,
	Status,
	Team,
	TicketType,
} from "./types";

export interface TicketRow {
	id: string;
	number: string;
	type: TicketType;
	title: string;
	description: string;
	category: Category;
	item: string | null;
	priority: Priority;
	affected: Affected;
	status: Status;
	requesterId: string;
	requesterName: string;
	assigneeId: string | null;
	openedAt: Date;
	updatedAt: Date;
	slaAnchorAt: Date;
	resolvedAt: Date | null;
}

export interface NoteRow {
	author: string;
	body: string;
	at: Date;
}

export interface EventRow {
	kind: EventKind;
	actor: string;
	summary: string | null;
	team: Team | null;
	at: Date;
}

export interface NewTicketRecord extends NewTicket {
	requesterId: string;
	now: Date;
	idempotencyKey: string;
}

/** Everything one service call writes to a ticket, applied in a single batch. */
export interface TicketChange {
	updatedAt: Date;
	status?: Status;
	assigneeId?: string | null;
	slaAnchorAt?: Date;
	resolvedAt?: Date | null;
	note?: { authorId: string; body: string };
	event?: { kind: EventKind; actorId: string; summary?: string; team?: Team };
}

export interface ProfileRow {
	userId: string;
	name: string;
	role: "employee" | "analyst";
	team: string | null;
	department: string | null;
	os: string | null;
}

const requester = alias(user, "requester");

const ticketColumns = {
	id: ticket.id,
	number: ticket.number,
	type: ticket.type,
	title: ticket.title,
	description: ticket.description,
	category: ticket.category,
	item: ticket.item,
	priority: ticket.priority,
	affected: ticket.affected,
	status: ticket.status,
	requesterId: ticket.requesterId,
	requesterName: requester.name,
	assigneeId: ticket.assigneeId,
	openedAt: ticket.openedAt,
	updatedAt: ticket.updatedAt,
	slaAnchorAt: ticket.slaAnchorAt,
	resolvedAt: ticket.resolvedAt,
};

export function createTicketRepository(db: Database) {
	// Values in these columns are only written by this repository after validation.
	const selectTickets = () =>
		db
			.select(ticketColumns)
			.from(ticket)
			.innerJoin(requester, eq(requester.id, ticket.requesterId))
			.$dynamic();
	const rows = async (query: ReturnType<typeof selectTickets>) =>
		(await query) as TicketRow[];
	const newest = [
		desc(ticket.updatedAt),
		desc(ticket.openedAt),
		desc(ticket.number),
	] as const;

	const findOne = async (where: ReturnType<typeof eq>) =>
		(await rows(selectTickets().where(where).limit(1)))[0];

	return {
		listByRequester(requesterId: string): Promise<TicketRow[]> {
			return rows(
				selectTickets()
					.where(eq(ticket.requesterId, requesterId))
					.orderBy(...newest),
			);
		},

		listAll(opts: { requesterId?: string } = {}): Promise<TicketRow[]> {
			const query = selectTickets();
			if (opts.requesterId)
				query.where(eq(ticket.requesterId, opts.requesterId));
			return rows(query.orderBy(...newest));
		},

		getByNumber(number: string): Promise<TicketRow | undefined> {
			return findOne(eq(ticket.number, number));
		},

		findByIdempotencyKey(key: string): Promise<TicketRow | undefined> {
			return findOne(eq(ticket.idempotencyKey, key));
		},

		async getHistory(
			ticketId: string,
		): Promise<{ notes: NoteRow[]; events: EventRow[] }> {
			const notes = await db
				.select({
					author: user.name,
					body: ticketNote.body,
					at: ticketNote.createdAt,
				})
				.from(ticketNote)
				.innerJoin(user, eq(user.id, ticketNote.authorId))
				.where(eq(ticketNote.ticketId, ticketId))
				.orderBy(asc(ticketNote.createdAt), asc(ticketNote.id));
			const events = await db
				.select({
					kind: ticketEvent.kind,
					actor: user.name,
					summary: ticketEvent.summary,
					team: ticketEvent.team,
					at: ticketEvent.createdAt,
				})
				.from(ticketEvent)
				.innerJoin(user, eq(user.id, ticketEvent.actorId))
				.where(eq(ticketEvent.ticketId, ticketId))
				.orderBy(asc(ticketEvent.createdAt), asc(ticketEvent.id));
			return { notes, events: events as EventRow[] };
		},

		/**
		 * Allocates the next number of the type and inserts the ticket in one D1 batch, which runs
		 * in order and rolls back as a whole: a repeated idempotency key fails the unique index and
		 * undoes the counter bump too (design.md › TicketRepository, TKT-11, TKT-12).
		 */
		async insertTicket(record: NewTicketRecord): Promise<TicketRow> {
			const existing = await this.findByIdempotencyKey(record.idempotencyKey);
			if (existing) return existing;

			const id = crypto.randomUUID();
			const { now, type } = record;
			try {
				await db.batch([
					db
						.insert(ticketCounter)
						.values({ type, value: 0 })
						.onConflictDoNothing(),
					db
						.update(ticketCounter)
						.set({ value: sql`${ticketCounter.value} + 1` })
						.where(eq(ticketCounter.type, type)),
					db.insert(ticket).values({
						id,
						number: sql`(select printf('%s-%05d', ${ticketCounter.type}, ${ticketCounter.value}) from ${ticketCounter} where ${ticketCounter.type} = ${type})`,
						type,
						title: record.title,
						description: record.description,
						category: record.category,
						item: record.item,
						priority: record.priority,
						affected: record.affected,
						status: "Aguardando analista",
						requesterId: record.requesterId,
						openedAt: now,
						updatedAt: now,
						slaAnchorAt: now,
						idempotencyKey: record.idempotencyKey,
					}),
					db.insert(ticketEvent).values({
						id: crypto.randomUUID(),
						ticketId: id,
						kind: "criado",
						actorId: record.requesterId,
						createdAt: now,
					}),
				]);
			} catch (error) {
				const raced = await this.findByIdempotencyKey(record.idempotencyKey);
				if (raced) return raced;
				throw error;
			}
			const created = await findOne(eq(ticket.id, id));
			if (!created) throw new Error(`ticket ${id} missing right after insert`);
			return created;
		},

		async applyChange(ticketId: string, change: TicketChange): Promise<void> {
			const { note, event, ...fields } = change;
			const at = change.updatedAt;
			await db.batch([
				db.update(ticket).set(fields).where(eq(ticket.id, ticketId)),
				...(note
					? [
							db.insert(ticketNote).values({
								id: crypto.randomUUID(),
								ticketId,
								...note,
								createdAt: at,
							}),
						]
					: []),
				...(event
					? [
							db.insert(ticketEvent).values({
								id: crypto.randomUUID(),
								ticketId,
								...event,
								createdAt: at,
							}),
						]
					: []),
			]);
		},

		async getProfile(userId: string): Promise<ProfileRow | undefined> {
			const [row] = await db
				.select({
					userId: profile.userId,
					name: user.name,
					role: profile.role,
					team: profile.team,
					department: profile.department,
					os: profile.os,
				})
				.from(profile)
				.innerJoin(user, eq(user.id, profile.userId))
				.where(eq(profile.userId, userId))
				.limit(1);
			return row;
		},

		listArticles(): Promise<Article[]> {
			return db
				.select({
					slug: kbArticle.slug,
					title: kbArticle.title,
					body: kbArticle.body,
					appliesWhen: kbArticle.appliesWhen,
					keywords: kbArticle.keywords,
				})
				.from(kbArticle)
				.orderBy(asc(kbArticle.slug));
		},
	};
}

export type TicketRepository = ReturnType<typeof createTicketRepository>;
