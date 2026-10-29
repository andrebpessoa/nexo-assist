import {
	AFFECTED,
	type Article,
	CATEGORIES,
	TICKET_TYPES,
} from "@nexo-assist/tickets";
import { z } from "zod";

import { INTENTS, type Pending, type TicketView, type Usage } from "./types";
import type { ModelWindow } from "./window";

const score = z.number().min(0).max(100);

/**
 * What the model returns for one employee message. It reads; it never decides the priority, never
 * writes the reply and never sees another employee's data (design.md › Approach A).
 */
export const UnderstandingSchema = z.object({
	intent: z.enum(INTENTS),
	confidence: score,
	ticketNumber: z.string().nullable(),
	ticketHint: z.string().nullable(),
	wantsAnalyst: z.boolean(),
	manipulation: z.boolean(),
	aboutOtherPerson: z.boolean(),
	outOfScopeArea: z.enum(["RH", "Financeiro", "Facilities"]).nullable(),
	answer: z.enum(["sim", "nao"]).nullable(),
	noteText: z.string().nullable(),
	fields: z.object({
		title: z.string().nullable(),
		description: z.string().nullable(),
		type: z.enum(TICKET_TYPES).nullable(),
		typeConfidence: score.nullable(),
		category: z.enum(CATEGORIES).nullable(),
		categoryConfidence: score.nullable(),
		item: z.string().nullable(),
		affected: z.enum([...AFFECTED, "Não sei"]).nullable(),
		blocksWork: z.boolean().nullable(),
		sameDayCommitment: z.boolean().nullable(),
		workaround: z.boolean().nullable(),
	}),
});
export type Understanding = z.infer<typeof UnderstandingSchema>;

/** Second, optional call: does an article fit this person, and is one of their tickets the same problem? */
export const JudgementSchema = z.object({
	articleSlug: z.string().nullable(),
	articleFits: z.boolean().nullable(),
	articleMisfitReason: z.string().nullable(),
	/** Following the article fixes this symptom with no ticket (not just how to ask for one). */
	articleResolves: z.boolean().nullable(),
	/** The person says they already did the article's step. */
	articleTried: z.boolean().nullable(),
	sameProblemNumber: z.string().nullable(),
	sameProblemConfidence: score,
});
export type Judgement = z.infer<typeof JudgementSchema>;

export interface EmployeeProfile {
	name: string;
	os: string | null;
	department: string | null;
}

export interface UnderstandInput {
	window: ModelWindow;
	profile: EmployeeProfile;
	pending: Pending | null;
}

export interface JudgeInput {
	message: string;
	profile: EmployeeProfile;
	articles: Article[];
	tickets: TicketView[];
}

export interface Understander {
	understand(
		input: UnderstandInput,
	): Promise<{ understanding: Understanding; usage?: Usage }>;
	judge(input: JudgeInput): Promise<{ judgement: Judgement; usage?: Usage }>;
}

export function emptyUnderstanding(): Understanding {
	return {
		intent: "outro",
		confidence: 100,
		ticketNumber: null,
		ticketHint: null,
		wantsAnalyst: false,
		manipulation: false,
		aboutOtherPerson: false,
		outOfScopeArea: null,
		answer: null,
		noteText: null,
		fields: {
			title: null,
			description: null,
			type: null,
			typeConfidence: null,
			category: null,
			categoryConfidence: null,
			item: null,
			affected: null,
			blocksWork: null,
			sameDayCommitment: null,
			workaround: null,
		},
	};
}

export function emptyJudgement(): Judgement {
	return {
		articleSlug: null,
		articleFits: null,
		articleMisfitReason: null,
		articleResolves: null,
		articleTried: null,
		sameProblemNumber: null,
		sameProblemConfidence: 0,
	};
}
