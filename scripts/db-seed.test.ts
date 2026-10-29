import { describe, expect, test } from "bun:test";

import { seedRequest } from "./db-seed";

describe("db:seed target (DLV-12)", () => {
	test("local dev: the dev route without a token", () => {
		expect(seedRequest({})).toEqual({
			url: "http://localhost:3000/internal/seed",
			headers: {},
		});
	});

	test("with SERVER_URL and SEED_TOKEN: the protected route with the token", () => {
		expect(
			seedRequest({
				SERVER_URL: "https://server.example.workers.dev",
				SEED_TOKEN: "tok-123",
			}),
		).toEqual({
			url: "https://server.example.workers.dev/admin/seed",
			headers: { authorization: "Bearer tok-123" },
		});
	});
});
