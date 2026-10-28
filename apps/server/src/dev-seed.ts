import type { Database } from "@nexo-assist/db";
import { user } from "@nexo-assist/db/schema/index";
import type { NewTicketInput } from "@nexo-assist/tickets";
import { applySeed } from "@nexo-assist/tickets/seed/apply";
import { buildSeed } from "@nexo-assist/tickets/seed/build";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { createTicketService, type TicketsEnv } from "./tickets";

/**
 * Local-dev only (TKT-28, TKT-33): `POST /internal/seed` loads Anexo B, and
 * `/internal/tickets?as=<e-mail>` runs the ticket service as a seeded user, for the D1 smoke test
 * while login is not built (feature `acesso`). Everything is 404 unless `DEV_SEED_ENABLED=true`.
 */
export function createDevRoutes({
	enabled,
	getDb,
	env,
	now = () => new Date(),
}: {
	enabled: boolean;
	getDb: () => Database;
	env: TicketsEnv;
	now?: () => Date;
}) {
	const app = new Hono();
	if (!enabled) return app;

	// Lets the smoke test tell this server from anything else on the port.
	app.get("/internal/health", (c) => c.json({ app: "nexo-assist" }));

	app.post("/internal/seed", async (c) =>
		c.json(await applySeed(getDb(), buildSeed(now()))),
	);

	const asUser = async (db: Database, email: string | undefined) => {
		if (!email) return undefined;
		const [found] = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, email));
		if (!found) return undefined;
		const access = await createTicketService({
			db,
			env,
			session: { user: found },
		});
		return access.ok ? access : undefined;
	};

	app.get("/internal/tickets", async (c) => {
		const access = await asUser(getDb(), c.req.query("as"));
		if (!access) return c.json({ error: "unknown user" }, 404);
		return c.json(
			await access.service.list(access.actor, {
				onlyOpen: c.req.query("onlyOpen") === "true",
			}),
		);
	});

	app.post("/internal/tickets", async (c) => {
		const access = await asUser(getDb(), c.req.query("as"));
		if (!access) return c.json({ error: "unknown user" }, 404);
		const body = await c.req.json<{
			input: NewTicketInput;
			idempotencyKey: string;
		}>();
		return c.json(
			await access.service.create(
				access.actor,
				body.input,
				body.idempotencyKey,
			),
		);
	});

	return app;
}
