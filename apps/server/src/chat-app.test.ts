import { describe, expect, test } from "bun:test";

import { seededDb } from "@nexo-assist/agent/testing";
import type { Understander } from "@nexo-assist/agent/understand";
import { createScriptedUnderstander } from "@nexo-assist/agent/understand-scripted";

import { createChatApp } from "./chat-app";
import { createUsageLimiter, limitsFrom } from "./usage";

const LIMITED = {
	error: "rate_limit",
	message: "Limite de uso atingido. Tente mais tarde.",
};

/** The chat as the server wires it, over a seeded database; `x-user` picks the session. */
async function setup(limits: { perMinute?: string; daily?: string } = {}) {
	const { db, ids } = await seededDb();
	const env = {
		GOOGLE_GENERATIVE_AI_API_KEY: "test-key",
		TICKETS_FAILURE_RATE: "0",
		RATE_LIMIT_PER_MINUTE: limits.perMinute,
		LLM_DAILY_LIMIT: limits.daily,
	};
	const model = createScriptedUnderstander([]);
	const app = createChatApp({
		getDb: () => db,
		getSession: async (_db, headers) => {
			const who = headers.get("x-user");
			return who ? { user: { id: ids[who] as string } } : null;
		},
		env,
		makeUnderstander: (): Understander => model,
		wordDelayMs: 0,
	});
	const send = (who: string, text: string) =>
		app.request("/chat/send", {
			method: "POST",
			headers: { "content-type": "application/json", "x-user": who },
			body: JSON.stringify({ text }),
		});
	const limiter = createUsageLimiter({ db, limits: limitsFrom(env) });
	return { send, model, limiter };
}

describe("chat as wired in the server (DLV-13)", () => {
	test("the 11th message of a user within a minute gets 429; another user still passes", async () => {
		const { send } = await setup();
		for (let i = 0; i < 10; i++)
			expect((await send("ana", " ")).status).toBe(400);
		const refused = await send("ana", " ");
		expect(refused.status).toBe(429);
		expect(await refused.json()).toEqual(LIMITED);
		expect((await send("bruno", " ")).status).toBe(400);
	});

	test("every model call of a turn is counted in the day's budget", async () => {
		const { send, model, limiter } = await setup();
		const res = await send("ana", "minha VPN não conecta");
		await res.text();
		const made = model.calls.understand + model.calls.judge;
		expect(made).toBeGreaterThan(0);
		expect(await limiter.modelCallsToday()).toBe(made);
	});

	test("with the day's budget spent the next message gets 429 and the model is not called", async () => {
		const { send, model } = await setup({ daily: "1" });
		await (await send("ana", "minha VPN não conecta")).text();
		const before = model.calls.understand + model.calls.judge;
		expect(before).toBe(1);
		const refused = await send("ana", "e a impressora?");
		expect(refused.status).toBe(429);
		expect(await refused.json()).toEqual(LIMITED);
		expect(model.calls.understand + model.calls.judge).toBe(before);
	});
});
