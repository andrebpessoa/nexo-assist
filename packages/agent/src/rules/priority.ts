import type { Affected, Priority, TicketType } from "@nexo-assist/tickets";

export type AffectedAnswer = Affected | "Não sei";

/** What the agent extracted about impact and urgency; the priority itself is never asked of the model. */
export interface PriorityFacts {
	type: TicketType;
	affected: AffectedAnswer;
	/** The problem stops the person (or the team) from working. */
	blocksWork: boolean;
	/** There is a commitment today that depends on it (a meeting, a delivery). */
	sameDayCommitment: boolean;
	/** The person can keep working another way. */
	workaround: boolean;
}

/** "Não sei" is priced as "Só eu" so an unknown impact neither loops nor inflates the priority (AGT-26). */
export function effectiveAffected(affected: AffectedAnswer): Affected {
	return affected === "Não sei" ? "Só eu" : affected;
}

/** Anexo A: Crítica, Alta, Média, Baixa from impact and urgency (AGT-25). */
export function priorityFor(facts: PriorityFacts): Priority {
	const affected = effectiveAffected(facts.affected);
	if (facts.blocksWork && affected !== "Só eu") return "Crítica";
	if (facts.blocksWork || facts.sameDayCommitment) return "Alta";
	if (facts.type === "REQ") return "Baixa";
	return "Média";
}

/** One sentence the draft shows next to the priority (AGT-27). */
export function priorityReason(
	facts: PriorityFacts,
	priority: Priority,
): string {
	const affected = effectiveAffected(facts.affected);
	switch (priority) {
		case "Crítica":
			return `Crítica porque está parado para ${affected === "Toda a empresa" ? "toda a empresa" : "a sua equipe"}.`;
		case "Alta": {
			const parts = [
				facts.blocksWork ? "impede você de trabalhar" : null,
				facts.sameDayCommitment ? "há um compromisso hoje" : null,
			].filter(Boolean);
			return `Alta porque ${parts.join(" e ")}.`;
		}
		case "Média":
			return "Média porque atrapalha, mas há alternativa.";
		case "Baixa":
			return "Baixa porque é um pedido sem urgência.";
	}
}

/** The description carries the doubt so the analyst knows the impact was not confirmed (AGT-26). */
export function withImpactNote(
	description: string,
	affected: AffectedAnswer,
): string {
	return affected === "Não sei"
		? `${description}\n\nImpacto não confirmado.`
		: description;
}
