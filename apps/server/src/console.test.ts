import { describe, expect, test } from "bun:test";

import { createAgent } from "@nexo-assist/agent/engine";
import { createProfileReader } from "@nexo-assist/agent/profile";
import { createConversationStore } from "@nexo-assist/agent/store";
import { agentHarness, SEED_NOW } from "@nexo-assist/agent/testing";
import type { ScriptedTurn } from "@nexo-assist/agent/understand-scripted";
import { createScriptedUnderstander } from "@nexo-assist/agent/understand-scripted";
import type { AnalystActor, TicketService } from "@nexo-assist/tickets";
import { Hono } from "hono";

import { createConsoleRoutes } from "./console";

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

/** Console routes over a seeded database; `x-user` stands in for the session cookie. */
async function setup(
	opts: {
		turns?: ScriptedTurn[];
		wrap?: (s: TicketService) => TicketService;
	} = {},
) {
	const h = await agentHarness({ turns: opts.turns, wrap: opts.wrap });
	const analysts: Record<string, AnalystActor> = {
		rafael: {
			kind: "analyst",
			userId: h.ids.rafael as string,
			name: "Rafael Lima",
			team: "Suporte N2",
		},
		marina: {
			kind: "analyst",
			userId: h.ids.marina as string,
			name: "Marina Teixeira",
			team: "Suporte N1",
		},
	};
	const clock = { now: () => SEED_NOW };
	const routes = () =>
		new Hono().route(
			"/",
			createConsoleRoutes({
				now: () => SEED_NOW,
				resolve: async (c) => {
					const who = c.req.header("x-user");
					if (!who) return { ok: false, status: 401 };
					const analyst = analysts[who];
					if (!analyst) return { ok: false, status: 403 };
					// A new store and agent per request, like the Worker (CON-32).
					const store = createConversationStore({ db: h.db, clock });
					return {
						ok: true,
						analyst,
						service: opts.wrap ? opts.wrap(h.service) : h.service,
						store,
						agent: createAgent({
							tickets: h.service,
							understander: createScriptedUnderstander([]),
							store,
							profileOf: createProfileReader(h.db),
							clock,
						}),
						nameOf: async (id) => (await createProfileReader(h.db)(id)).name,
					};
				},
			}),
		);
	const app = routes();
	const call = (path: string, body?: unknown, user = "rafael") =>
		app.request(path, {
			method: body === undefined ? "GET" : "POST",
			headers: { "content-type": "application/json", "x-user": user },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	/** Ana's conversation, transferred with INC-20311 like screen 04. */
	async function transferred() {
		const conv = await h.store.open(h.ana);
		await h.store.append(conv.id, {
			role: "employee",
			text: "Quero falar com um analista.",
			blocks: [{ kind: "text", text: "Quero falar com um analista." }],
			decision: null,
		});
		await h.store.append(conv.id, {
			role: "agent",
			text: "Encaminhei para o Suporte N2.",
			blocks: [
				{
					kind: "transfer",
					team: "Suporte N2",
					contactBy: new Date(SEED_NOW.getTime() + 7_200_000).toISOString(),
					summary: "Notebook lento",
				},
				{ kind: "text", text: "Encaminhei para o Suporte N2." },
			],
			decision: {
				intent: "falar_com_analista",
				confidence: 95,
				extracted: {},
				action: "transferir",
				rule: "",
				reason: "",
				tools: [
					{
						name: "chamados.transferir",
						ok: true,
						attempts: 1,
						target: "INC-20311",
					},
				],
			},
		});
		await h.store.update(conv.id, { state: "aguardando_analista" });
		return conv.id;
	}
	return { ...h, app, routes, call, transferred };
}

const json = async <T>(res: Response | Promise<Response>) =>
	(await (await res).json()) as T;

interface List {
	items: {
		id: string;
		name: string;
		status: { kind: string };
		ticket: string | null;
		unread: number;
		assigneeName?: string | null;
	}[];
	counts: Record<string, number>;
	me: { name: string; team: string };
}
interface Detail {
	conversation: { state: string; status: { kind: string }; unread: number };
	messages: { role: string; text: string; blocks: { kind: string }[] }[];
}

describe("console routes", () => {
	test("analysts only", async () => {
		const { call } = await setup();
		expect((await call("/console/conversations", undefined, "")).status).toBe(
			401,
		);
		expect(
			(await call("/console/conversations", undefined, "ana")).status,
		).toBe(403);
	});

	test("lists with counts computed on the server", async () => {
		const { call, transferred } = await setup();
		const id = await transferred();
		const list = await json<List>(call("/console/conversations"));
		expect(list.counts).toEqual({
			todas: 1,
			para_voce: 1,
			com_agent: 0,
			minhas: 0,
		});
		expect(list.items[0]).toMatchObject({
			id,
			name: "Ana Souza",
			status: { kind: "transferida" },
			ticket: "INC-20311",
			unread: 1,
		});
		expect(list.me).toEqual({ name: "Rafael Lima", team: "Suporte N2" });
	});

	test("opening a conversation clears its unread count", async () => {
		const { call, transferred } = await setup();
		const id = await transferred();
		const detail = await json<Detail>(call(`/console/conversations/${id}`));
		expect(detail.messages.map((m) => m.role)).toEqual(["employee", "agent"]);
		expect(detail.conversation.unread).toBe(0);
		const list = await json<List>(call("/console/conversations"));
		expect(list.items[0]?.unread).toBe(0);
		expect((await call("/console/conversations/nope")).status).toBe(404);
	});

	test("assume moves the conversation and the ticket", async () => {
		const { call, transferred, service, ids } = await setup();
		const id = await transferred();
		const res = await call(`/console/conversations/${id}/assume`, {});
		expect(res.status).toBe(200);
		const detail = await json<Detail>(call(`/console/conversations/${id}`));
		expect(detail.conversation.state).toBe("com_analista");
		expect(detail.conversation.status.kind).toBe("voce");
		expect(detail.messages.at(-1)?.text).toBe(
			"Rafael Lima assumiu · agent pausado",
		);
		const ticket = await service.get(
			{
				kind: "analyst",
				userId: ids.rafael as string,
				name: "Rafael Lima",
				team: "Suporte N2",
			},
			"INC-20311",
		);
		expect(ticket.ok && ticket.value.status).toBe("Em atendimento");
		expect(ticket.ok && ticket.value.events.at(-1)?.kind).toBe("assumido");
		// Twice changes nothing.
		expect((await call(`/console/conversations/${id}/assume`, {})).status).toBe(
			200,
		);
		const again = await json<Detail>(call(`/console/conversations/${id}`));
		expect(again.messages).toHaveLength(detail.messages.length);
	});

	test("someone else's conversation is TAKEN with the name", async () => {
		const { call, transferred } = await setup();
		const id = await transferred();
		await call(`/console/conversations/${id}/assume`, {}, "marina");
		const res = await call(`/console/conversations/${id}/assume`, {});
		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({
			error: "TAKEN",
			message: "Marina Teixeira já assumiu esta conversa.",
		});
		const list = await json<List>(call("/console/conversations"));
		expect(list.items[0]).toMatchObject({
			status: { kind: "outro_analista" },
			assigneeName: "Marina Teixeira",
		});
		expect(
			(await call(`/console/conversations/${id}/reply`, { text: "Oi" })).status,
		).toBe(409);
	});

	test("two analysts at once: one wins", async () => {
		const { call, transferred } = await setup();
		const id = await transferred();
		const [a, b] = await Promise.all([
			call(`/console/conversations/${id}/assume`, {}),
			call(`/console/conversations/${id}/assume`, {}, "marina"),
		]);
		expect([a.status, b.status].sort()).toEqual([200, 409]);
	});

	test("the reply reaches the employee's chat with name and team", async () => {
		const { call, transferred, agent, ana } = await setup();
		const id = await transferred();
		await call(`/console/conversations/${id}/assume`, {});
		expect(
			(await call(`/console/conversations/${id}/reply`, { text: "  " })).status,
		).toBe(400);
		expect(
			(
				await call(`/console/conversations/${id}/reply`, {
					text: "a".repeat(2001),
				})
			).status,
		).toBe(400);
		const res = await call(`/console/conversations/${id}/reply`, {
			text: "Oi, Ana! Aqui é o Rafael.",
		});
		expect(res.status).toBe(200);
		const { messages } = await agent.history(ana);
		const last = messages.at(-1);
		expect(last?.role).toBe("analyst");
		expect(last?.blocks[0]).toEqual({
			kind: "author",
			name: "Rafael Lima",
			team: "Suporte N2",
		});
	});

	test("give back: the agent answers the next employee message", async () => {
		const { call, transferred, agent, ana } = await setup({ turns: [DRAFT] });
		const id = await transferred();
		await call(`/console/conversations/${id}/assume`, {});
		const silent = await agent.send(ana, { text: "Ainda aí?" });
		expect(silent.silent).toBe(true);
		expect((await call(`/console/conversations/${id}/return`, {})).status).toBe(
			200,
		);
		const detail = await json<Detail>(call(`/console/conversations/${id}`));
		expect(detail.conversation.state).toBe("agent");
		const turn = await agent.send(ana, {
			text: "Meu notebook não liga desde hoje cedo",
		});
		expect(turn.silent).toBe(false);
		expect(turn.blocks.some((b) => b.kind === "ticket_draft")).toBe(true);
	});

	test("close ends the conversation; invalid moves change nothing", async () => {
		const { call, transferred, agent, ana } = await setup();
		const id = await transferred();
		await call(`/console/conversations/${id}/assume`, {});
		expect((await call(`/console/conversations/${id}/close`, {})).status).toBe(
			200,
		);
		const detail = await json<Detail>(call(`/console/conversations/${id}`));
		expect(detail.conversation.state).toBe("encerrada");
		expect(detail.messages.at(-1)?.text).toBe("Atendimento encerrado");
		for (const action of ["assume", "return", "close"]) {
			const res = await call(`/console/conversations/${id}/${action}`, {});
			expect(res.status).toBe(409);
			expect(((await res.json()) as { error: string }).error).toBe(
				"INVALID_TRANSITION",
			);
		}
		const after = await json<Detail>(call(`/console/conversations/${id}`));
		expect(after.messages).toHaveLength(detail.messages.length);
		const { conversation } = await agent.history(ana);
		expect(conversation.id).not.toBe(id);
	});

	test("ticket service down on assume keeps the previous state", async () => {
		const down = (s: TicketService): TicketService => ({
			...s,
			assume: async () => ({
				ok: false,
				error: { code: "SERVICE_UNAVAILABLE", message: "fora" },
			}),
		});
		const { call, transferred } = await setup({ wrap: down });
		const id = await transferred();
		const res = await call(`/console/conversations/${id}/assume`, {});
		expect(res.status).toBe(503);
		const detail = await json<Detail>(call(`/console/conversations/${id}`));
		expect(detail.conversation.state).toBe("aguardando_analista");
		expect(detail.messages).toHaveLength(2);
	});

	test("the employee's tickets panel", async () => {
		const { call, transferred } = await setup();
		const id = await transferred();
		const panel = await json<{
			current: { number: string; status: string; events: unknown[] } | null;
			tickets: { number: string }[];
			open: number;
			closed: number;
		}>(call(`/console/conversations/${id}/tickets`));
		expect(panel.current?.number).toBe("INC-20311");
		expect(panel.current?.events.length).toBeGreaterThan(0);
		expect(panel.tickets.map((t) => t.number)).toContain("INC-20311");
		expect(panel.open + panel.closed).toBe(panel.tickets.length);
		const one = await json<{ number: string; description: string }>(
			call("/console/tickets/INC-20311"),
		);
		expect(one.description).toContain("notebook");
		expect((await call("/console/tickets/INC-1")).status).toBe(404);
	});

	test("state and assignee survive a restart", async () => {
		const { call, transferred, routes } = await setup();
		const id = await transferred();
		await call(`/console/conversations/${id}/assume`, {});
		const restarted = routes();
		const res = await restarted.request("/console/conversations", {
			headers: { "x-user": "rafael" },
		});
		const list = (await res.json()) as List;
		expect(list.items[0]?.status.kind).toBe("voce");
		expect(list.counts.minhas).toBe(1);
	});
});
