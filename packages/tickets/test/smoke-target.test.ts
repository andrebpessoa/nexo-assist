import { describe, expect, test } from "bun:test";

import { smokeTarget } from "./smoke-target";

describe("smoke target", () => {
	test("without SERVER_URL there is no target, so the smoke skips", () => {
		expect(smokeTarget({})).toBeUndefined();
		expect(smokeTarget({ SERVER_URL: "  " })).toBeUndefined();
	});

	test("uses SERVER_URL as given, without a trailing slash", () => {
		expect(smokeTarget({ SERVER_URL: "http://localhost:3100/" })).toBe(
			"http://localhost:3100",
		);
	});
});
