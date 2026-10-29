import { describe, expect, test } from "bun:test";
import type { Article } from "@nexo-assist/tickets";

import { articleForTicket } from "./article";

const equipment = {
	slug: "pedido-de-equipamento",
	title: "Como pedir equipamento",
	body: "Monitor, teclado e mouse se pedem por chamado de Hardware.",
	appliesWhen: "Sempre.",
} as Article;
const articles = [equipment];

const signals = (s: Partial<Parameters<typeof articleForTicket>[0]>) => ({
	articleSlug: "pedido-de-equipamento",
	articleFits: true,
	articleResolves: true,
	articleTried: false,
	...s,
});

describe("article for a ticket request", () => {
	test("article outside the search is skipped", () => {
		expect(
			articleForTicket(signals({ articleSlug: "nao-buscado" }), articles),
		).toEqual({ kind: "skip" });
		expect(articleForTicket(signals({ articleSlug: null }), articles)).toEqual({
			kind: "skip",
		});
	});

	test("article that does not resolve is skipped", () => {
		expect(
			articleForTicket(signals({ articleResolves: false }), articles),
		).toEqual({ kind: "skip" });
	});

	test("missing resolves signal counts as not resolving", () => {
		expect(
			articleForTicket(signals({ articleResolves: null }), articles),
		).toEqual({ kind: "skip" });
	});

	test("article already tried is skipped", () => {
		expect(articleForTicket(signals({ articleTried: true }), articles)).toEqual(
			{ kind: "skip" },
		);
		// Already tried wins over a condition that does not hold: no "não serve" either.
		expect(
			articleForTicket(
				signals({ articleTried: true, articleFits: false }),
				articles,
			),
		).toEqual({ kind: "skip" });
	});

	test("article that resolves but does not fit is a misfit", () => {
		expect(articleForTicket(signals({ articleFits: false }), articles)).toEqual(
			{ kind: "misfit", article: equipment },
		);
	});

	test("article that resolves, fits and was not tried answers", () => {
		expect(articleForTicket(signals({}), articles)).toEqual({
			kind: "answer",
			article: equipment,
		});
		expect(
			articleForTicket(
				signals({ articleFits: null, articleTried: null }),
				articles,
			),
		).toEqual({ kind: "answer", article: equipment });
	});
});
