import { beforeEach, describe, expect, test } from "bun:test";

import type { Database } from "@nexo-assist/db";
import { profile, user } from "@nexo-assist/db/schema/index";
import { createTestDb } from "@nexo-assist/tickets/testing/db";

import { createTicketService, readFailureConfig } from "./tickets";

const input = {
	title: "Mouse sem fio parou",
	description: "O mouse não responde mesmo com pilha nova.",
	type: "INC",
	category: "Hardware",
	item: "Mouse",
	priority: "Baixa",
	affected: "Só eu",
};
const session = (id: string) => ({ user: { id } });

let db: Database;

beforeEach(async () => {
	db = await createTestDb();
	await db.insert(user).values([
		{ id: "ana", name: "Ana Souza", email: "ana.souza@nexo.com.br" },
		{ id: "bruno", name: "Bruno Costa", email: "bruno.costa@nexo.com.br" },
		{ id: "rafael", name: "Rafael Lima", email: "rafael.lima@nexo.com.br" },
		{ id: "sem-perfil", name: "Visitante", email: "visitante@exemplo.com" },
	]);
	await db.insert(profile).values([
		{ userId: "ana", role: "employee", department: "Financeiro" },
		{ userId: "bruno", role: "employee", department: "Comercial" },
		{ userId: "rafael", role: "analyst", team: "Suporte N2" },
	]);
});

const noFailure = { TICKETS_FAILURE_RATE: "0" };

describe("createTicketService", () => {
	test("actor from session: an employee session becomes an employee actor and requesterId is ignored", async () => {
		const bruno = await createTicketService({
			db,
			env: noFailure,
			session: session("bruno"),
		});
		if (!bruno.ok) throw new Error(bruno.error);
		await bruno.service.create(bruno.actor, input, "bruno-1");

		const access = await createTicketService({
			db,
			env: noFailure,
			session: session("ana"),
		});
		expect(access.ok && access.actor).toEqual({
			kind: "employee",
			userId: "ana",
		});
		if (!access.ok) return;
		const created = await access.service.create(access.actor, input, "ana-1");
		if (!created.ok) throw new Error(created.error.code);
		expect(created.value.requester).toEqual({ id: "ana", name: "Ana Souza" });
		const listed = await access.service.list(access.actor, {
			requesterId: "bruno",
		});
		expect(listed.ok && listed.value.map((t) => t.number)).toEqual([
			created.value.number,
		]);
	});

	test("actor from session: an analyst session becomes an analyst actor with the team", async () => {
		const access = await createTicketService({
			db,
			env: noFailure,
			session: session("rafael"),
		});
		expect(access.ok && access.actor).toEqual({
			kind: "analyst",
			userId: "rafael",
			name: "Rafael Lima",
			team: "Suporte N2",
		});
	});

	test("without a session it is an authentication error", async () => {
		expect(
			await createTicketService({ db, env: noFailure, session: null }),
		).toEqual({ ok: false, error: "UNAUTHENTICATED" });
	});

	test("a user without a profile cannot use the service", async () => {
		expect(
			await createTicketService({
				db,
				env: noFailure,
				session: session("sem-perfil"),
			}),
		).toEqual({ ok: false, error: "NO_PROFILE" });
	});

	test("failure rate read from env", async () => {
		const access = await createTicketService({
			db,
			env: { TICKETS_FAILURE_RATE: "1" },
			session: session("ana"),
		});
		if (!access.ok) throw new Error(access.error);
		const listed = await access.service.list(access.actor);
		expect(!listed.ok && listed.error.code).toBe("SERVICE_UNAVAILABLE");
	});

	test("failure config defaults and bad values", () => {
		expect(readFailureConfig({})).toEqual({ rate: 0.1, extraLatencyMs: 0 });
		expect(
			readFailureConfig({
				TICKETS_FAILURE_RATE: "0.3",
				TICKETS_EXTRA_LATENCY_MS: "250",
			}),
		).toEqual({ rate: 0.3, extraLatencyMs: 250 });
		expect(
			readFailureConfig({
				TICKETS_FAILURE_RATE: "abc",
				TICKETS_EXTRA_LATENCY_MS: "-5",
			}),
		).toEqual({ rate: 0.1, extraLatencyMs: 0 });
		expect(readFailureConfig({ TICKETS_FAILURE_RATE: "7" }).rate).toBe(1);
	});
});
