import type { Agent, AgentInput, StepEvent } from "@nexo-assist/agent/engine";
import {
	admit,
	employeeCount,
	MESSAGE_LIMIT,
} from "@nexo-assist/agent/session";
import type { StoredMessage } from "@nexo-assist/agent/store";
import type { Block } from "@nexo-assist/agent/types";
import { AFFECTED, CATEGORIES, TICKET_TYPES } from "@nexo-assist/tickets";
import { type Context, Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";

export type ChatAccess =
	| {
			ok: true;
			userId: string;
			firstName: string;
			/** The agent of this request; `onStep` feeds the progress line (CHAT-03). */
			agentFor: (onStep?: (event: StepEvent) => void) => Agent;
	  }
	| { ok: false; status: 401 | 403 };

/** Fields the employee may edit; priority and deadline stay with the rules (AGT-15). */
const draftEdits = z
	.object({
		title: z.string().trim().min(1).max(200),
		description: z.string().trim().min(1).max(2000),
		type: z.enum(TICKET_TYPES),
		category: z.enum(CATEGORIES),
		affected: z.enum([...AFFECTED, "Não sei"]),
	})
	.partial()
	.strict();

const Input = z.union([
	z.object({ text: z.string() }).strict(),
	z
		.object({ action: z.enum(["confirm", "cancel", "retry", "analyst"]) })
		.strict(),
	z
		.object({ action: z.literal("edit"), edits: draftEdits.optional() })
		.strict(),
	z
		.object({ action: z.literal("option"), value: z.string().max(200) })
		.strict(),
	z
		.object({ action: z.literal("select"), number: z.string().max(40) })
		.strict(),
]);

const ERRORS = {
	empty: "Escreva uma mensagem.",
	too_long: "Máximo de 2.000 caracteres.",
	limit: "Você chegou ao limite de 30 mensagens nesta conversa.",
} as const;

/** Text the employee reads, one word at a time (CHAT-02). */
export function words(blocks: Block[]): string[] {
	const text = blocks
		.flatMap((b) =>
			b.kind === "text" ? [b.text] : b.kind === "options" ? [b.question] : [],
		)
		.join("\n\n");
	return text.match(/\S+\s*/g) ?? [];
}

/** The contact deadline while waiting for an analyst (CHAT-27). */
function contactBy(state: string, messages: StoredMessage[]): string | null {
	if (state !== "aguardando_analista") return null;
	for (const m of [...messages].reverse())
		for (const b of m.blocks) if (b.kind === "transfer") return b.contactBy;
	return null;
}

const view = (m: StoredMessage) => ({
	seq: m.seq,
	role: m.role,
	blocks: m.blocks,
	decision: m.decision,
	createdAt: m.createdAt.toISOString(),
});

/**
 * `/chat/*` for the employee: history, send as SSE (`step`, `delta`, `done`) and a new
 * conversation. The actor always comes from `resolve`, never from the body (TKT-06).
 */
export function createChatRoutes({
	resolve,
	wordDelayMs = 18,
}: {
	resolve: (c: Context) => Promise<ChatAccess>;
	wordDelayMs?: number;
}) {
	const app = new Hono();

	async function historyOf(agent: Agent, userId: string, firstName: string) {
		const { conversation, messages } = await agent.history(userId);
		return {
			conversation: {
				id: conversation.id,
				state: conversation.state,
				pending: conversation.pending?.kind ?? null,
			},
			messages: messages.map(view),
			count: employeeCount(messages),
			limit: MESSAGE_LIMIT,
			firstName,
			contactBy: contactBy(conversation.state, messages),
		};
	}

	app.get("/chat/history", async (c) => {
		const access = await resolve(c);
		if (!access.ok) return c.json({ error: "forbidden" }, access.status);
		return c.json(
			await historyOf(access.agentFor(), access.userId, access.firstName),
		);
	});

	app.post("/chat/new", async (c) => {
		const access = await resolve(c);
		if (!access.ok) return c.json({ error: "forbidden" }, access.status);
		const agent = access.agentFor();
		const { conversation } = await agent.history(access.userId);
		await agent.close(conversation.id);
		return c.json(await historyOf(agent, access.userId, access.firstName));
	});

	app.post("/chat/send", async (c) => {
		const access = await resolve(c);
		if (!access.ok) return c.json({ error: "forbidden" }, access.status);
		const parsed = Input.safeParse(await c.req.json().catch(() => null));
		if (!parsed.success)
			return c.json({ error: "invalid", message: "Pedido inválido." }, 400);
		const input = parsed.data as AgentInput;
		const probe = access.agentFor();
		const { messages } = await probe.history(access.userId);
		const admission = admit(messages, input);
		if (admission !== "ok")
			return c.json(
				{ error: admission, message: ERRORS[admission] },
				admission === "limit" ? 429 : 400,
			);

		return streamSSE(c, async (stream) => {
			const steps: StepEvent[] = [];
			let flush: Promise<unknown> = Promise.resolve();
			const agent = access.agentFor((event) => {
				steps.push(event);
				flush = flush.then(() =>
					stream.writeSSE({ event: "step", data: JSON.stringify(event) }),
				);
			});
			try {
				const turn = await agent.send(access.userId, input);
				await flush;
				for (const w of words(turn.blocks)) {
					await stream.writeSSE({
						event: "delta",
						data: JSON.stringify({ text: w }),
					});
					if (wordDelayMs > 0) await stream.sleep(wordDelayMs);
				}
				const after = await agent.history(access.userId);
				await stream.writeSSE({
					event: "done",
					data: JSON.stringify({
						blocks: turn.blocks,
						decision: turn.decision,
						silent: turn.silent,
						count: employeeCount(after.messages),
					}),
				});
			} catch (error) {
				console.error("chat send failed", error);
				await flush;
				await stream.writeSSE({
					event: "error",
					data: JSON.stringify({ message: "Resposta interrompida" }),
				});
			}
		});
	});

	return app;
}
