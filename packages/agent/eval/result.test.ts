import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// RESULT.md is the recorded full live run (`bun run eval --live`); these tests hold it to the goal
// without calling the model again.
const result = readFileSync(join(import.meta.dir, "RESULT.md"), "utf8");
const rules = new Map(
	[...result.matchAll(/^\s*(\d+)%\s+(\d+)\/(\d+)\s+(.+)$/gm)].map((m) => [
		(m[4] as string).trim(),
		{ pct: Number(m[1]), passed: Number(m[2]), total: Number(m[3]) },
	]),
);

describe("recorded live result", () => {
	test("final live run reaches 90 percent", () => {
		expect(result).toContain("Avaliação ao vivo (");
		expect(result).toContain("- 22 conversas");
		const total = Number(/\*\*Total\*\*: (\d+)%/.exec(result)?.[1]);
		expect(total).toBeGreaterThanOrEqual(90);
		const passed = [...rules.values()].reduce((n, r) => n + r.passed, 0);
		const all = [...rules.values()].reduce((n, r) => n + r.total, 0);
		expect(passed / all).toBeGreaterThanOrEqual(0.9);
	});

	test("rules at 100 percent stay at 100 percent", () => {
		// The rules at 100% in the live run of 2026-10-29 before this work (PRE-20).
		for (const rule of [
			"Saudação e mensagens vagas",
			"Central de ajuda antes do chamado",
			"Consulta de chamados",
			"Vencido: oferecer analista",
			"Privacidade",
			"Crítica: criar e transferir",
			"Confirmar antes de gravar",
			"Só TI",
			"Seguir as regras",
		]) {
			const r = rules.get(rule);
			expect(r, rule).toBeDefined();
			expect(r?.passed, rule).toBe(r?.total as number);
		}
	});

	test("vague report transfers live", () => {
		expect(rules.get("Transferir para analista")).toBeDefined();
		expect(result).not.toContain("erro: confianca-baixa");
	});
});
