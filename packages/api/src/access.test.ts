import { beforeEach, describe, expect, test } from "bun:test";

import type { Session } from "@nexo-assist/auth";
import type { Database } from "@nexo-assist/db";
import { user } from "@nexo-assist/db/schema/auth";
import { applySeed } from "@nexo-assist/tickets/seed/apply";
import { buildSeed } from "@nexo-assist/tickets/seed/build";
import { createTestDb } from "@nexo-assist/tickets/testing/db";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { initials, passwordAgeDays } from "./access";
import { buildContext } from "./context";
import { analystProcedure, employeeProcedure, router } from "./index";
import { appRouter } from "./routers/index";

let db: Database;

beforeEach(async () => {
	db = await createTestDb();
	await applySeed(db, buildSeed(new Date()));
});

async function sessionOf(email: string): Promise<Session> {
	const [found] = await db.select().from(user).where(eq(user.email, email));
	if (!found) throw new Error(`no seed user ${email}`);
	return { user: found, session: { userId: found.id } } as unknown as Session;
}

const probe = router({
	employeeOnly: employeeProcedure.query(() => "employee"),
	analystOnly: analystProcedure.query(() => "analyst"),
});

async function codeOf(call: () => Promise<unknown>) {
	try {
		await call();
		return "OK";
	} catch (error) {
		return error instanceof TRPCError ? error.code : String(error);
	}
}

describe("role procedures", () => {
	test("role procedures: UNAUTHORIZED without session, FORBIDDEN for the wrong role", async () => {
		const anonymous = probe.createCaller(
			await buildContext({ db, session: null }),
		);
		const ana = probe.createCaller(
			await buildContext({
				db,
				session: await sessionOf("ana.souza@nexo.com.br"),
			}),
		);
		const rafael = probe.createCaller(
			await buildContext({
				db,
				session: await sessionOf("rafael.lima@nexo.com.br"),
			}),
		);

		expect(await codeOf(() => anonymous.employeeOnly())).toBe("UNAUTHORIZED");
		expect(await codeOf(() => anonymous.analystOnly())).toBe("UNAUTHORIZED");
		expect(await codeOf(() => ana.employeeOnly())).toBe("OK");
		expect(await codeOf(() => ana.analystOnly())).toBe("FORBIDDEN");
		expect(await codeOf(() => rafael.analystOnly())).toBe("OK");
		expect(await codeOf(() => rafael.employeeOnly())).toBe("FORBIDDEN");
	});

	test("a session without a profile has no role and is FORBIDDEN", async () => {
		const ghost = {
			user: { id: "nobody", name: "Ninguém", email: "x@nexo.com.br" },
			session: { userId: "nobody" },
		} as unknown as Session;
		const caller = probe.createCaller(
			await buildContext({ db, session: ghost }),
		);
		expect(await codeOf(() => caller.employeeOnly())).toBe("FORBIDDEN");
	});
});

describe("me", () => {
	test("me returns name, email, role, initials and password age in days", async () => {
		const caller = appRouter.createCaller(
			await buildContext({
				db,
				session: await sessionOf("ana.souza@nexo.com.br"),
			}),
		);
		expect(await caller.me()).toEqual({
			name: "Ana Souza",
			email: "ana.souza@nexo.com.br",
			role: "employee",
			initials: "AS",
			passwordAgeDays: 42,
		});
	});

	test("password age in days counts whole days and is null without a date", () => {
		const now = new Date("2026-10-28T12:00:00Z");
		expect(passwordAgeDays(new Date("2026-09-16T12:00:00Z"), now)).toBe(42);
		expect(passwordAgeDays(new Date("2026-10-28T01:00:00Z"), now)).toBe(0);
		expect(passwordAgeDays(new Date("2026-10-26T13:00:00Z"), now)).toBe(1);
		expect(passwordAgeDays(null, now)).toBeNull();
	});

	test("initials use the first and last names", () => {
		expect(initials("Ana Souza")).toBe("AS");
		expect(initials("Marina de Oliveira Teixeira")).toBe("MT");
		expect(initials("rafael")).toBe("R");
	});
});
