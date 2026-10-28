import { beforeEach, describe, expect, test } from "bun:test";
import type { Database } from "@nexo-assist/db";
import { profile, ticketCounter, user } from "@nexo-assist/db/schema/index";

import { createTicketRepository } from "./repository";
import { createTicketService } from "./service";
import { createTestDb } from "./testing/db";
import type {
	Actor,
	AnalystActor,
	NewTicketInput,
	Result,
	TicketService,
} from "./types";

const at = (local: string) => new Date(`${local}-03:00`);
const DAY = 24 * 60 * 60_000;

const ana: Actor = { kind: "employee", userId: "ana" };
const bruno: Actor = { kind: "employee", userId: "bruno" };
const rafael: AnalystActor = {
	kind: "analyst",
	userId: "rafael",
	name: "Rafael Lima",
	team: "Suporte N2",
};

const input: NewTicketInput = {
	title: "Notebook lento após atualização do Windows",
	description: "Demora 10 minutos para ligar desde ontem.",
	type: "INC",
	category: "Hardware",
	item: "Notebook",
	priority: "Média",
	affected: "Só eu",
};

let db: Database;
let service: TicketService;
let now: Date;

function value<T>(result: Result<T>): T {
	if (!result.ok)
		throw new Error(
			`expected ok, got ${result.error.code}: ${result.error.message}`,
		);
	return result.value;
}

function errorCode<T>(result: Result<T>) {
	return result.ok ? "ok" : result.error.code;
}

async function createAt(
	local: string,
	actor: Actor = ana,
	overrides: Partial<NewTicketInput> = {},
) {
	now = at(local);
	return value(
		await service.create(
			actor,
			{ ...input, ...overrides },
			crypto.randomUUID(),
		),
	);
}

beforeEach(async () => {
	db = await createTestDb();
	now = at("2026-10-26T09:00:00");
	service = createTicketService({ db, clock: { now: () => now } });
	await db.insert(user).values([
		{ id: "ana", name: "Ana Souza", email: "ana.souza@nexo.com.br" },
		{ id: "bruno", name: "Bruno Costa", email: "bruno.costa@nexo.com.br" },
		{ id: "rafael", name: "Rafael Lima", email: "rafael.lima@nexo.com.br" },
	]);
	await db.insert(profile).values([
		{
			userId: "ana",
			role: "employee",
			department: "Financeiro",
			os: "Windows 11",
		},
		{
			userId: "bruno",
			role: "employee",
			department: "Comercial",
			os: "Windows 10",
		},
		{ userId: "rafael", role: "analyst", team: "Suporte N2" },
	]);
	await db.insert(ticketCounter).values({ type: "INC", value: 20311 });
});

describe("list and get", () => {
	test("list own tickets newest first, with deadline and vencido", async () => {
		const older = await createAt("2026-10-20T09:00:00");
		const newer = await createAt("2026-10-23T09:00:00");
		await createAt("2026-10-24T09:00:00", bruno);
		now = at("2026-10-26T09:00:00");

		const list = value(await service.list(ana));
		expect(list.map((ticket) => ticket.number)).toEqual([
			newer.number,
			older.number,
		]);
		expect(list[1]).toMatchObject({
			title: input.title,
			type: "INC",
			category: "Hardware",
			item: "Notebook",
			priority: "Média",
			status: "Aguardando analista",
			openedAt: at("2026-10-20T09:00:00"),
			updatedAt: at("2026-10-20T09:00:00"),
			deadlineAt: at("2026-10-23T09:00:00"),
			vencido: true,
			atrasoMinutos: 600,
		});
		expect(list[0]).toMatchObject({ vencido: false, atrasoMinutos: 0 });
	});

	test("only open excludes Resolvido, Fechado and Cancelado", async () => {
		const tickets = [];
		for (const hour of ["09", "10", "11", "12"])
			tickets.push(await createAt(`2026-10-26T${hour}:00:00`));
		const repo = createTicketRepository(db);
		const statuses = ["Resolvido", "Fechado", "Cancelado"] as const;
		for (const [index, status] of statuses.entries()) {
			const row = await repo.getByNumber(tickets[index]?.number ?? "");
			await repo.applyChange(row?.id ?? "", { status, updatedAt: now });
		}
		const open = value(await service.list(ana, { onlyOpen: true }));
		expect(open.map((ticket) => ticket.number)).toEqual(
			tickets.slice(3).map((ticket) => ticket.number),
		);
		expect(value(await service.list(ana))).toHaveLength(4);
	});

	test("empty list for an employee without tickets", async () => {
		expect(value(await service.list(bruno))).toEqual([]);
	});

	test("detail includes notes and events with author and time", async () => {
		const created = await createAt("2026-10-26T09:00:00");
		now = at("2026-10-26T10:00:00");
		value(
			await service.addNote(ana, created.number, "Já reiniciei duas vezes."),
		);
		now = at("2026-10-26T10:05:00");
		value(
			await service.transfer(ana, created.number, {
				summary: "Notebook lento, já reiniciou.",
				team: "Suporte N2",
			}),
		);

		const detail = value(await service.get(ana, created.number));
		expect(detail).toMatchObject({
			description: input.description,
			affected: "Só eu",
			requester: { id: "ana", name: "Ana Souza" },
		});
		expect(detail.notes).toEqual([
			{
				author: "Ana Souza",
				body: "Já reiniciei duas vezes.",
				at: at("2026-10-26T10:00:00"),
			},
		]);
		expect(detail.events).toEqual([
			{ kind: "criado", actor: "Ana Souza", at: at("2026-10-26T09:00:00") },
			{ kind: "atualizado", actor: "Ana Souza", at: at("2026-10-26T10:00:00") },
			{
				kind: "transferido",
				actor: "Ana Souza",
				summary: "Notebook lento, já reiniciou.",
				team: "Suporte N2",
				at: at("2026-10-26T10:05:00"),
			},
		]);
	});

	test("not found for other requester, same as a missing ticket", async () => {
		const others = await createAt("2026-10-26T09:00:00", bruno);
		const foreign = await service.get(ana, others.number);
		const missing = await service.get(ana, "INC-99999");
		expect(foreign).toEqual(missing);
		expect(errorCode(foreign)).toBe("NOT_FOUND");
		for (const result of [
			await service.addNote(ana, others.number, "oi"),
			await service.reopen(ana, others.number, "voltou"),
			await service.transfer(ana, others.number, {
				summary: "resumo",
				team: "Suporte N1",
			}),
		]) {
			expect(result).toEqual(missing);
		}
	});

	test("requesterId from an employee is ignored", async () => {
		await createAt("2026-10-26T09:00:00", bruno);
		const own = await createAt("2026-10-26T10:00:00");
		const list = value(await service.list(ana, { requesterId: "bruno" }));
		expect(list.map((ticket) => ticket.number)).toEqual([own.number]);
	});

	test("analyst reads all tickets and filters by requester", async () => {
		const own = await createAt("2026-10-26T09:00:00");
		const others = await createAt("2026-10-26T10:00:00", bruno);
		expect(
			value(await service.list(rafael)).map((ticket) => ticket.number),
		).toEqual([others.number, own.number]);
		expect(
			value(await service.list(rafael, { requesterId: "ana" })).map(
				(ticket) => ticket.number,
			),
		).toEqual([own.number]);
		expect(value(await service.get(rafael, others.number)).requester.name).toBe(
			"Bruno Costa",
		);
	});

	test("ticket numbers are matched without case or spaces", async () => {
		const created = await createAt("2026-10-26T09:00:00");
		expect(
			value(await service.get(ana, ` ${created.number.toLowerCase()} `)).number,
		).toBe(created.number);
	});
});

describe("create, add note and reopen", () => {
	test("create assigns next number, Aguardando analista and the deadline", async () => {
		const created = await createAt("2026-10-30T16:00:00", ana, {
			priority: "Alta",
		});
		expect(created).toMatchObject({
			number: "INC-20312",
			status: "Aguardando analista",
			openedAt: at("2026-10-30T16:00:00"),
			updatedAt: at("2026-10-30T16:00:00"),
			deadlineAt: at("2026-11-02T10:00:00"),
			vencido: false,
		});
		expect((await createAt("2026-10-30T16:05:00")).number).toBe("INC-20313");
		expect(
			(await createAt("2026-10-30T16:10:00", ana, { type: "REQ" })).number,
		).toBe("REQ-00001");
	});

	test("create with invalid fields writes nothing", async () => {
		const result = await service.create(
			ana,
			{ ...input, title: "", category: "Impressora" },
			"k1",
		);
		expect(result).toEqual({
			ok: false,
			error: {
				code: "INVALID_TICKET",
				message: expect.any(String),
				fields: ["title", "category"],
			},
		});
		expect(value(await service.list(ana))).toEqual([]);
	});

	test("create with the same idempotency key returns the same ticket", async () => {
		const first = value(await service.create(ana, input, "conversa-1:turno-3"));
		const retry = value(await service.create(ana, input, "conversa-1:turno-3"));
		expect(retry.number).toBe(first.number);
		expect(value(await service.list(ana))).toHaveLength(1);
	});

	test("the same idempotency key from another employee creates their own ticket", async () => {
		const first = value(await service.create(ana, input, "k"));
		const other = value(await service.create(bruno, input, "k"));
		expect(other.number).not.toBe(first.number);
		expect(other.requester.id).toBe("bruno");
	});

	test("the requester of a new ticket is the actor", async () => {
		const created = await createAt("2026-10-26T09:00:00", bruno);
		expect(created.requester).toEqual({ id: "bruno", name: "Bruno Costa" });
	});

	test("add note appends author and time and keeps title, type and category", async () => {
		const created = await createAt("2026-10-26T09:00:00");
		now = at("2026-10-26T11:00:00");
		const updated = value(
			await service.addNote(ana, created.number, "  A tela também pisca.  "),
		);
		expect(updated.notes).toEqual([
			{
				author: "Ana Souza",
				body: "A tela também pisca.",
				at: at("2026-10-26T11:00:00"),
			},
		]);
		expect(updated).toMatchObject({
			title: created.title,
			type: created.type,
			category: created.category,
		});
		expect(updated.updatedAt).toEqual(at("2026-10-26T11:00:00"));
	});

	test("add note with an empty body is INVALID_TICKET", async () => {
		const created = await createAt("2026-10-26T09:00:00");
		expect(errorCode(await service.addNote(ana, created.number, "  "))).toBe(
			"INVALID_TICKET",
		);
	});

	test("ticket closed: notes on Resolvido, Fechado or Cancelado are refused", async () => {
		const repo = createTicketRepository(db);
		for (const status of ["Resolvido", "Fechado", "Cancelado"] as const) {
			const created = await createAt("2026-10-26T09:00:00");
			const row = await repo.getByNumber(created.number);
			await repo.applyChange(row?.id ?? "", { status, updatedAt: now });
			expect(
				errorCode(
					await service.addNote(ana, created.number, "voltou a falhar"),
				),
			).toBe("TICKET_CLOSED");
			expect(value(await service.get(ana, created.number)).notes).toEqual([]);
		}
	});

	test("employee note keeps deadline", async () => {
		const created = await createAt("2026-10-26T09:00:00");
		now = at("2026-10-27T15:00:00");
		const updated = value(
			await service.addNote(ana, created.number, "Alguma novidade?"),
		);
		expect(updated.deadlineAt).toEqual(created.deadlineAt);
	});

	test("team update resets deadline: an analyst note restarts it from now", async () => {
		const created = await createAt("2026-10-26T09:00:00");
		now = at("2026-10-27T15:00:00");
		const updated = value(
			await service.addNote(rafael, created.number, "Vou acessar remotamente."),
		);
		expect(updated.deadlineAt).toEqual(at("2026-10-30T15:00:00"));
		expect(updated.notes[0]?.author).toBe("Rafael Lima");
	});

	async function resolvedTicket(resolvedAt: Date) {
		const created = await createAt("2026-10-01T09:00:00");
		const repo = createTicketRepository(db);
		const row = await repo.getByNumber(created.number);
		await repo.applyChange(row?.id ?? "", {
			status: "Resolvido",
			resolvedAt,
			updatedAt: resolvedAt,
		});
		return created;
	}

	test("reopen within 7 days goes back to Aguardando analista with the reason and a new deadline", async () => {
		const created = await resolvedTicket(at("2026-10-22T10:00:00"));
		now = at("2026-10-26T09:00:00");
		const reopened = value(
			await service.reopen(ana, created.number, "A senha bloqueou de novo."),
		);
		expect(reopened).toMatchObject({
			status: "Aguardando analista",
			deadlineAt: at("2026-10-29T09:00:00"),
		});
		expect(reopened.notes.at(-1)?.body).toBe("A senha bloqueou de novo.");
		expect(reopened.events.at(-1)).toMatchObject({
			kind: "reaberto",
			summary: "A senha bloqueou de novo.",
		});
	});

	test("reopen within 7 days: exactly 7 days is still allowed", async () => {
		const created = await resolvedTicket(at("2026-10-19T09:00:00"));
		now = at("2026-10-26T09:00:00");
		expect(errorCode(await service.reopen(ana, created.number, "voltou"))).toBe(
			"ok",
		);
	});

	test("reopen after 7 days and 1 minute, or of an open ticket, is REOPEN_NOT_ALLOWED", async () => {
		const old = await resolvedTicket(at("2026-10-19T09:00:00"));
		now = new Date(at("2026-10-19T09:00:00").getTime() + 7 * DAY + 60_000);
		expect(errorCode(await service.reopen(ana, old.number, "voltou"))).toBe(
			"REOPEN_NOT_ALLOWED",
		);
		const open = await createAt("2026-10-26T09:00:00");
		expect(errorCode(await service.reopen(ana, open.number, "voltou"))).toBe(
			"REOPEN_NOT_ALLOWED",
		);
	});
});

describe("transfer and assume", () => {
	test("transfer records event with summary, team and time, in Aguardando analista", async () => {
		const created = await createAt("2026-10-26T09:00:00");
		now = at("2026-10-27T10:05:00");
		const transferred = value(
			await service.transfer(ana, created.number, {
				summary: "Notebook lento após update.",
				team: "Suporte N2",
			}),
		);
		expect(transferred.status).toBe("Aguardando analista");
		expect(transferred.events.at(-1)).toEqual({
			kind: "transferido",
			actor: "Ana Souza",
			summary: "Notebook lento após update.",
			team: "Suporte N2",
			at: at("2026-10-27T10:05:00"),
		});
	});

	test("team update resets deadline: a transfer restarts it from now", async () => {
		const created = await createAt("2026-10-26T09:00:00");
		now = at("2026-10-27T10:05:00");
		const transferred = value(
			await service.transfer(ana, created.number, {
				summary: "Resumo",
				team: "Suporte N1",
			}),
		);
		expect(transferred.deadlineAt).toEqual(at("2026-10-30T10:05:00"));
	});

	test("transfer without summary is INVALID_TRANSFER and changes nothing", async () => {
		const created = await createAt("2026-10-26T09:00:00");
		const result = await service.transfer(ana, created.number, {
			summary: " ",
			team: "Suporte N2",
		});
		expect(errorCode(result)).toBe("INVALID_TRANSFER");
		expect(
			value(await service.get(ana, created.number)).events.map(
				(event) => event.kind,
			),
		).toEqual(["criado"]);
	});

	test("assume puts the ticket Em atendimento and records Assumido por Rafael Lima", async () => {
		const created = await createAt("2026-10-26T09:00:00");
		now = at("2026-10-27T10:12:00");
		const assumed = value(await service.assume(rafael, created.number));
		expect(assumed.status).toBe("Em atendimento");
		expect(assumed.events.at(-1)).toEqual({
			kind: "assumido",
			actor: "Rafael Lima",
			team: "Suporte N2",
			at: at("2026-10-27T10:12:00"),
		});
		expect(assumed.deadlineAt).toEqual(at("2026-10-30T10:12:00"));
	});

	test("assume or transfer a closed ticket is TICKET_CLOSED", async () => {
		const created = await createAt("2026-10-26T09:00:00");
		const repo = createTicketRepository(db);
		const row = await repo.getByNumber(created.number);
		await repo.applyChange(row?.id ?? "", {
			status: "Fechado",
			updatedAt: now,
		});
		expect(errorCode(await service.assume(rafael, created.number))).toBe(
			"TICKET_CLOSED",
		);
		expect(
			errorCode(
				await service.transfer(ana, created.number, {
					summary: "x",
					team: "Suporte N1",
				}),
			),
		).toBe("TICKET_CLOSED");
	});
});

describe("unexpected failures", () => {
	test("a database error becomes SERVICE_UNAVAILABLE", async () => {
		const broken = createTicketService({
			db: {
				...db,
				select: () => {
					throw new Error("D1 down");
				},
			} as unknown as Database,
		});
		const original = console.error;
		console.error = () => {};
		try {
			expect(errorCode(await broken.list(ana))).toBe("SERVICE_UNAVAILABLE");
		} finally {
			console.error = original;
		}
	});
});
