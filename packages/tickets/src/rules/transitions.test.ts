import { describe, expect, test } from "bun:test";

import { STATUSES } from "../types";
import { canReopen, canUpdate, isOpen, REOPEN_WINDOW_MS } from "./transitions";

const resolvedAt = new Date("2026-10-20T10:00:00-03:00");
const MINUTE = 60_000;

describe("isOpen", () => {
	const expected = {
		"Aguardando analista": true,
		"Em andamento": true,
		"Em atendimento": true,
		Aprovado: true,
		Resolvido: false,
		Fechado: false,
		Cancelado: false,
	} as const;

	for (const status of STATUSES) {
		test(`${status} is ${expected[status] ? "open" : "closed"}`, () => {
			expect(isOpen(status)).toBe(expected[status]);
			expect(canUpdate(status)).toBe(expected[status]);
		});
	}
});

describe("canReopen", () => {
	test("resolved exactly 7 days ago can be reopened", () => {
		const now = new Date(resolvedAt.getTime() + REOPEN_WINDOW_MS);
		expect(canReopen({ status: "Resolvido", resolvedAt }, now)).toBe(true);
	});

	test("resolved 4 days ago can be reopened", () => {
		const now = new Date(resolvedAt.getTime() + 4 * 24 * 60 * MINUTE);
		expect(canReopen({ status: "Resolvido", resolvedAt }, now)).toBe(true);
	});

	describe("reopen not allowed", () => {
		test("resolved 7 days and 1 minute ago", () => {
			const now = new Date(resolvedAt.getTime() + REOPEN_WINDOW_MS + MINUTE);
			expect(canReopen({ status: "Resolvido", resolvedAt }, now)).toBe(false);
		});

		for (const status of STATUSES.filter((status) => status !== "Resolvido")) {
			test(`status ${status}`, () => {
				expect(canReopen({ status, resolvedAt }, resolvedAt)).toBe(false);
			});
		}

		test("resolved without a resolution date", () => {
			expect(
				canReopen({ status: "Resolvido", resolvedAt: null }, resolvedAt),
			).toBe(false);
		});
	});
});
