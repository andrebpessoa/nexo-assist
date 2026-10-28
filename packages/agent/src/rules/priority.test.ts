import { describe, expect, test } from "bun:test";
import {
	effectiveAffected,
	type PriorityFacts,
	priorityFor,
	priorityReason,
	withImpactNote,
} from "./priority";

const base: PriorityFacts = {
	type: "INC",
	affected: "Só eu",
	blocksWork: false,
	sameDayCommitment: false,
	workaround: true,
};

describe("priority", () => {
	test("priority from impact and urgency", () => {
		expect(
			priorityFor({ ...base, blocksWork: true, affected: "Minha equipe" }),
		).toBe("Crítica");
		expect(
			priorityFor({ ...base, blocksWork: true, affected: "Toda a empresa" }),
		).toBe("Crítica");
		expect(priorityFor({ ...base, blocksWork: true, workaround: false })).toBe(
			"Alta",
		);
		expect(priorityFor({ ...base, sameDayCommitment: true })).toBe("Alta");
		expect(priorityFor(base)).toBe("Média");
		expect(priorityFor({ ...base, affected: "Minha equipe" })).toBe("Média");
		expect(priorityFor({ ...base, type: "REQ", workaround: false })).toBe(
			"Baixa",
		);
		expect(priorityFor({ ...base, type: "REQ", sameDayCommitment: true })).toBe(
			"Alta",
		);
		expect(
			priorityReason(
				{ ...base, blocksWork: true, affected: "Minha equipe" },
				"Crítica",
			),
		).toBe("Crítica porque está parado para a sua equipe.");
		expect(
			priorityReason(
				{ ...base, blocksWork: true, sameDayCommitment: true },
				"Alta",
			),
		).toBe("Alta porque impede você de trabalhar e há um compromisso hoje.");
		expect(priorityReason(base, "Média")).toBe(
			"Média porque atrapalha, mas há alternativa.",
		);
		expect(priorityReason({ ...base, type: "REQ" }, "Baixa")).toBe(
			"Baixa porque é um pedido sem urgência.",
		);
	});

	test("not sure counts as only me", () => {
		const unsure = { ...base, affected: "Não sei" as const, blocksWork: true };
		expect(priorityFor(unsure)).toBe(
			priorityFor({ ...unsure, affected: "Só eu" }),
		);
		expect(priorityFor(unsure)).toBe("Alta");
		expect(effectiveAffected("Não sei")).toBe("Só eu");
		expect(effectiveAffected("Minha equipe")).toBe("Minha equipe");
		expect(withImpactNote("VPN cai.", "Não sei")).toBe(
			"VPN cai.\n\nImpacto não confirmado.",
		);
		expect(withImpactNote("VPN cai.", "Só eu")).toBe("VPN cai.");
	});
});
