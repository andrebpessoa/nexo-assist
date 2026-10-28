import {
	AFFECTED,
	CATEGORIES,
	fail,
	type NewTicket,
	type NewTicketInput,
	ok,
	PRIORITIES,
	type Result,
	TEAMS,
	TICKET_TYPES,
	type Transfer,
} from "../types";

export const MAX_TITLE = 120;
export const MAX_DESCRIPTION = 4000;

const oneOf = (list: readonly string[], value: string): boolean =>
	list.includes(value);

/** Checks required fields, allowed values and length limits (TKT-08 to TKT-10); lists every invalid field. */
export function validateNewTicket(input: NewTicketInput): Result<NewTicket> {
	const title = input.title?.trim() ?? "";
	const description = input.description?.trim() ?? "";
	const type = input.type?.trim() ?? "";
	const category = input.category?.trim() ?? "";
	const priority = input.priority?.trim() ?? "";
	const affected = input.affected?.trim() ?? "";
	const item = input.item?.trim() || null;

	const fields: string[] = [];
	if (!title || title.length > MAX_TITLE) fields.push("title");
	if (!description || description.length > MAX_DESCRIPTION)
		fields.push("description");
	if (!oneOf(TICKET_TYPES, type)) fields.push("type");
	if (!oneOf(CATEGORIES, category)) fields.push("category");
	if (!oneOf(PRIORITIES, priority)) fields.push("priority");
	if (!oneOf(AFFECTED, affected)) fields.push("affected");
	if (fields.length > 0)
		return fail(
			"INVALID_TICKET",
			"Chamado incompleto ou com valores inválidos.",
			fields,
		);

	return ok({
		title,
		description,
		type: type as NewTicket["type"],
		category: category as NewTicket["category"],
		item,
		priority: priority as NewTicket["priority"],
		affected: affected as NewTicket["affected"],
	});
}

/** A transfer needs a summary for the analyst and a known team (TKT-24). */
export function validateTransfer(input: {
	summary: string;
	team: string;
}): Result<Transfer> {
	const summary = input.summary?.trim() ?? "";
	const team = input.team?.trim() ?? "";
	const fields: string[] = [];
	if (!summary) fields.push("summary");
	if (!oneOf(TEAMS, team)) fields.push("team");
	if (fields.length > 0)
		return fail(
			"INVALID_TRANSFER",
			"Transferência precisa de resumo e equipe.",
			fields,
		);
	return ok({ summary, team: team as Transfer["team"] });
}
