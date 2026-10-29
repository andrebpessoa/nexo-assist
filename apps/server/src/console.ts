import {
	filterCounts,
	order,
	summarize,
	type TransitionError,
	transition,
} from "@nexo-assist/agent/console";
import type { Agent } from "@nexo-assist/agent/engine";
import {
	realSleep,
	type Sleep,
	withTicketRetry,
} from "@nexo-assist/agent/retry";
import { MAX_CHARS } from "@nexo-assist/agent/session";
import type {
	ConversationStore,
	StoredMessage,
} from "@nexo-assist/agent/store";
import {
	type AnalystActor,
	CLOSED_STATUSES,
	type TicketService,
} from "@nexo-assist/tickets";
import { type Context, Hono } from "hono";

export type ConsoleAccess =
	| {
			ok: true;
			analyst: AnalystActor;
			service: TicketService;
			store: ConversationStore;
			/** Writes the system lines and the analyst's messages. */
			agent: Agent;
			nameOf: (userId: string) => Promise<string>;
	  }
	| { ok: false; status: 401 | 403 };

type Ok = Extract<ConsoleAccess, { ok: true }>;

const view = (m: StoredMessage) => ({
	seq: m.seq,
	role: m.role,
	text: m.text,
	blocks: m.blocks,
	decision: m.decision,
	createdAt: m.createdAt.toISOString(),
});

const UNAVAILABLE = {
	error: "SERVICE_UNAVAILABLE",
	message: "Não foi possível concluir. Tente de novo.",
} as const;

/**
 * `/console/*` for analysts: the list with counts computed here (CON-03 to CON-07), one
 * conversation, the employee's tickets and the actions. Every move goes through `transition`
 * and a conditional update, so two analysts never both win (CON-24, CON-29). Ticket reads retry
 * SERVICE_UNAVAILABLE like the agent does (AGT-43), so a flaky legacy call doesn't reach the screen.
 */
export function createConsoleRoutes({
	resolve,
	now = () => new Date(),
	sleep = realSleep,
}: {
	resolve: (c: Context) => Promise<ConsoleAccess>;
	now?: () => Date;
	sleep?: Sleep;
}) {
	const app = new Hono<{ Variables: { access: Ok } }>();

	async function withNames(a: Ok, item: ReturnType<typeof summarize>) {
		return {
			...item,
			assigneeName: item.assigneeId ? await a.nameOf(item.assigneeId) : null,
		};
	}

	async function itemOf(a: Ok, id: string) {
		const conv = await a.store.get(id);
		if (!conv) return null;
		const messages = await a.store.messages(id);
		const employee = await a.nameOf(conv.userId);
		const rows = await a.store.listAll();
		const row = rows.find((r) => r.conversation.id === id);
		return {
			conv,
			messages,
			item: summarize(
				row ?? {
					conversation: conv,
					employee: { name: employee, department: null },
					messages,
					updatedAt: now(),
				},
				now(),
				a.analyst.userId,
			),
		};
	}

	async function refusal(a: Ok, id: string, code: TransitionError) {
		const conv = await a.store.get(id);
		const owner = conv?.assigneeId
			? await a.nameOf(conv.assigneeId)
			: "Outro analista";
		const message =
			code === "TAKEN"
				? `${owner} já assumiu esta conversa.`
				: code === "NOT_YOURS"
					? `Esta conversa está com ${owner}.`
					: "Essa ação não vale no estado atual da conversa.";
		return { error: code, message };
	}

	app.use("/console/*", async (c, next) => {
		const access = await resolve(c);
		if (!access.ok) return c.json({ error: "forbidden" }, access.status);
		c.set("access", access);
		await next();
	});
	const access = (c: { get: (key: "access") => Ok }) => c.get("access");

	app.get("/console/conversations", async (c) => {
		const a = access(c);
		const at = now();
		const items = (await a.store.listAll())
			.map((row) => summarize(row, at, a.analyst.userId))
			.filter((i) => i.recent);
		return c.json({
			items: await Promise.all(order(items).map((i) => withNames(a, i))),
			counts: filterCounts(items),
			me: { name: a.analyst.name, team: a.analyst.team },
		});
	});

	app.get("/console/conversations/:id", async (c) => {
		const a = access(c);
		const id = c.req.param("id");
		const found = await itemOf(a, id);
		if (!found) return c.json({ error: "NOT_FOUND" }, 404);
		const last = found.messages.at(-1)?.seq ?? 0;
		if (last > found.conv.readSeq) await a.store.markRead(id, last);
		return c.json({
			conversation: { ...(await withNames(a, found.item)), unread: 0 },
			messages: found.messages.map(view),
		});
	});

	app.get("/console/conversations/:id/tickets", async (c) => {
		const a = access(c);
		const found = await itemOf(a, c.req.param("id"));
		if (!found) return c.json({ error: "NOT_FOUND" }, 404);
		const { result: list } = await withTicketRetry(
			() => a.service.list(a.analyst, { requesterId: found.conv.userId }),
			sleep,
		);
		if (!list.ok) return c.json(UNAVAILABLE, 503);
		let current = null;
		if (found.item.ticket) {
			const ticket = found.item.ticket;
			const { result: got } = await withTicketRetry(
				() => a.service.get(a.analyst, ticket),
				sleep,
			);
			if (!got.ok && got.error.code === "SERVICE_UNAVAILABLE")
				return c.json(UNAVAILABLE, 503);
			if (got.ok) current = got.value;
		}
		const closed = list.value.filter((t) =>
			(CLOSED_STATUSES as readonly string[]).includes(t.status),
		).length;
		return c.json({
			current,
			tickets: list.value,
			open: list.value.length - closed,
			closed,
		});
	});

	app.get("/console/tickets/:number", async (c) => {
		const a = access(c);
		const number = c.req.param("number");
		const { result: got } = await withTicketRetry(
			() => a.service.get(a.analyst, number),
			sleep,
		);
		if (got.ok) return c.json(got.value);
		return got.error.code === "NOT_FOUND"
			? c.json({ error: "NOT_FOUND" }, 404)
			: c.json(UNAVAILABLE, 503);
	});

	const author = (a: Ok) => ({ name: a.analyst.name, team: a.analyst.team });

	app.post("/console/conversations/:id/:action", async (c) => {
		const a = access(c);
		const id = c.req.param("id");
		const action = c.req.param("action");
		if (
			action !== "assume" &&
			action !== "reply" &&
			action !== "return" &&
			action !== "close"
		)
			return c.json({ error: "NOT_FOUND" }, 404);
		const found = await itemOf(a, id);
		if (!found) return c.json({ error: "NOT_FOUND" }, 404);
		const { conv, item } = found;
		const next = transition(conv, action, a.analyst.userId);
		if (!next.ok) return c.json(await refusal(a, id, next.code), 409);

		if (action === "reply") {
			const body = (await c.req.json().catch(() => null)) as {
				text?: unknown;
			} | null;
			const text = typeof body?.text === "string" ? body.text.trim() : "";
			if (!text || text.length > MAX_CHARS)
				return c.json(
					{
						error: "invalid",
						message: text
							? "Máximo de 2.000 caracteres."
							: "Escreva uma mensagem.",
					},
					400,
				);
			await a.agent.analystSays(id, text, author(a));
			return c.json({ ok: true });
		}
		if (!next.changed) return c.json({ ok: true });

		const won = await a.store.claim(id, [conv.state], {
			state: next.state,
			assigneeId: next.assigneeId,
		});
		if (!won) {
			const now2 = await a.store.get(id);
			const again = now2 && transition(now2, action, a.analyst.userId);
			const code = again && !again.ok ? again.code : "INVALID_TRANSITION";
			return c.json(await refusal(a, id, code), 409);
		}

		if (action === "assume") {
			if (item.ticket) {
				const moved = await a.service.assume(a.analyst, item.ticket);
				if (!moved.ok && moved.error.code === "SERVICE_UNAVAILABLE") {
					// CON-30: undo, so the screen keeps the previous state.
					await a.store.claim(id, ["com_analista"], {
						state: conv.state,
						assigneeId: conv.assigneeId,
					});
					return c.json(UNAVAILABLE, 503);
				}
			}
			await a.agent.assume(id, author(a));
		} else if (action === "return") await a.agent.returnToAgent(id);
		else await a.agent.close(id);
		return c.json({ ok: true });
	});

	return app;
}
