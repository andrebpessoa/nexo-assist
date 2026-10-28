import { beforeEach, describe, expect, test } from "bun:test";

import type { Database } from "@nexo-assist/db";
import { createTestDb } from "@nexo-assist/tickets/testing/db";

import { createDevRoutes } from "./dev-seed";

const now = new Date("2026-10-28T10:00:00-03:00");
let db: Database;

beforeEach(async () => {
	db = await createTestDb();
});

const routes = (enabled: boolean) =>
	createDevRoutes({
		enabled,
		getDb: () => db,
		env: { TICKETS_FAILURE_RATE: "0" },
		now: () => now,
	});

describe("dev routes", () => {
	test("with the flag, POST /internal/seed answers 200 with the counts, twice the same", async () => {
		const app = routes(true);
		const first = await app.request("/internal/seed", { method: "POST" });
		expect(first.status).toBe(200);
		const counts = await first.json();
		expect(counts).toMatchObject({ users: 7, articles: 7, tickets: 9 });
		const second = await app.request("/internal/seed", { method: "POST" });
		expect(await second.json()).toEqual(counts);
	});

	test("with the flag, health names the app", async () => {
		const response = await routes(true).request("/internal/health");
		expect(await response.json()).toEqual({ app: "nexo-assist" });
	});

	test("without the flag, every dev route is 404", async () => {
		const app = routes(false);
		expect((await app.request("/internal/health")).status).toBe(404);
		expect(
			(await app.request("/internal/seed", { method: "POST" })).status,
		).toBe(404);
		expect(
			(await app.request("/internal/tickets?as=ana.souza@nexo.com.br")).status,
		).toBe(404);
	});

	test("with the flag, tickets can be listed and created as a seeded user", async () => {
		const app = routes(true);
		await app.request("/internal/seed", { method: "POST" });
		const listed = await app.request(
			"/internal/tickets?as=ana.souza@nexo.com.br",
		);
		const body = (await listed.json()) as {
			ok: boolean;
			value: { number: string; vencido: boolean }[];
		};
		expect(body.ok).toBe(true);
		expect(body.value.find((t) => t.number === "INC-20311")?.vencido).toBe(
			true,
		);
		expect(body.value.some((t) => t.number === "INC-20305")).toBe(false);

		const created = await app.request(
			"/internal/tickets?as=ana.souza@nexo.com.br",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					idempotencyKey: "dev-1",
					input: {
						title: "Teclado falhando",
						description: "Algumas teclas não respondem.",
						type: "INC",
						category: "Hardware",
						item: "Teclado",
						priority: "Baixa",
						affected: "Só eu",
					},
				}),
			},
		);
		expect(await created.json()).toMatchObject({
			ok: true,
			value: { number: "INC-20312" },
		});
	});

	test("an unknown user is 404", async () => {
		const app = routes(true);
		const response = await app.request(
			"/internal/tickets?as=ninguem@nexo.com.br",
		);
		expect(response.status).toBe(404);
	});
});
