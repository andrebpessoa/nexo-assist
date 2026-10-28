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
import { count, inArray, sql } from "drizzle-orm";

import type { SeedData } from "./build";

export interface SeedCounts {
	users: number;
	profiles: number;
	articles: number;
	tickets: number;
	notes: number;
	events: number;
}

type Statement = Parameters<Database["batch"]>[0][number];

async function runBatch(db: Database, statements: Statement[]) {
	const [first, ...rest] = statements;
	if (first) await db.batch([first, ...rest]);
}

const slug = (email: string) => email.split("@")[0]?.replace(/\./g, "-");

/**
 * Upserts by e-mail, number and slug (TKT-30, TKT-33). One row per statement: D1 caps bound
 * parameters per query. Users who signed up before the seed keep their id.
 */
export async function applySeed(
	db: Database,
	data: SeedData,
): Promise<SeedCounts> {
	const emails = data.users.map((person) => person.email);
	const userStatements: Statement[] = data.users.map((person) =>
		db
			.insert(user)
			.values({
				id: `seed-${slug(person.email)}`,
				name: person.name,
				email: person.email,
				emailVerified: true,
			})
			.onConflictDoUpdate({
				target: user.email,
				set: { name: sql`excluded.name` },
			}),
	);
	await runBatch(db, userStatements);

	const ids = new Map(
		(
			await db
				.select({ id: user.id, email: user.email })
				.from(user)
				.where(inArray(user.email, emails))
		).map((row) => [row.email, row.id]),
	);
	const idOf = (email: string) => {
		const id = ids.get(email);
		if (!id) throw new Error(`seed user ${email} was not written`);
		return id;
	};

	const statements: Statement[] = [];
	for (const person of data.users) {
		const values = {
			role: person.role,
			department: person.department,
			os: person.os,
			team: person.team,
			passwordChangedAt: person.passwordChangedAt,
		};
		statements.push(
			db
				.insert(profile)
				.values({ userId: idOf(person.email), ...values })
				.onConflictDoUpdate({ target: profile.userId, set: values }),
		);
	}
	for (const article of data.articles) {
		const { slug: key, ...values } = article;
		statements.push(
			db
				.insert(kbArticle)
				.values(article)
				.onConflictDoUpdate({ target: kbArticle.slug, set: values }),
		);
	}
	for (const seeded of data.tickets) {
		const { notes, events, requester, assignee, ...fields } = seeded;
		const values = {
			...fields,
			requesterId: idOf(requester),
			assigneeId: assignee ? idOf(assignee) : null,
		};
		statements.push(
			db
				.insert(ticket)
				.values({ id: `seed-${seeded.number}`, ...values })
				.onConflictDoUpdate({ target: ticket.number, set: values }),
		);
		const ticketId = sql`(select ${ticket.id} from ${ticket} where ${ticket.number} = ${seeded.number})`;
		notes.forEach((note, index) => {
			const row = {
				ticketId,
				authorId: idOf(note.author),
				body: note.body,
				createdAt: note.at,
			};
			statements.push(
				db
					.insert(ticketNote)
					.values({ id: `seed-${seeded.number}-note-${index}`, ...row })
					.onConflictDoUpdate({ target: ticketNote.id, set: row }),
			);
		});
		events.forEach((event, index) => {
			const row = {
				ticketId,
				kind: event.kind,
				actorId: idOf(event.actor),
				summary: event.summary ?? null,
				team: event.team ?? null,
				createdAt: event.at,
			};
			statements.push(
				db
					.insert(ticketEvent)
					.values({ id: `seed-${seeded.number}-event-${index}`, ...row })
					.onConflictDoUpdate({ target: ticketEvent.id, set: row }),
			);
		});
	}
	const largest = new Map<string, number>();
	for (const seeded of data.tickets) {
		const value = Number(seeded.number.slice(seeded.type.length + 1));
		largest.set(seeded.type, Math.max(largest.get(seeded.type) ?? 0, value));
	}
	for (const [type, value] of largest) {
		statements.push(
			db
				.insert(ticketCounter)
				.values({ type, value })
				.onConflictDoUpdate({
					target: ticketCounter.type,
					set: { value: sql`max(${ticketCounter.value}, excluded.value)` },
				}),
		);
	}
	await runBatch(db, statements);

	const seededNumbers = data.tickets.map((t) => t.number);
	const tally = async (query: Promise<{ value: number }[]>) =>
		(await query)[0]?.value ?? 0;
	const seededIds = db
		.select({ id: ticket.id })
		.from(ticket)
		.where(inArray(ticket.number, seededNumbers));
	return {
		users: await tally(
			db
				.select({ value: count() })
				.from(user)
				.where(inArray(user.email, emails)),
		),
		profiles: await tally(
			db
				.select({ value: count() })
				.from(profile)
				.where(inArray(profile.userId, [...ids.values()])),
		),
		articles: await tally(
			db
				.select({ value: count() })
				.from(kbArticle)
				.where(
					inArray(
						kbArticle.slug,
						data.articles.map((article) => article.slug),
					),
				),
		),
		tickets: await tally(
			db
				.select({ value: count() })
				.from(ticket)
				.where(inArray(ticket.number, seededNumbers)),
		),
		notes: await tally(
			db
				.select({ value: count() })
				.from(ticketNote)
				.where(inArray(ticketNote.ticketId, seededIds)),
		),
		events: await tally(
			db
				.select({ value: count() })
				.from(ticketEvent)
				.where(inArray(ticketEvent.ticketId, seededIds)),
		),
	};
}
