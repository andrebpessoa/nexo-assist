import { beforeEach, describe, expect, test } from "bun:test";

import type { Database } from "@nexo-assist/db";
import { profile, ticket, user } from "@nexo-assist/db/schema/index";
import { eq } from "drizzle-orm";

import { createTicketService } from "../service";
import { createTestDb } from "../testing/db";
import { applySeed } from "./apply";
import { buildSeed } from "./build";

const now = new Date("2026-10-28T10:00:00-03:00");
let db: Database;

beforeEach(async () => {
	db = await createTestDb();
});

describe("applySeed", () => {
	test("idempotent seed: running twice leaves the same counts", async () => {
		const first = await applySeed(db, buildSeed(now));
		const second = await applySeed(db, buildSeed(now));
		const nextDay = await applySeed(
			db,
			buildSeed(new Date(now.getTime() + 86_400_000)),
		);
		const data = buildSeed(now);
		const notes = data.tickets.reduce((sum, t) => sum + t.notes.length, 0);
		const events = data.tickets.reduce((sum, t) => sum + t.events.length, 0);
		expect(first).toEqual({
			users: data.users.length,
			profiles: data.users.length,
			articles: data.articles.length,
			tickets: data.tickets.length,
			notes,
			events,
		});
		expect(second).toEqual(first);
		expect(nextDay).toEqual(first);
	});

	test("idempotent seed: the next INC created is the largest seeded INC + 1", async () => {
		await applySeed(db, buildSeed(now));
		await applySeed(db, buildSeed(now));
		const [ana] = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, "ana.souza@nexo.com.br"));
		const service = createTicketService({ db, clock: { now: () => now } });
		const created = await service.create(
			{ kind: "employee", userId: ana?.id ?? "" },
			{
				title: "Teclado sem algumas teclas",
				description: "As teclas A e S não respondem.",
				type: "INC",
				category: "Hardware",
				item: "Teclado",
				priority: "Baixa",
				affected: "Só eu",
			},
			"seed-next-number",
		);
		const largest = Math.max(
			...buildSeed(now)
				.tickets.filter((t) => t.type === "INC")
				.map((t) => Number(t.number.slice(4))),
		);
		expect(created.ok && created.value.number).toBe(`INC-${largest + 1}`);
		const req = await service.create(
			{ kind: "employee", userId: ana?.id ?? "" },
			{
				title: "Headset para reuniões",
				description: "Preciso de um headset com microfone.",
				type: "REQ",
				category: "Hardware",
				item: "Headset",
				priority: "Baixa",
				affected: "Só eu",
			},
			"seed-next-req",
		);
		expect(req.ok && req.value.number).toBe("REQ-10451");
	});

	test("keeps the id of a user who signed up before the seed", async () => {
		await db.insert(user).values({
			id: "signed-up-ana",
			name: "Ana",
			email: "ana.souza@nexo.com.br",
		});
		await applySeed(db, buildSeed(now));
		const [ana] = await db
			.select({ id: user.id, name: user.name })
			.from(user)
			.where(eq(user.email, "ana.souza@nexo.com.br"));
		expect(ana).toEqual({ id: "signed-up-ana", name: "Ana Souza" });
		const [anaProfile] = await db
			.select({ department: profile.department })
			.from(profile)
			.where(eq(profile.userId, "signed-up-ana"));
		expect(anaProfile?.department).toBe("Financeiro");
		const [inc] = await db
			.select({ requesterId: ticket.requesterId })
			.from(ticket)
			.where(eq(ticket.number, "INC-20311"));
		expect(inc?.requesterId).toBe("signed-up-ana");
	});

	test("Ana sees INC-20311 overdue after the seed", async () => {
		await applySeed(db, buildSeed(now));
		const [ana] = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, "ana.souza@nexo.com.br"));
		const service = createTicketService({ db, clock: { now: () => now } });
		const listed = await service.list({
			kind: "employee",
			userId: ana?.id ?? "",
		});
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		const inc = listed.value.find((t) => t.number === "INC-20311");
		expect(inc?.vencido).toBe(true);
		expect(listed.value.every((t) => !t.number.startsWith("REQ-10450"))).toBe(
			true,
		);
	});
});
