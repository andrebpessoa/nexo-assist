import type { Priority } from "@nexo-assist/tickets";

/** What the analyst reads first: problem, what was tried, the ticket, priority and why (AGT-39). */
export function transferSummary(input: {
	problem: string;
	tried: string[];
	ticketNumber: string | null;
	priority: Priority | null;
	reason: string;
}): string {
	return [
		`Problema: ${input.problem}`,
		`Já tentado: ${input.tried.length ? input.tried.join("; ") : "nada ainda"}`,
		`Chamado: ${input.ticketNumber ?? "nenhum"}`,
		`Prioridade: ${input.priority ?? "não definida"}`,
		`Motivo: ${input.reason}`,
	].join("\n");
}
