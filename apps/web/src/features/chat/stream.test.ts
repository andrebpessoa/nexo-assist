import { describe, expect, mock, test } from "bun:test";

import { createChatApi } from "./api";
import { readSse } from "./stream";

const enc = new TextEncoder();
const body = (chunks: string[]) =>
	new ReadableStream<Uint8Array>({
		start(c) {
			for (const ch of chunks) c.enqueue(enc.encode(ch));
			c.close();
		},
	});
const sse = (res: Response) =>
	mock(async (_url: string, _init?: RequestInit) => res);

describe("chat stream", () => {
	test("parses sse events split across chunks", async () => {
		const seen: [string, unknown][] = [];
		await readSse(
			body([
				'event: step\ndata: {"name":"chamados.listar","phase":"start"}\n\nev',
				'ent: delta\ndata: {"text":"Olá "}\n\n',
				'event: done\ndata: {"blocks":[]}\n\n',
			]),
			(event, data) => seen.push([event, data]),
		);
		expect(seen).toEqual([
			["step", { name: "chamados.listar", phase: "start" }],
			["delta", { text: "Olá " }],
			["done", { blocks: [] }],
		]);
	});

	test("done carries blocks, decision and count", async () => {
		const fetchFn = sse(
			new Response(
				body([
					'event: step\ndata: {"conversationId":"c","name":"chamados.listar","phase":"start"}\n\n',
					'event: delta\ndata: {"text":"Oi "}\n\n',
					'event: done\ndata: {"blocks":[{"kind":"text","text":"Oi"}],"decision":null,"count":3,"silent":false}\n\n',
				]),
				{ headers: { "content-type": "text/event-stream" } },
			),
		);
		const api = createChatApi("http://srv", fetchFn);
		const steps: string[] = [];
		const deltas: string[] = [];
		const r = await api.send(
			{ text: "oi" },
			{ onStep: (s) => steps.push(s.name), onDelta: (t) => deltas.push(t) },
		);
		expect(r).toEqual({
			kind: "done",
			blocks: [{ kind: "text", text: "Oi" }],
			decision: null,
			count: 3,
			silent: false,
		});
		expect(steps).toEqual(["chamados.listar"]);
		expect(deltas).toEqual(["Oi "]);
		const [url, init] = fetchFn.mock.calls[0] ?? [];
		expect(url).toBe("http://srv/chat/send");
		expect(init?.credentials).toBe("include");
		expect(init?.body).toBe('{"text":"oi"}');
	});

	test("interrupted stream keeps partial", async () => {
		const api = createChatApi(
			"http://srv",
			sse(
				new Response(
					body([
						'event: delta\ndata: {"text":"Não "}\n\n',
						'event: delta\ndata: {"text":"há "}\n\n',
					]),
				),
			),
		);
		const r = await api.send({ text: "oi" }, { onStep() {}, onDelta() {} });
		expect(r).toEqual({ kind: "interrupted", partial: "Não há " });
	});

	test("server error event is an interruption", async () => {
		const api = createChatApi(
			"http://srv",
			sse(
				new Response(
					body([
						'event: delta\ndata: {"text":"Não "}\n\n',
						'event: error\ndata: {"message":"Resposta interrompida"}\n\n',
					]),
				),
			),
		);
		const r = await api.send({ text: "oi" }, { onStep() {}, onDelta() {} });
		expect(r).toEqual({ kind: "interrupted", partial: "Não " });
	});

	test("network failure and refusal", async () => {
		const down = createChatApi(
			"http://srv",
			mock(async () => {
				throw new TypeError("Failed to fetch");
			}),
		);
		expect(
			await down.send({ text: "oi" }, { onStep() {}, onDelta() {} }),
		).toEqual({ kind: "failed" });
		const full = createChatApi(
			"http://srv",
			sse(
				Response.json(
					{
						error: "limit",
						message: "Você chegou ao limite de 30 mensagens nesta conversa.",
					},
					{ status: 429 },
				),
			),
		);
		expect(
			await full.send({ text: "oi" }, { onStep() {}, onDelta() {} }),
		).toEqual({
			kind: "refused",
			error: "limit",
			message: "Você chegou ao limite de 30 mensagens nesta conversa.",
		});
		const broken = createChatApi(
			"http://srv",
			sse(new Response("x", { status: 500 })),
		);
		expect(
			await broken.send({ text: "oi" }, { onStep() {}, onDelta() {} }),
		).toEqual({ kind: "failed" });
	});

	test("health", async () => {
		expect(
			await createChatApi("http://srv", sse(new Response("OK"))).health(),
		).toBe(true);
		const down = createChatApi(
			"http://srv",
			mock(async () => {
				throw new TypeError("down");
			}),
		);
		expect(await down.health()).toBe(false);
	});
});
