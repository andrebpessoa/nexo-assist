import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { APPS, setup } from "./setup";

const ROOT = join(import.meta.dir, "..");

/** A throwaway repo root with the real `.env.example` files. */
async function fakeRoot() {
	const root = mkdtempSync(join(tmpdir(), "nexo-setup-"));
	for (const app of APPS) {
		await mkdir(join(root, app), { recursive: true });
		writeFileSync(
			join(root, app, ".env.example"),
			readFileSync(join(ROOT, app, ".env.example"), "utf8"),
		);
	}
	return root;
}

const secretOf = (env: string) =>
	/^BETTER_AUTH_SECRET=(.*)$/m.exec(env)?.[1] ?? "";

describe("bun run setup", () => {
	test("creates the missing .env files from .env.example with a fresh secret", async () => {
		const root = await fakeRoot();
		const result = setup({ root });
		expect(result).toEqual({ created: [...APPS], kept: [] });
		const server = readFileSync(join(root, "apps/server/.env"), "utf8");
		expect(secretOf(server)).toMatch(/^[A-Za-z0-9_-]{48}$/);
		expect(server).toContain("GOOGLE_GENERATIVE_AI_API_KEY=\n");
		expect(existsSync(join(root, "apps/web/.env"))).toBe(true);
	});

	test("keeps an existing .env untouched", async () => {
		const root = await fakeRoot();
		writeFileSync(join(root, "apps/server/.env"), "MINE=1\n");
		const result = setup({ root });
		expect(result).toEqual({ created: ["apps/web"], kept: ["apps/server"] });
		expect(readFileSync(join(root, "apps/server/.env"), "utf8")).toBe(
			"MINE=1\n",
		);
	});

	test("each run generates a different secret", async () => {
		const a = await fakeRoot();
		const b = await fakeRoot();
		setup({ root: a });
		setup({ root: b });
		const read = (r: string) =>
			secretOf(readFileSync(join(r, "apps/server/.env"), "utf8"));
		expect(read(a)).not.toBe(read(b));
	});
});
