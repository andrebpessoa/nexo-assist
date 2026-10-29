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
		for (const app of ["apps/server", "apps/web"]) {
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
