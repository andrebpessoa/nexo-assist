import { beforeEach, describe, expect, test } from "bun:test";
import type { Database } from "@nexo-assist/db";
import {
	kbArticle,
	profile,
	ticketCounter,
	user,
} from "@nexo-assist/db/schema/index";

import {
	createTicketRepository,
	type NewTicketRecord,
	type TicketRepository,
} from "./repository";
import { createTestDb } from "./testing/db";

const at = (local: string) => new Date(`${local}-03:00`);

let db: Database;
let repo: TicketRepository;

const record = (overrides: Partial<NewTicketRecord> = {}): NewTicketRecord => ({
	title: "Notebook lento",
	description: "Demora para ligar.",
	type: "INC",
	category: "Hardware",
	item: "Notebook",
	priority: "Média",
	affected: "Só eu",
	requesterId: "ana",
	now: at("2026-10-27T10:00:00"),
	idempotencyKey: crypto.randomUUID(),
	...overrides,
});

beforeEach(async () => {
	db = await createTestDb();
	repo = createTicketRepository(db);
	await db.insert(user).values([
		{ id: "ana", name: "Ana Souza", email: "ana.souza@nexo.com.br" },
		{ id: "bruno", name: "Bruno Lima", email: "bruno.lima@nexo.com.br" },
		{ id: "rafael", name: "Rafael Lima", email: "rafael.lima@nexo.com.br" },
	]);
});

describe("insertTicket", () => {
	test("numbers are sequential per type, starting from the counter", async () => {
		await db.insert(ticketCounter).values({ type: "INC", value: 20311 });
		const first = await repo.insertTicket(record());
		const second = await repo.insertTicket(record());
		const request = await repo.insertTicket(record({ type: "REQ" }));
		expect([first.number, second.number, request.number]).toEqual([
			"INC-20312",
			"INC-20313",
			"REQ-00001",
		]);
	});

	test("stores the ticket with its fields, requester and a criado event", async () => {
		const created = await repo.insertTicket(record());
		expect(created).toMatchObject({
			title: "Notebook lento",
			status: "Aguardando analista",
			requesterId: "ana",
			requesterName: "Ana Souza",
			openedAt: at("2026-10-27T10:00:00"),
			updatedAt: at("2026-10-27T10:00:00"),
			slaAnchorAt: at("2026-10-27T10:00:00"),
			resolvedAt: null,
		});
		const history = await repo.getHistory(created.id);
		expect(history.events).toEqual([
			{
				kind: "criado",
				actor: "Ana Souza",
				summary: null,
				team: null,
				at: at("2026-10-27T10:00:00"),
			},
		]);
	});

	test("idempotent insert: the same key returns the same ticket and does not use a number", async () => {
		const first = await repo.insertTicket(record({ idempotencyKey: "k1" }));
		const again = await repo.insertTicket(
			record({ idempotencyKey: "k1", title: "outro título" }),
		);
		const next = await repo.insertTicket(record({ idempotencyKey: "k2" }));
		expect(again.id).toBe(first.id);
		expect(again.title).toBe("Notebook lento");
		expect([first.number, next.number]).toEqual(["INC-00001", "INC-00002"]);
		expect(await repo.listAll()).toHaveLength(2);
	});

	test("idempotent insert under concurrency: the same key in parallel creates one ticket", async () => {
		const results = await Promise.all(
			[1, 2, 3].map(() =>
				repo.insertTicket(record({ idempotencyKey: "same" })),
			),
		);
		expect(new Set(results.map((ticket) => ticket.number))).toEqual(
			new Set(["INC-00001"]),
		);
		expect((await repo.insertTicket(record())).number).toBe("INC-00002");
	});

	test("different keys in parallel get different numbers", async () => {
		const results = await Promise.all(
			Array.from({ length: 10 }, () => repo.insertTicket(record())),
		);
		const numbers = results.map((ticket) => ticket.number).sort();
		expect(numbers).toEqual(
			Array.from(
				{ length: 10 },
				(_, i) => `INC-${String(i + 1).padStart(5, "0")}`,
			),
		);
	});
});

describe("listings", () => {
	test("listByRequester returns only that requester, newest update first", async () => {
		const old = await repo.insertTicket(
			record({ now: at("2026-10-20T10:00:00") }),
		);
		const recent = await repo.insertTicket(
			record({ now: at("2026-10-26T10:00:00") }),
		);
		await repo.insertTicket(record({ requesterId: "bruno" }));
		await repo.applyChange(old.id, { updatedAt: at("2026-10-27T09:00:00") });
		expect(
			(await repo.listByRequester("ana")).map((ticket) => ticket.number),
		).toEqual([old.number, recent.number]);
	});

	test("listByRequester for someone without tickets is empty", async () => {
		expect(await repo.listByRequester("rafael")).toEqual([]);
	});

	test("listAll returns everyone and filters by requester", async () => {
		await repo.insertTicket(record());
		await repo.insertTicket(record({ requesterId: "bruno" }));
		expect(await repo.listAll()).toHaveLength(2);
		expect(
			(await repo.listAll({ requesterId: "bruno" })).map(
				(ticket) => ticket.requesterId,
			),
		).toEqual(["bruno"]);
	});

	test("getByNumber finds a ticket or returns undefined", async () => {
		const created = await repo.insertTicket(record());
		expect((await repo.getByNumber(created.number))?.id).toBe(created.id);
		expect(await repo.getByNumber("INC-99999")).toBeUndefined();
	});
});

describe("applyChange", () => {
	test("updates fields and appends a note and an event in one batch", async () => {
		const created = await repo.insertTicket(record());
		await repo.applyChange(created.id, {
			status: "Em atendimento",
			assigneeId: "rafael",
			updatedAt: at("2026-10-27T11:00:00"),
			slaAnchorAt: at("2026-10-27T11:00:00"),
			note: { authorId: "rafael", body: "Verificando o driver." },
			event: { kind: "assumido", actorId: "rafael" },
		});
		const changed = await repo.getByNumber(created.number);
		expect(changed).toMatchObject({
			status: "Em atendimento",
			assigneeId: "rafael",
			slaAnchorAt: at("2026-10-27T11:00:00"),
		});
		const history = await repo.getHistory(created.id);
		expect(history.notes).toEqual([
			{
				author: "Rafael Lima",
				body: "Verificando o driver.",
				at: at("2026-10-27T11:00:00"),
			},
		]);
		expect(history.events.map((event) => event.kind)).toEqual([
			"criado",
			"assumido",
		]);
	});
});

describe("profiles and articles", () => {
	test("getProfile joins the user name", async () => {
		await db
			.insert(profile)
			.values({ userId: "rafael", role: "analyst", team: "Suporte N2" });
		expect(await repo.getProfile("rafael")).toEqual({
			userId: "rafael",
			name: "Rafael Lima",
			role: "analyst",
			team: "Suporte N2",
			department: null,
			os: null,
		});
		expect(await repo.getProfile("ana")).toBeUndefined();
	});

	test("listArticles reads the keywords as a list", async () => {
		await db.insert(kbArticle).values({
			slug: "vpn",
			title: "VPN",
			body: "Reinstale.",
			appliesWhen: "Windows 10",
			keywords: ["vpn", "809"],
		});
		expect(await repo.listArticles()).toEqual([
			{
				slug: "vpn",
				title: "VPN",
				body: "Reinstale.",
				appliesWhen: "Windows 10",
				keywords: ["vpn", "809"],
			},
		]);
	});
});
