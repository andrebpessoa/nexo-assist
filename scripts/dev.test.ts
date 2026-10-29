import { describe, expect, mock, test } from "bun:test";

import { waitThenSeed } from "./dev";

const ok = (body: unknown = {}) =>
	new Response(JSON.stringify(body), { status: 200 });

describe("bun run dev", () => {
	test("seeds once, after the server first answers", async () => {
		const calls: string[] = [];
		let up = 0;
		const fetch = mock(
			async (url: string | URL | Request, init?: RequestInit) => {
				calls.push(`${init?.method ?? "GET"} ${url}`);
				if (String(url).endsWith("/internal/health")) {
					up++;
					if (up < 3) throw new Error("ECONNREFUSED");
					return ok({ app: "nexo-assist" });
				}
				return ok({ users: 7 });
			},
		);
		const result = await waitThenSeed({
			url: "http://localhost:3000",
			fetch: fetch as unknown as typeof globalThis.fetch,
			attempts: 5,
			delayMs: 1,
		});
		expect(result).toBe("seeded");
		expect(calls).toEqual([
			"GET http://localhost:3000/internal/health",
			"GET http://localhost:3000/internal/health",
			"GET http://localhost:3000/internal/health",
			"POST http://localhost:3000/internal/seed",
		]);
	});

	test("a server that never answers is not seeded and says how to seed by hand", async () => {
		const logs: string[] = [];
		const fetch = mock(async () => {
			throw new Error("ECONNREFUSED");
		});
		const result = await waitThenSeed({
			url: "http://localhost:3000",
			fetch: fetch as unknown as typeof globalThis.fetch,
			attempts: 3,
			delayMs: 1,
			log: (l) => logs.push(l),
		});
		expect(result).toBe("timeout");
		expect(fetch).toHaveBeenCalledTimes(3);
		expect(logs.join("\n")).toContain("bun run db:seed");
	});

	test("a seed that fails is reported once, not as a server that never answered", async () => {
		for (const seed of [
			async () => new Response("boom", { status: 500 }),
			async () => {
				throw new Error("socket hang up");
			},
			async () => new Response("<html>", { status: 200 }),
		]) {
			const logs: string[] = [];
			let posts = 0;
			const fetch = mock(async (url: string | URL | Request) => {
				if (String(url).endsWith("/internal/health")) return ok();
				posts++;
				return seed();
			});
			const result = await waitThenSeed({
				url: "http://localhost:3000",
				fetch: fetch as unknown as typeof globalThis.fetch,
				attempts: 3,
				delayMs: 1,
				log: (l) => logs.push(l),
			});
			expect(result).toBe("seed_failed");
			expect(posts).toBe(1);
			expect(logs.join("\n")).toContain("bun run db:seed");
			expect(logs.join("\n")).not.toContain("não respondeu");
		}
	});
});
