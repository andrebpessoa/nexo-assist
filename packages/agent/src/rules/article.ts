import type { Article } from "@nexo-assist/tickets";

import type { Judgement } from "../understand";

export type ArticleSignals = Pick<
	Judgement,
	"articleSlug" | "articleFits" | "articleResolves" | "articleTried"
>;

export type ArticleForTicket =
	| { kind: "answer"; article: Article }
	| { kind: "misfit"; article: Article }
	| { kind: "skip" };

/**
 * When someone asks for a ticket, an article answers only if it fixes the same symptom with no
 * ticket and they have not tried its step yet. With no signal, it does not: a draft costs less
 * than a lost request (PRE-06 to PRE-08, PRE-10).
 */
export function articleForTicket(
	signals: ArticleSignals,
	articles: Article[],
): ArticleForTicket {
	const article = articles.find((a) => a.slug === signals.articleSlug);
	if (!article) return { kind: "skip" };
	if (signals.articleResolves !== true || signals.articleTried === true)
		return { kind: "skip" };
	if (signals.articleFits === false) return { kind: "misfit", article };
	return { kind: "answer", article };
}
