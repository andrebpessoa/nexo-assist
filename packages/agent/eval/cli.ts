import { createMastraUnderstander } from "../src/understand-mastra";
import { runEval } from "./run";

const live = process.argv.includes("--live");
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (live && !apiKey) {
	console.error("--live precisa de GOOGLE_GENERATIVE_AI_API_KEY no ambiente.");
	process.exit(1);
}
const modelId = process.env.LLM_MODEL ?? "google/gemini-2.5-flash-lite";
const report = await runEval(
	live ? () => createMastraUnderstander({ modelId, apiKey }) : undefined,
);

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
console.log(
	`Avaliação ${live ? `ao vivo (${modelId})` : "roteirizada"} - ${report.conversations} conversas\n`,
);
for (const r of report.byRule)
	console.log(
		`${pct(r.passed / r.total).padStart(5)}  ${r.passed}/${r.total}  ${r.rule}`,
	);
for (const c of report.checks.filter((x) => !x.ok))
	console.log(
		`  erro: ${c.conversation} passo ${c.step} ${c.field}: esperado ${c.expected}, veio ${c.got}`,
	);
console.log(`\nTotal: ${pct(report.accuracy)}`);
process.exit(report.accuracy >= 0.9 ? 0 : 1);
