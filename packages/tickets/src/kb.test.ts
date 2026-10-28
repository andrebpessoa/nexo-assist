import { describe, expect, test } from "bun:test";

import { MAX_RESULTS, normalize, rankArticles } from "./kb";
import type { Article } from "./types";

const article = (
	slug: string,
	title: string,
	body: string,
	keywords: string[],
): Article => ({
	slug,
	title,
	body,
	appliesWhen: "Sempre",
	keywords,
});

const articles: Article[] = [
	article(
		"horario-service-desk",
		"Horário do service desk",
		"De segunda a sexta, das 8h às 18h.",
		["horário", "plantão"],
	),
	article(
		"vpn-erro-809",
		"VPN com erro 809",
		"Reinstale o cliente de VPN pelo portal de softwares e reinicie o computador.",
		["vpn", "809", "conexão"],
	),
	article(
		"senha-sap",
		"Senha do SAP bloqueada",
		"Use o portal de senhas para desbloquear o SAP.",
		["sap", "senha"],
	),
	article(
		"impressora",
		"Impressora não imprime",
		"Confira se a impressora certa está selecionada.",
		["impressora"],
	),
	article(
		"vpn-lenta",
		"VPN lenta em casa",
		"Teste a conexão sem a VPN e reinicie o roteador.",
		["vpn", "lenta"],
	),
	article(
		"erro-outlook",
		"Outlook com erro ao abrir",
		"Feche o Outlook e abra em modo de segurança.",
		["outlook", "e-mail"],
	),
];

describe("rankArticles", () => {
	test("vpn 809 first", () => {
		const result = rankArticles("minha VPN está dando erro 809", articles);
		expect(result[0]?.slug).toBe("vpn-erro-809");
	});

	test("accents and case do not matter", () => {
		expect(rankArticles("HORARIO do SERVICE DESK", articles)[0]?.slug).toBe(
			"horario-service-desk",
		);
		expect(rankArticles("sénha sáp", articles)[0]?.slug).toBe("senha-sap");
	});

	test(`never more than ${MAX_RESULTS}`, () => {
		expect(
			rankArticles("vpn erro senha impressora outlook horário", articles)
				.length,
		).toBe(MAX_RESULTS);
	});

	test("no match empty", () => {
		expect(rankArticles("receita de bolo de cenoura", articles)).toEqual([]);
		expect(rankArticles("   ", articles)).toEqual([]);
	});

	test("stopwords alone do not match", () => {
		expect(rankArticles("de do da o a com", articles)).toEqual([]);
	});

	test("a keyword match passes the minimum and a body-only match does not", () => {
		// "conexão" is a keyword of vpn-erro-809 and only body text in vpn-lenta.
		expect(
			rankArticles("conexão", articles).map((found) => found.slug),
		).toEqual(["vpn-erro-809"]);
	});
});

describe("normalize", () => {
	test("lowercases and strips accents", () => {
		expect(normalize("Horário ÀS 18h")).toEqual(["horario", "18h"]);
	});
});
