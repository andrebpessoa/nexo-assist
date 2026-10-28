import { describe, expect, test } from "bun:test";

import { admit, employeeCount, MAX_CHARS, MESSAGE_LIMIT } from "./session";
import type { StoredMessage } from "./store";

const msg = (
	role: StoredMessage["role"],
	text: string,
	withBlock = true,
): StoredMessage => ({
	seq: 0,
	role,
	text,
	blocks: withBlock ? [{ kind: "text", text }] : [],
	decision: null,
	createdAt: new Date(0),
});

const employees = (n: number) =>
	Array.from({ length: n }, (_, i) => msg("employee", `m${i}`));

describe("session", () => {
	test("counts only employee messages", () => {
		const history = [
			msg("employee", "Meu notebook não conecta"),
			msg("agent", "Quem está sendo afetado?"),
			msg("employee", "Só eu"),
			msg("employee", "[confirm]", false),
			msg("analyst", "Oi, Ana"),
			msg("system", "Rafael Lima assumiu"),
		];
		expect(employeeCount(history)).toBe(2);
	});

	test("limit is 30 messages and 2000 chars", () => {
		expect(MESSAGE_LIMIT).toBe(30);
		expect(MAX_CHARS).toBe(2000);
	});

	test("admits text below the limit", () => {
		expect(admit(employees(29), { text: "oi" })).toBe("ok");
	});

	test("refuses the 31st message", () => {
		expect(admit(employees(30), { text: "oi" })).toBe("limit");
		expect(admit(employees(30), { action: "option", value: "Só eu" })).toBe(
			"limit",
		);
		expect(admit(employees(30), { action: "select", number: "INC-1" })).toBe(
			"limit",
		);
	});

	test("draft buttons and the analyst escape pass at the limit", () => {
		expect(admit(employees(30), { action: "confirm" })).toBe("ok");
		expect(admit(employees(30), { action: "cancel" })).toBe("ok");
		expect(admit(employees(30), { action: "analyst" })).toBe("ok");
	});

	test("refuses empty and long text", () => {
		expect(admit([], { text: "   \n " })).toBe("empty");
		expect(admit([], { text: "a".repeat(2001) })).toBe("too_long");
		expect(admit([], { text: "a".repeat(2000) })).toBe("ok");
	});
});
