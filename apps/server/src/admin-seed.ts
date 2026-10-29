import type { Database } from "@nexo-assist/db";
import { applySeed } from "@nexo-assist/tickets/seed/apply";
import { buildSeed } from "@nexo-assist/tickets/seed/build";
import { Hono } from "hono";

/** Compares without stopping at the first different character. */
function sameToken(given: string, expected: string): boolean {
	const a = new TextEncoder().encode(given);
	const b = new TextEncoder().encode(expected);
	let diff = a.length ^ b.length;
	for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ (b[i] as number);
	return diff === 0;
}

/**
 * `POST /admin/seed` loads Anexo B into the deployed D1 (DLV-12). It exists only when the Worker
 * has `SEED_TOKEN`, and needs `Authorization: Bearer <SEED_TOKEN>`.
 */
export function createAdminRoutes({
	token,
	getDb,
	now = () => new Date(),
}: {
	token: string | undefined;
	getDb: () => Database;
	now?: () => Date;
}) {
	const app = new Hono();
	const expected = token?.trim();
	if (!expected) return app;

	app.post("/admin/seed", async (c) => {
		const given = c.req.header("authorization")?.match(/^Bearer (.+)$/)?.[1];
		if (!given || !sameToken(given, expected))
			return c.json({ error: "unauthorized" }, 401);
		return c.json(await applySeed(getDb(), buildSeed(now())));
	});

	return app;
}
