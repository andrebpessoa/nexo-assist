import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { CONVERSATIONS } from "./conversations";
import {
	onlyArg,
	runEval,
	selectConversations,
	usageOf,
	writesResult,
} from "./run";

describe("evaluation", () => {
	test("eval set", async () => {
		expect(CONVERSATIONS.length).toBeGreaterThanOrEqual(22);
		const report = await runEval();
		const wrong = report.checks.filter((c) => !c.ok);
		expect(wrong).toEqual([]);
		expect(report.accuracy).toBeGreaterThanOrEqual(0.9);
		expect(report.byRule.length).toBeGreaterThanOrEqual(10);
	});

	test("cost per conversation divides the total by the conversations", () => {
		expect(
			usageOf(
				{ inputTokens: 12697, outputTokens: 4022, costUsd: 0.0139141 },
				22,
			),
		).toEqual({
			inputTokens: 12697,
			outputTokens: 4022,
			costUsd: 0.013914,
			costPerConversationUsd: 0.000632,
		});
	});

	test("pauses between conversations and reports tokens and cost per conversation", async () => {
		const pauses: number[] = [];
		const report = await runEval(undefined, {
			pauseMs: 250,
			sleep: async (ms) => {
				pauses.push(ms);
			},
		});
		expect(pauses).toEqual(Array(CONVERSATIONS.length - 1).fill(250));
		expect(report.usage).toEqual({
			inputTokens: 0,
			outputTokens: 0,
			costUsd: 0,
			costPerConversationUsd: 0,
		});
	});

	test("only runs the chosen conversations", async () => {
		const picked = selectConversations(
			onlyArg(["--live", "--only", "saudacao,consulta-nenhum"]),
		);
		if (!picked.ok) throw new Error("ids should be known");
		const report = await runEval(undefined, {
			conversations: picked.conversations,
		});
		expect(report.conversations).toBe(2);
		expect([...new Set(report.checks.map((c) => c.conversation))]).toEqual([
			"saudacao",
			"consulta-nenhum",
		]);
		expect(report.byRule.map((r) => r.rule)).toEqual([
			"Saudação e mensagens vagas",
			"Consulta de chamados",
		]);
		expect(report.checks).toHaveLength(4);
	});

	test("only runs a repeated conversation once", () => {
		expect(onlyArg(["--only=saudacao,saudacao"])).toEqual(["saudacao"]);
		const picked = selectConversations(["saudacao", "saudacao"]);
		expect(picked.ok && picked.conversations.map((c) => c.id)).toEqual([
			"saudacao",
		]);
	});

	test("without only runs all 22", async () => {
		expect(onlyArg(["--live"])).toBeNull();
		const picked = selectConversations(null);
		expect(picked.ok && picked.conversations).toEqual(CONVERSATIONS);
		const report = await runEval();
		expect(report.conversations).toBe(22);
		expect(new Set(report.checks.map((c) => c.conversation)).size).toBe(22);
	});

	test("partial run never writes RESULT.md", () => {
		expect(writesResult({ live: true, only: ["saudacao"] })).toBe(false);
		expect(writesResult({ live: false, only: ["saudacao"] })).toBe(false);
		expect(writesResult({ live: false, only: null })).toBe(false);
		expect(writesResult({ live: true, only: null })).toBe(true);
	});

	test("only without ids exits 1", async () => {
		expect(onlyArg(["--only="])).toEqual([]);
		expect(onlyArg(["--live", "--only"])).toEqual([]);
		expect(selectConversations([])).toEqual({ ok: false, unknown: [] });
		const run = Bun.spawn(["bun", "eval/cli.ts", "--only="], {
			cwd: join(import.meta.dir, ".."),
			stdout: "pipe",
			stderr: "pipe",
		});
		const [code, out, err] = await Promise.all([
			run.exited,
			new Response(run.stdout).text(),
			new Response(run.stderr).text(),
		]);
		expect(code).toBe(1);
		expect(err).toContain("--only precisa de ao menos um id");
		expect(out).not.toContain("Avaliação");
	});

	test("unknown id exits 1 without calling the model", async () => {
		expect(selectConversations(["saudacao", "nao-existe"])).toEqual({
			ok: false,
			unknown: ["nao-existe"],
		});
		const run = Bun.spawn(
			["bun", "eval/cli.ts", "--live", "--only", "saudacao,nao-existe"],
			{
				cwd: join(import.meta.dir, ".."),
				env: { ...process.env, GOOGLE_GENERATIVE_AI_API_KEY: "chave-falsa" },
				stdout: "pipe",
				stderr: "pipe",
			},
		);
		const [code, out, err] = await Promise.all([
			run.exited,
			new Response(run.stdout).text(),
			new Response(run.stderr).text(),
		]);
		expect(code).toBe(1);
		expect(err).toContain("nao-existe");
		expect(out).not.toContain("Avaliação");
	});
});
