import { describe, expect, test } from "bun:test";

import type { NewTicket, NewTicketInput } from "../types";
import {
	MAX_DESCRIPTION,
	MAX_TITLE,
	validateNewTicket,
	validateTransfer,
} from "./validate";

const valid: NewTicket = {
	title: "Notebook lento após atualização do Windows",
	description:
		"Desde a atualização de ontem o notebook demora 10 minutos para ligar.",
	type: "INC",
	category: "Hardware",
	item: "Notebook",
	priority: "Média",
	affected: "Só eu",
};

const invalidFields = (input: NewTicketInput) => {
	const result = validateNewTicket(input);
	if (result.ok) throw new Error("expected INVALID_TICKET");
	expect(result.error.code).toBe("INVALID_TICKET");
	return result.error.fields;
};

describe("validateNewTicket", () => {
	test("accepts a complete ticket and trims text", () => {
		const result = validateNewTicket({
			...valid,
			title: `  ${valid.title}  `,
			item: "  ",
		});
		expect(result).toEqual({ ok: true, value: { ...valid, item: null } });
	});

	test("item is optional", () => {
		const { item: _item, ...withoutItem } = valid;
		expect(validateNewTicket(withoutItem).ok).toBe(true);
	});

	describe("invalid fields", () => {
		for (const field of [
			"title",
			"description",
			"type",
			"category",
			"priority",
			"affected",
		] as const) {
			test(`empty ${field}`, () => {
				expect(invalidFields({ ...valid, [field]: "   " })).toEqual([field]);
			});
		}

		const outOfList = {
			type: "BUG",
			category: "Impressora",
			priority: "Urgente",
			affected: "Todo mundo",
		} as const;
		for (const [field, value] of Object.entries(outOfList)) {
			test(`${field} outside the list`, () => {
				expect(invalidFields({ ...valid, [field]: value })).toEqual([field]);
			});
		}

		test("lists every invalid field at once", () => {
			expect(
				invalidFields({
					...valid,
					title: "",
					priority: "Urgente",
					affected: "",
				}),
			).toEqual(["title", "priority", "affected"]);
		});
	});

	describe("length limits", () => {
		test(`title of ${MAX_TITLE} characters is accepted, ${MAX_TITLE + 1} is not`, () => {
			expect(
				validateNewTicket({ ...valid, title: "a".repeat(MAX_TITLE) }).ok,
			).toBe(true);
			expect(
				invalidFields({ ...valid, title: "a".repeat(MAX_TITLE + 1) }),
			).toEqual(["title"]);
		});

		test(`description of ${MAX_DESCRIPTION} characters is accepted, ${MAX_DESCRIPTION + 1} is not`, () => {
			expect(
				validateNewTicket({
					...valid,
					description: "a".repeat(MAX_DESCRIPTION),
				}).ok,
			).toBe(true);
			expect(
				invalidFields({
					...valid,
					description: "a".repeat(MAX_DESCRIPTION + 1),
				}),
			).toEqual(["description"]);
		});
	});
});

describe("validateTransfer", () => {
	test("accepts a summary and a team", () => {
		expect(
			validateTransfer({
				summary: " Notebook lento, já reiniciou. ",
				team: "Suporte N2",
			}),
		).toEqual({
			ok: true,
			value: { summary: "Notebook lento, já reiniciou.", team: "Suporte N2" },
		});
	});

	test("transfer without summary is INVALID_TRANSFER", () => {
		const result = validateTransfer({ summary: "  ", team: "Suporte N1" });
		expect(result.ok ? null : result.error).toMatchObject({
			code: "INVALID_TRANSFER",
			fields: ["summary"],
		});
	});

	test("transfer to an unknown team is INVALID_TRANSFER", () => {
		const result = validateTransfer({ summary: "Resumo", team: "Suporte N3" });
		expect(result.ok ? null : result.error).toMatchObject({
			code: "INVALID_TRANSFER",
			fields: ["team"],
		});
	});
});
