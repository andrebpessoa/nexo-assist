import { beforeEach, describe, expect, test } from "bun:test";

import type { Database } from "@nexo-assist/db";
import { user } from "@nexo-assist/db/schema/auth";
import { applySeed } from "@nexo-assist/tickets/seed/apply";
import { buildSeed } from "@nexo-assist/tickets/seed/build";
import { createTestDb } from "@nexo-assist/tickets/testing/db";
import { count } from "drizzle-orm";

import { createAuth } from "./index";

const origin = "http://127.0.0.1:3101";
const env = {
	BETTER_AUTH_URL: "http://127.0.0.1:3100",
	BETTER_AUTH_SECRET: "test-secret-with-at-least-thirty-two-chars",
	CORS_ORIGIN: origin,
};

let db: Database;
let auth: ReturnType<typeof createAuth>;

beforeEach(async () => {
	db = await createTestDb();
	await applySeed(db, buildSeed(new Date("2026-10-28T12:00:00Z")));
	auth = createAuth(env, db);
});

function post(path: string, body: unknown) {
	return auth.handler(
		new Request(`${env.BETTER_AUTH_URL}/api/auth${path}`, {
			method: "POST",
			headers: { "content-type": "application/json", origin },
			body: JSON.stringify(body),
		}),
	);
}

const sessionCookie = (response: Response) =>
	response.headers
		.getSetCookie()
		.find((cookie) => cookie.includes("session_token="));

async function sessionEmail(response: Response) {
	const cookie = sessionCookie(response)?.split(";")[0];
	if (!cookie) return null;
	const session = await auth.api.getSession({
		headers: new Headers({ cookie }),
	});
	return session?.user.email ?? null;
}

describe("seed login", () => {
	test("employee signs in with any non-empty password", async () => {
		const response = await post("/sign-in/seed", {
			email: "ana.souza@nexo.com.br",
			password: "qualquer",
		});
		expect(response.status).toBe(200);
		expect(await response.clone().json()).toMatchObject({
			role: "employee",
			redirectTo: "/atendimento",
		});
		expect(await sessionEmail(response)).toBe("ana.souza@nexo.com.br");
	});

	test("analyst signs in and is sent to the console", async () => {
		const response = await post("/sign-in/seed", {
			email: "rafael.lima@nexo.com.br",
			password: "x",
		});
		expect(await response.clone().json()).toMatchObject({
			role: "analyst",
			redirectTo: "/console",
		});
		expect(await sessionEmail(response)).toBe("rafael.lima@nexo.com.br");
	});

	test("email is normalized: case and surrounding spaces", async () => {
		const response = await post("/sign-in/seed", {
			email: "  Ana.Souza@NEXO.com.br ",
			password: "x",
		});
		expect(response.status).toBe(200);
		expect(await sessionEmail(response)).toBe("ana.souza@nexo.com.br");
	});

	test("unknown email answers EMAIL_NOT_FOUND without a session", async () => {
		const response = await post("/sign-in/seed", {
			email: "fulano@nexo.com.br",
			password: "x",
		});
		expect(response.status).toBe(401);
		expect(await response.clone().json()).toMatchObject({
			code: "EMAIL_NOT_FOUND",
		});
		expect(sessionCookie(response)).toBeUndefined();
	});

	test("empty password is refused without a session", async () => {
		const response = await post("/sign-in/seed", {
			email: "ana.souza@nexo.com.br",
			password: "   ",
		});
		expect(response.status).toBe(400);
		expect(sessionCookie(response)).toBeUndefined();
	});

	test("remember me keeps 30 days; otherwise a browser-session cookie", async () => {
		const kept = sessionCookie(
			await post("/sign-in/seed", {
				email: "ana.souza@nexo.com.br",
				password: "x",
				rememberMe: true,
			}),
		);
		expect(kept).toContain(`Max-Age=${60 * 60 * 24 * 30}`);

		const browser = sessionCookie(
			await post("/sign-in/seed", {
				email: "ana.souza@nexo.com.br",
				password: "x",
				rememberMe: false,
			}),
		);
		expect(browser).toBeDefined();
		expect(browser).not.toContain("Max-Age");
	});

	test("no sign up: sign-up/email creates no user", async () => {
		const [before] = await db.select({ total: count() }).from(user);
		const response = await post("/sign-up/email", {
			email: "novo@nexo.com.br",
			password: "senha-longa-123",
			name: "Novo",
		});
		const [after] = await db.select({ total: count() }).from(user);
		expect(response.ok).toBe(false);
		expect(after?.total).toBe(before?.total);
	});
});
