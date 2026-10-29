import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
	createMastraUnderstander,
	DEFAULT_MODEL,
} from "../src/understand-mastra";
import { onlyArg, runEval, selectConversations, writesResult } from "./run";

function fail(message: string): never {
	console.error(message);
	// Bun types `process.exit` as void here, so it does not narrow on its own.
	return process.exit(1) as never;
}

const live = process.argv.includes("--live");
const only = onlyArg(process.argv.slice(2));
const picked = selectConversations(only);
if (!picked.ok)
	fail(`Conversa desconhecida em --only: ${picked.unknown.join(", ")}.`);
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (live && !apiKey)
	fail("--live precisa de GOOGLE_GENERATIVE_AI_API_KEY no ambiente.");
const modelId = process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;
// The free tier allows few requests per minute; live runs wait between conversations.
const pauseMs = Number(process.env.EVAL_PAUSE_MS ?? (live ? 4000 : 0));
const report = await runEval(
	live ? () => createMastraUnderstander({ modelId, apiKey }) : undefined,
	{ pauseMs, conversations: picked.conversations },
);

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const title = `Avaliação ${live ? `ao vivo (${modelId})` : "roteirizada"} - ${report.conversations} conversas`;
const rules = report.byRule.map(
	(r) =>
		`${pct(r.passed / r.total).padStart(5)}  ${r.passed}/${r.total}  ${r.rule}`,
);
const errors = report.checks
	.filter((x) => !x.ok)
	.map(
		(c) =>
			`erro: ${c.conversation} passo ${c.step} ${c.field}: esperado ${c.expected}, veio ${c.got}`,
	);
const u = report.usage;
const usage = `Tokens: ${u.inputTokens} de entrada, ${u.outputTokens} de saída. Custo no pago: US$ ${u.costUsd.toFixed(4)} (US$ ${u.costPerConversationUsd.toFixed(5)} por conversa).`;

console.log(`${title}\n`);
for (const l of rules) console.log(l);
for (const l of errors) console.log(`  ${l}`);
console.log(`\nTotal: ${pct(report.accuracy)}\n${usage}`);

if (writesResult({ live, only })) {
	const date = new Date().toISOString().slice(0, 10);
	writeFileSync(
		join(import.meta.dir, "RESULT.md"),
		[
			"# Último resultado da avaliação ao vivo",
			"",
			`${title}, em ${date}. Gerado por \`bun run eval --live\` na raiz.`,
			"",
			"```",
			...rules,
			"```",
			"",
			`**Total**: ${pct(report.accuracy)} dos campos esperados.`,
			"",
			usage,
			"",
			errors.length ? "## Erros\n" : "Nenhum erro.",
			...errors.map((e) => `- ${e}`),
			"",
		].join("\n"),
	);
	console.log("Resultado gravado em packages/agent/eval/RESULT.md");
} else if (live)
	console.log("Rodada parcial (--only): RESULT.md não foi gravado.");
process.exit(report.accuracy >= 0.9 ? 0 : 1);
