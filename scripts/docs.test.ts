import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/** `NAME=value` lines of an env file, comments left out. */
const vars = (text: string) =>
	new Map(
		text
			.split("\n")
			.map((l) => /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(l.trim()))
			.filter((m): m is RegExpExecArray => m !== null)
			.map((m) => [m[1] as string, m[2] as string]),
	);

describe(".env.example", () => {
	test("env example covers every schema variable", () => {
		for (const app of ["apps/server", "apps/web", "packages/infra"]) {
			const schema = vars(read(`${app}/.env.schema`));
			const example = vars(read(`${app}/.env.example`));
			expect([...example.keys()].sort()).toEqual([...schema.keys()].sort());
		}
		const server = vars(read("apps/server/.env.example"));
		expect(server.get("GOOGLE_GENERATIVE_AI_API_KEY")).toBe("");
		expect(server.get("BETTER_AUTH_SECRET")).toBe("");
		expect(server.get("LLM_MODEL")).toBe("google/gemini-3.5-flash-lite");
		expect(server.get("BETTER_AUTH_URL")).toBe("http://localhost:3000");
		expect(server.get("CORS_ORIGIN")).toBe("http://localhost:3001");
		expect(vars(read("apps/web/.env.example")).get("VITE_SERVER_URL")).toBe(
			"http://localhost:3000",
		);
	});
});

describe("README", () => {
	const readme = read("README.md");
	const result = read("packages/agent/eval/RESULT.md");

	test("README has the six sections", () => {
		const headings = readme
			.split("\n")
			.filter((l) => l.startsWith("## "))
			.map((l) => l.slice(3).trim());
		for (const section of [
			"Como rodar",
			"Arquitetura",
			"Como o agent decide",
			"Como garanti a qualidade das decisões",
			"Trade-offs",
			"O que faria com mais tempo",
		])
			expect(headings).toContain(section);
	});

	test("README explains the model and the cost per conversation", () => {
		const perConversation = /US\$ ([0-9.]+) por conversa/.exec(result)?.[1];
		expect(perConversation).toBeDefined();
		expect(readme).toContain(`US$ ${perConversation} por conversa`);
		expect(readme).toContain("**Escolha do modelo.**");
		expect(readme).toContain("google/gemini-3.5-flash-lite");
	});

	test("README justifies the module split", () => {
		for (const module of ["apps/web", "packages/agent", "packages/tickets"])
			expect(readme).toContain(`\`${module}\``);
		expect(readme).toContain("**Por que separar assim.**");
		expect(readme).toContain("TicketService");
	});

	test("README shows the last eval result", () => {
		expect(readme).toContain("bun run eval --live");
		// --live reads the key the README tells people to put in apps/server/.env.
		expect(read("packages/agent/package.json")).toContain(
			"--env-file=../../apps/server/.env",
		);
		const total = /\*\*Total\*\*: ([0-9]+%)/.exec(result)?.[1];
		expect(total).toBeDefined();
		expect(readme).toContain(`**${total}** dos campos`);
		// Every rule of the run shows in the README with the same score.
		const rules = [...result.matchAll(/^\s*(\d+%)\s+(\d+\/\d+)\s+(.+)$/gm)].map(
			(m) => ({ pct: m[1], count: m[2], rule: (m[3] as string).trim() }),
		);
		expect(rules.length).toBeGreaterThanOrEqual(10);
		const lines = readme.split("\n");
		for (const { pct, count, rule } of rules) {
			const line = lines.find((l) => l.startsWith(`| ${rule} `));
			expect(line, rule).toBeDefined();
			expect(line, rule).toContain(`${pct} (${count})`);
		}
	});

	test("README explains the AI Studio key and the free tier", () => {
		expect(readme).toContain("https://aistudio.google.com/apikey");
		expect(readme).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
		expect(readme).toContain("LLM_MODEL");
		expect(readme).toContain("limites por projeto");
		expect(readme).toContain("dados fictícios");
	});

	test("README explains the deploy and how keys are protected", () => {
		const headings = readme
			.split("\n")
			.filter((l) => l.startsWith("## "))
			.map((l) => l.slice(3).trim());
		expect(headings).toContain("Deploy");
		const deploy = readme.slice(readme.indexOf("## Deploy"));
		expect(deploy).toMatch(
			/https:\/\/nexo-assist-web-[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/,
		);
		for (const term of [
			"bun run deploy",
			"secret",
			"ALCHEMY_PASSWORD",
			".env.production.local",
			"RATE_LIMIT_PER_MINUTE",
			"LLM_DAILY_LIMIT",
			"Limite de uso atingido. Tente mais tarde.",
			"SEED_TOKEN",
			"/admin/seed",
		])
			expect(deploy, term).toContain(term);
	});
});
