import type { Article } from "./types";

export const MAX_RESULTS = 3;
/** A query must hit at least a title word or a keyword; body-only hits are noise. */
export const MIN_SCORE = 2;

const WEIGHT = { title: 2, body: 1, keywords: 3 } as const;

const STOPWORDS = new Set(
	"a o as os um uma uns umas de do da dos das no na nos nas em com sem por para pra e ou que se meu minha meus minhas seu sua esta este isso ao aos esta estou ta to".split(
		" ",
	),
);

/** Lowercase, accent-free tokens without stopwords. */
export function normalize(text: string): string[] {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.split(/[^\p{L}\p{N}]+/u)
		.filter((token) => token.length > 0 && !STOPWORDS.has(token));
}

/** Up to 3 articles ordered by relevance: title hit x2, body x1, keyword x3 (TKT-31, TKT-32). */
export function rankArticles(query: string, articles: Article[]): Article[] {
	const terms = new Set(normalize(query));
	if (terms.size === 0) return [];

	return articles
		.map((article, index) => {
			const title = new Set(normalize(article.title));
			const body = new Set(normalize(article.body));
			const keywords = new Set(article.keywords.flatMap(normalize));
			let score = 0;
			for (const term of terms) {
				if (title.has(term)) score += WEIGHT.title;
				if (body.has(term)) score += WEIGHT.body;
				if (keywords.has(term)) score += WEIGHT.keywords;
			}
			return { article, index, score };
		})
		.filter((ranked) => ranked.score >= MIN_SCORE)
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.slice(0, MAX_RESULTS)
		.map((ranked) => ranked.article);
}
