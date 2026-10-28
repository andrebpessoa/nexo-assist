import { describe, expect, test } from "bun:test";

import type { StepEvent } from "@nexo-assist/agent/engine";
import { agentHarness } from "@nexo-assist/agent/testing";
import type { ScriptedTurn } from "@nexo-assist/agent/understand-scripted";
import { Hono } from "hono";

import { createChatRoutes } from "./chat";

const DRAFT: ScriptedTurn = {
	understanding: {
		intent: "abrir_chamado",
		confidence: 90,
		fields: {
			title: "Notebook não liga",
			description: "Meu notebook não liga desde hoje cedo",
			type: "INC",
			typeConfidence: 90,
			category: "Hardware",
			categoryConfidence: 90,
			affected: "Só eu",
			blocksWork: true,
		},
	},
};

/** The routes over a seeded agent; `x-user` stands in for the session cookie. */
async function setup(turns: ScriptedTurn[] = []) {
	let forward: ((e: StepEvent) => void) | undefined;
	const h = await agentHarness({ turns, onStep: (e) => forward?.(e) });
	const routes = (agent = h.agent) =>
		new Hono().route(
			"/",
			createChatRoutes({
				wordDelayMs: 0,
				resolve: async (c) => {
					const who = c.req.header("x-user");
					if (!who) return { ok: false, status: 401 };
					if (who === "rafael") return { ok: false, status: 403 };
					return {
						ok: true,
						userId: h.ana,
						firstName: "Ana",
						agentFor: (onStep) => {
							forward = onStep;
							return agent;
						},
					};
				},
			}),
		);
	const app = routes();
	const call = (path: string, body?: unknown, user = "ana") =>
		app.request(path, {
			method: body === undefined ? "GET" : "POST",
			headers: { "content-type": "application/json", "x-user": user },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	return { ...h, app, routes, call };
}

interface Hist {
	conversation: { id: string; state: string };
	messages: {
		role: string;
		blocks: {
			kind: string;
			status?: string;
			text?: string;
			name?: string;
			team?: string;
		}[];
		decision: { action: string } | null;
	}[];
	count: number;
	limit: number;
	firstName: string;
	contactBy: string | null;
}
const hist = async (res: Response | Promise<Response>) =>
	(await (await res).json()) as Hist;
const body = async (res: Response) =>
	(await res.json()) as { error: string; message: string };

/** SSE frames as `{ event, data }`. */
async function events(res: Response) {
	const raw = await res.text();
	return raw
		.split("\n\n")
		.filter((f) => f.trim())
		.map((frame) => {
			const event = /^event: (.+)$/m.exec(frame)?.[1];
			const data = /^data: (.+)$/m.exec(frame)?.[1] ?? "null";
			return { event, data: JSON.parse(data) };
		});
}

describe("chat routes", () => {
	test("streams steps, words and done", async () => {
		const { call } = await setup([DRAFT]);
		const res = await call("/chat/send", {
			text: "Meu notebook não liga desde hoje cedo",
		});
		expect(res.headers.get("content-type")).toContain("text/event-stream");
		const evs = await events(res);
		const kinds = evs.map((e) => e.event);
		const firstDelta = kinds.indexOf("delta");
		expect(kinds.indexOf("step")).toBeGreaterThanOrEqual(0);
		expect(kinds.indexOf("step")).toBeLessThan(firstDelta);
		expect(kinds.at(-1)).toBe("done");
		const deltas = evs.filter((e) => e.event === "delta");
		expect(deltas.length).toBeGreaterThan(3);
		expect(
			deltas.every((d) => d.data.text.trim().split(/\s+/).length === 1),
		).toBe(true);
		const done = evs.at(-1)?.data;
		expect(
			done.blocks.some((b: { kind: string }) => b.kind === "ticket_draft"),
		).toBe(true);
		expect(done.decision.action).toBe("rascunho_chamado");
		expect(done.count).toBe(1);
	});

	test("employee only", async () => {
		const { call } = await setup();
		expect((await call("/chat/history", undefined, "")).status).toBe(401);
		expect((await call("/chat/history", undefined, "rafael")).status).toBe(403);
	});

	test("rejects empty and long messages", async () => {
		const { call } = await setup();
		expect((await call("/chat/send", { text: "  " })).status).toBe(400);
		const long = await call("/chat/send", { text: "a".repeat(2001) });
		expect(long.status).toBe(400);
		expect(await body(long)).toEqual({
			error: "too_long",
			message: "Máximo de 2.000 caracteres.",
		});
		expect((await call("/chat/send", { nope: 1 })).status).toBe(400);
	});

	test("edit cannot set the priority", async () => {
		const { call } = await setup([DRAFT]);
		await events(
			await call("/chat/send", {
				text: "Meu notebook não liga desde hoje cedo",
			}),
		);
		const res = await call("/chat/send", {
			action: "edit",
			edits: { title: "Notebook", priority: "Crítica" },
		});
		expect(res.status).toBe(400);
		const ok = await events(
			await call("/chat/send", {
				action: "edit",
				edits: { title: "Notebook" },
			}),
		);
		expect(ok.at(-1)?.data.decision.action).toBe("rascunho_chamado");
	});

	test("refuses the 31st message", async () => {
		const { call, agent, ana, store, understander } = await setup();
		const { conversation } = await agent.history(ana);
		for (let i = 0; i < 30; i++)
			await store.append(conversation.id, {
				role: "employee",
				text: `m${i}`,
				blocks: [{ kind: "text", text: `m${i}` }],
				decision: null,
			});
		const res = await call("/chat/send", { text: "mais uma" });
		expect(res.status).toBe(429);
		expect((await body(res)).error).toBe("limit");
		expect(understander.calls.understand).toBe(0);
		const handoff = await events(
			await call("/chat/send", { action: "analyst" }),
		);
		expect(handoff.at(-1)?.data.decision.action).toBe("transferir");
	});

	test("history after restart", async () => {
		const { call, routes, store } = await setup([DRAFT]);
		await events(
			await call("/chat/send", {
				text: "Meu notebook não liga desde hoje cedo",
			}),
		);
		await events(await call("/chat/send", { action: "confirm" }));
		// A new app over the same database: what a restart leaves.
		const restarted = routes();
		const res = await restarted.request("/chat/history", {
			headers: { "x-user": "ana" },
		});
		const h = await hist(res);
		expect(h.count).toBe(1);
		expect(h.limit).toBe(30);
		expect(h.firstName).toBe("Ana");
		expect(h.conversation.state).toBe("agent");
		const drafts = h.messages.flatMap((m) =>
			m.blocks.filter((b) => b.kind === "ticket_draft"),
		);
		expect(drafts.map((d) => d.status)).toEqual([
			"Aguardando confirmação",
			"Criado",
		]);
		expect(h.messages.at(-1)?.decision?.action).toBe("criar_chamado");
		expect(await store.messages(h.conversation.id)).toHaveLength(
			h.messages.length,
		);
	});

	test("analyst messages and contact deadline in history", async () => {
		const { call, agent, ana } = await setup();
		await events(await call("/chat/send", { action: "analyst" }));
		let h = await hist(call("/chat/history"));
		expect(h.conversation.state).toBe("aguardando_analista");
		expect(h.contactBy).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		const { conversation } = await agent.history(ana);
		await agent.assume(conversation.id, {
			name: "Rafael Lima",
			team: "Suporte N2",
		});
		await agent.analystSays(conversation.id, "Oi, Ana. Já estou vendo.", {
			name: "Rafael Lima",
			team: "Suporte N2",
		});
		h = await hist(call("/chat/history"));
		const [line, said] = h.messages.slice(-2);
		expect(line?.role).toBe("system");
		expect(line?.blocks[0]?.text).toBe("Rafael Lima assumiu");
		expect(said?.role).toBe("analyst");
		expect(said?.blocks[0]).toEqual({
			kind: "author",
			name: "Rafael Lima",
			team: "Suporte N2",
		});
		expect(h.contactBy).toBeNull();
	});

	test("closed conversation opens a new one", async () => {
		const { call } = await setup([{ understanding: { intent: "outro" } }]);
		await events(await call("/chat/send", { text: "oi" }));
		const before = await hist(call("/chat/history"));
		expect(before.count).toBe(1);
		const res = await call("/chat/new", {});
		const after = await hist(res);
		expect(after.conversation.id).not.toBe(before.conversation.id);
		expect(after.count).toBe(0);
		expect(after.messages).toEqual([]);
	});
});
