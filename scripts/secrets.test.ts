import { expect, test } from "bun:test";
import {
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
// Google API keys: "AIza" and 35 more characters.
const GOOGLE_KEY = /AIza[0-9A-Za-z_-]{35}/;

test("no Google key in tracked files, and none reaches the browser", () => {
	const files = Bun.spawnSync(["git", "ls-files"], { cwd: ROOT })
		.stdout.toString()
		.split("\n")
		.filter(Boolean);
	expect(files.length).toBeGreaterThan(100);
	const leaks = files.filter((f) => {
		const path = join(ROOT, f);
		try {
			if (statSync(path).size > 5_000_000) return false;
			return GOOGLE_KEY.test(readFileSync(path, "utf8"));
		} catch {
			return false;
		}
	});
	expect(leaks).toEqual([]);
	// The browser only gets what apps/web declares; the model key lives in apps/server.
	const web = readFileSync(join(ROOT, "apps/web/.env.schema"), "utf8");
	expect(web).not.toContain("GOOGLE_GENERATIVE_AI_API_KEY");
	expect(web).not.toContain("LLM_MODEL");
});

/** Every file under `dir`, recursively. */
const walk = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
	);

test("the browser bundle carries no key", () => {
	const out = mkdtempSync(join(tmpdir(), "nexo-web-"));
	const build = Bun.spawnSync(
		["bunx", "vite", "build", "--outDir", out, "--emptyOutDir"],
		{ cwd: join(ROOT, "apps/web"), stderr: "pipe", stdout: "pipe" },
	);
	expect(build.exitCode).toBe(0);
	const serverEnv = join(ROOT, "apps/server/.env");
	// Values of the server's secrets, when this machine has them; a name alone is not a secret.
	const env = existsSync(serverEnv) ? readFileSync(serverEnv, "utf8") : "";
	const secretValue = (name: string) =>
		new RegExp(`^${name}=(.*)$`, "m")
			.exec(env)?.[1]
			?.replace(/"/g, "")
			.trim() ?? "";
	const secrets = [
		secretValue("GOOGLE_GENERATIVE_AI_API_KEY"),
		secretValue("BETTER_AUTH_SECRET"),
	].filter((v) => v.length >= 16);
	const files = walk(out);
	expect(files.some((f) => f.endsWith(".js"))).toBe(true);
	const leaks = files.filter((f) => {
		const text = readFileSync(f, "utf8");
		return (
			GOOGLE_KEY.test(text) ||
			text.includes("GOOGLE_GENERATIVE_AI_API_KEY") ||
			secrets.some((v) => text.includes(v))
		);
	});
	expect(leaks).toEqual([]);
}, 120_000);
