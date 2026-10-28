import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dir, "..");
const forbidden = [
	/(^|[/@-])agent(s)?([/-]|$)/i,
	/(^|\/)apps\//,
	/^server(\/|$)/,
	/^@mastra\//,
];

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		if (entry.name === "node_modules") return [];
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		return path.endsWith(".ts") ? [path] : [];
	});
}

function importsOf(code: string): string[] {
	const specifiers = code.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g);
	return [...specifiers].map((match) => match[1] ?? "");
}

function offendingImports(files: Record<string, string>): string[] {
	return Object.entries(files).flatMap(([file, code]) =>
		importsOf(code)
			.filter((specifier) =>
				forbidden.some((pattern) => pattern.test(specifier)),
			)
			.map((specifier) => `${file}: ${specifier}`),
	);
}

describe("boundaries", () => {
	test("no agent imports", () => {
		const files = Object.fromEntries(
			sourceFiles(root)
				.filter((file) => !file.endsWith("boundaries.test.ts"))
				.map((file) => [relative(root, file), readFileSync(file, "utf8")]),
		);
		expect(Object.keys(files).length).toBeGreaterThan(0);
		expect(offendingImports(files)).toEqual([]);
	});

	test("detects agent and app imports", () => {
		expect(
			offendingImports({
				"a.ts": 'import { tools } from "@nexo-assist/agent";',
				"b.ts": 'import app from "../../../apps/server/src/index";',
				"c.ts": 'import { ok } from "./types";',
			}),
		).toEqual([
			"a.ts: @nexo-assist/agent",
			"b.ts: ../../../apps/server/src/index",
		]);
	});
});
