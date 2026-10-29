import { expect, test } from "bun:test";
import { readFileSync, statSync } from "node:fs";
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
