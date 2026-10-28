import { beforeEach, describe, expect, test } from "bun:test";
import type { Database } from "@nexo-assist/db";
import { user } from "@nexo-assist/db/schema/index";

import { withSimulatedFailure } from "./failure";
import { createTicketService } from "./service";
import { createTestDb } from "./testing/db";
import type { Actor, NewTicketInput, Result, TicketService } from "./types";

const ana: Actor = { kind: "employee", userId: "ana" };
const input: NewTicketInput = {
	title: "Sem acesso ao e-mail",
	description: "O Outlook pede senha toda hora.",
	type: "INC",
	category: "E-mail",
	priority: "Alta",
	affected: "Só eu",
};

let db: Database;
let real: TicketService;

/** Deterministic pseudo-random sequence (LCG), so the retry test is reproducible. */
function seededRandom(seed: number) {
	let state = seed;
	return () => {
		state = (state * 1_664_525 + 1_013_904_223) % 2 ** 32;
		return state / 2 ** 32;
	};
}

const code = <T>(result: Result<T>) => (result.ok ? "ok" : result.error.code);

beforeEach(async () => {
	db = await createTestDb();
	await db
		.insert(user)
		.values({ id: "ana", name: "Ana Souza", email: "ana.souza@nexo.com.br" });
	real = createTicketService({ db });
});

describe("withSimulatedFailure", () => {
	test("fails before writing when the rate is 1", async () => {
		const flaky = withSimulatedFailure(real, { rate: 1 });
		const result = await flaky.create(ana, input, "k1");
		expect(result).toEqual({
			ok: false,
			error: { code: "SERVICE_UNAVAILABLE", message: expect.any(String) },
		});
		expect(await real.list(ana)).toEqual({ ok: true, value: [] });
		const calls: Promise<Result<unknown>>[] = [
			flaky.list(ana),
			flaky.get(ana, "INC-00001"),
			flaky.addNote(ana, "INC-00001", "x"),
			flaky.reopen(ana, "INC-00001", "x"),
			flaky.transfer(ana, "INC-00001", { summary: "x", team: "Suporte N1" }),
			flaky.assume(
				{ kind: "analyst", userId: "ana", name: "Ana", team: "Suporte N1" },
				"INC-00001",
			),
			flaky.searchArticles("vpn"),
		];
		for (const call of calls) {
			expect(code(await call)).toBe("SERVICE_UNAVAILABLE");
		}
	});

	test("rate zero never fails", async () => {
		const flaky = withSimulatedFailure(real, { rate: 0, random: () => 0 });
		for (let i = 0; i < 20; i++) {
			expect(code(await flaky.create(ana, input, `k${i}`))).toBe("ok");
		}
		expect(code(await flaky.list(ana))).toBe("ok");
	});

	test("fails exactly when the draw is below the rate", async () => {
		const draws = [0.29, 0.3, 0.31, 0];
		const flaky = withSimulatedFailure(real, {
			rate: 0.3,
			random: () => draws.shift() ?? 1,
		});
		const results = [];
		for (let i = 0; i < 4; i++) results.push(code(await flaky.list(ana)));
		expect(results).toEqual([
			"SERVICE_UNAVAILABLE",
			"ok",
			"ok",
			"SERVICE_UNAVAILABLE",
		]);
	});

	test("adds the configured extra latency", async () => {
		const waits: number[] = [];
		const flaky = withSimulatedFailure(real, {
			rate: 0,
			extraLatencyMs: 1500,
			sleep: async (ms) => {
				waits.push(ms);
			},
		});
		await flaky.list(ana);
		expect(waits).toEqual([1500]);
	});

	test("100 creations with rate 0.3 and retry with the same key give exactly 100 tickets", async () => {
		const flaky = withSimulatedFailure(real, {
			rate: 0.3,
			random: seededRandom(42),
		});
		let failures = 0;
		for (let i = 0; i < 100; i++) {
			for (;;) {
				const result = await flaky.create(
					ana,
					{ ...input, title: `Chamado ${i}` },
					`conversa:${i}`,
				);
				if (result.ok) break;
				failures++;
			}
		}
		const list = await real.list(ana);
		expect(list.ok && list.value.length).toBe(100);
		expect(failures).toBeGreaterThan(10);
	});
});
