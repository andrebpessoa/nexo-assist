import { describe, expect, test } from "bun:test";

import { smokeTarget } from "./smoke-target";

/**
 * Runs against the local dev server and its D1 (AD-014): `bun run dev` first, then
 * `SERVER_URL=http://localhost:3000 bun test ...`. Skipped, with a warning, unless SERVER_URL is set
 * and a nexo-assist dev server answers there (AD-019).
 */
const SERVER_URL = smokeTarget(process.env);
const ANA = "ana.souza@nexo.com.br";

async function serverIsUp() {
	try {
		const response = await fetch(`${SERVER_URL}/internal/health`, {
			signal: AbortSignal.timeout(2000),
		});
		const body = (await response.json()) as { app?: string };
		return response.ok && body.app === "nexo-assist";
	} catch {
		return false;
	}
}

const up = SERVER_URL !== undefined && (await serverIsUp());
if (!up) {
	console.warn(
		SERVER_URL
			? `d1 smoke skipped: no nexo-assist dev server at ${SERVER_URL} (run bun run dev)`
			: "d1 smoke skipped: SERVER_URL is not set (run bun run dev and pass its URL)",
	);
}

type Result<T> =
	| { ok: true; value: T }
	| { ok: false; error: { code: string } };
type Summary = { number: string; title: string; vencido: boolean };

/** The service fails on purpose (TICKETS_FAILURE_RATE), so the smoke retries like a client would. */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
	for (let attempt = 0; attempt < 30; attempt++) {
		const response = await fetch(`${SERVER_URL}${path}`, init);
		expect(response.status).toBe(200);
		const result = (await response.json()) as Result<T>;
		if (result.ok) return result.value;
		if (result.error.code !== "SERVICE_UNAVAILABLE") {
			throw new Error(`${path}: ${result.error.code}`);
		}
	}
	throw new Error(`${path}: still SERVICE_UNAVAILABLE after 30 attempts`);
}

const listAsAna = () =>
	call<Summary[]>(`/internal/tickets?as=${encodeURIComponent(ANA)}`);

describe.skipIf(!up)("d1 smoke", () => {
	test("seed answers the counts", async () => {
		const response = await fetch(`${SERVER_URL}/internal/seed`, {
			method: "POST",
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			users: 7,
			articles: 7,
			tickets: 9,
		});
	});

	test("Ana sees INC-20311 overdue and no ticket of another employee", async () => {
		const tickets = await listAsAna();
		expect(tickets.find((t) => t.number === "INC-20311")?.vencido).toBe(true);
		const numbers = tickets.map((t) => t.number);
		for (const other of ["INC-20305", "REQ-10450", "INC-20290"]) {
			expect(numbers).not.toContain(other);
		}
	});

	test("persisted ticket still listed", async () => {
		// Fixed key: the first run creates the ticket, later runs (after restarting the dev
		// server) get the same ticket back and must still find it in the list (TKT-12, TKT-27).
		const created = await call<{ number: string }>(
			`/internal/tickets?as=${encodeURIComponent(ANA)}`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					idempotencyKey: "d1-smoke-persisted",
					input: {
						title: "Chamado do teste de fumaça",
						description:
							"Criado pelo d1.smoke.test.ts para provar a persistência.",
						type: "INC",
						category: "Outros",
						item: "",
						priority: "Baixa",
						affected: "Só eu",
					},
				}),
			},
		);
		expect(created.number).toMatch(/^INC-\d{5}$/);
		const tickets = await listAsAna();
		expect(tickets.map((t) => t.number)).toContain(created.number);
	});
});
