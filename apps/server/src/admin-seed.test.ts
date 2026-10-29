import { describe, expect, test } from "bun:test";

import { user } from "@nexo-assist/db/schema/index";
import { createTestDb } from "@nexo-assist/tickets/testing/db";

import { createAdminRoutes } from "./admin-seed";

async function setup(token: string | undefined) {
	const db = await createTestDb();
	const app = createAdminRoutes({
		token,
		getDb: () => db,
		now: () => new Date("2026-10-29T12:00:00Z"),
	});
	const seed = (authorization?: string) =>
		app.request("/admin/seed", {
			method: "POST",
			headers: authorization ? { authorization } : {},
		});
	const users = async () => (await db.select().from(user)).length;
	return { seed, users };
}

describe("deploy seed behind a token (DLV-12)", () => {
	test("without SEED_TOKEN on the server the route does not exist", async () => {
		for (const token of [undefined, "", "  "]) {
			const { seed, users } = await setup(token);
			expect((await seed("Bearer ")).status).toBe(404);
			expect(await users()).toBe(0);
		}
	});

	test("a missing or wrong token gets 401 and writes nothing", async () => {
		const { seed, users } = await setup("s3cret-token-0123456789");
		expect((await seed()).status).toBe(401);
		expect((await seed("Bearer wrong")).status).toBe(401);
		expect((await seed("s3cret-token-0123456789")).status).toBe(401);
		// Longer and shorter than the real token, sharing its start.
		expect((await seed("Bearer s3cret-token-0123456789x")).status).toBe(401);
		expect((await seed("Bearer s3cret-token-012345678")).status).toBe(401);
		expect((await seed("Bearer s3cret")).status).toBe(401);
		expect(await users()).toBe(0);
	});

	test("the right token applies the seed and returns the counts", async () => {
		const { seed, users } = await setup("s3cret-token-0123456789");
		const res = await seed("Bearer s3cret-token-0123456789");
		expect(res.status).toBe(200);
		const counts = (await res.json()) as Record<string, number>;
		expect(counts.users).toBe(7);
		expect(counts.tickets).toBe(9);
		expect(await users()).toBe(7);
	});
});
