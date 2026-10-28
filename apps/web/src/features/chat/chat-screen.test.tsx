import { describe, expect, mock, test } from "bun:test";

import type { AgentInput } from "@nexo-assist/agent/engine";
import { progressLabel } from "@nexo-assist/agent/transparency";
import type { Block } from "@nexo-assist/agent/types";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { AppShell, AppSidebar } from "../shell/app-sidebar";
import type {
	ChatApi,
	ChatHistory,
	ChatMessage,
	SendHandlers,
	SendResult,
} from "./api";
import { ChatScreen } from "./chat-screen";
import { draft } from "./fixtures";

const ana = {
	name: "Ana Souza",
	email: "ana.souza@nexo.com.br",
	initials: "AS",
};

const msg = (
	seq: number,
	role: ChatMessage["role"],
	...blocks: Block[]
): ChatMessage => ({
	seq,
	role,
	blocks,
	decision: null,
	createdAt: "2026-10-28T13:00:00.000Z",
});
const say = (seq: number, text: string) =>
	msg(seq, "employee", { kind: "text", text });

function history(over: Partial<ChatHistory> = {}): ChatHistory {
	return {
		conversation: { id: "c1", state: "agent", pending: null },
		messages: [],
		count: 0,
		limit: 30,
		firstName: "Ana",
		contactBy: null,
		...over,
	};
}

function deferred<T>() {
	let resolve: (v: T) => void = () => {};
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

function fake(start: ChatHistory = history()) {
	let current = start;
	let onSend: (input: AgentInput, on: SendHandlers) => Promise<SendResult> =
		async () => ({
			kind: "done",
			blocks: [],
			decision: null,
			count: 1,
			silent: false,
		});
	const api = {
		history: mock(async () => current),
		newConversation: mock(async () => history()),
		health: mock(async () => true),
		send: mock((input: AgentInput, on: SendHandlers) => onSend(input, on)),
	} satisfies ChatApi;
	return {
		api,
		set: (h: ChatHistory) => {
			current = h;
		},
		onSend: (fn: typeof onSend) => {
			onSend = fn;
		},
	};
}

const field = () => screen.getByPlaceholderText("Escreva para o Nexo...");
const sendButton = () =>
	screen.getByRole("button", { name: /Enviar/ }) as HTMLButtonElement;

function framed(
	api: ChatApi,
	extra: {
		onNavigate?: (to: string) => void;
		onSignOut?: () => Promise<void>;
	} = {},
) {
	return render(
		<ChatScreen
			api={api}
			pollMs={60_000}
			frame={(aside: ReactNode, body: ReactNode) => (
				<AppShell
					here="Atendimento"
					aside={aside}
					sidebar={
						<AppSidebar
							me={ana}
							active="atendimento"
							onNavigate={extra.onNavigate ?? (() => {})}
							onSignOut={extra.onSignOut ?? (async () => {})}
						/>
					}
				>
					{body}
				</AppShell>
			)}
		/>,
	);
}

describe("ChatScreen", () => {
	test("layout", async () => {
		const { api } = fake(
			history({
				messages: [
					say(1, "Oi"),
					msg(2, "agent", { kind: "text", text: "Olá!" }),
				],
				count: 1,
			}),
		);
		framed(api);
		await screen.findByText("Olá!");
		expect(screen.getByRole("link", { name: "Atendimento" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Meu perfil" })).toBeTruthy();
		expect(screen.getByText("Ana Souza")).toBeTruthy();
		expect(screen.getByRole("button", { name: /Sair/ })).toBeTruthy();
		expect(screen.getByText("Service desk de TI")).toBeTruthy();
		const header = screen.getByRole("banner");
		expect(await within(header).findByText("Assistente online")).toBeTruthy();
		expect(field()).toBeTruthy();
		expect(sendButton()).toBeTruthy();
		expect(screen.getByText("1/30 mensagens nesta sessão")).toBeTruthy();
	});

	test("own message at once and reply word by word", async () => {
		const f = fake();
		const gate = deferred<void>();
		f.onSend(async (_input, on) => {
			on.onDelta("Vou ");
			await gate.promise;
			on.onDelta("verificar.");
			f.set(
				history({
					messages: [
						say(1, "Minha VPN caiu"),
						msg(2, "agent", { kind: "text", text: "Vou verificar." }),
					],
					count: 1,
				}),
			);
			return {
				kind: "done",
				blocks: [{ kind: "text", text: "Vou verificar." }],
				decision: null,
				count: 1,
				silent: false,
			};
		});
		framed(f.api);
		await screen.findByText(/Olá, Ana/);
		await userEvent.type(field(), "Minha VPN caiu{Enter}");
		const own = screen.getByText("Minha VPN caiu");
		expect(own.closest("[data-role='employee']")?.className).toContain(
			"justify-end",
		);
		expect(f.api.send.mock.calls[0]?.[0]).toEqual({ text: "Minha VPN caiu" });
		expect(await screen.findByText("Vou")).toBeTruthy();
		await act(async () => gate.resolve());
		expect(await screen.findByText("Vou verificar.")).toBeTruthy();
		expect(screen.getAllByText("Minha VPN caiu")).toHaveLength(1);
		expect(screen.getByText("1/30 mensagens nesta sessão")).toBeTruthy();
	});

	test("working disables send and shows progress", async () => {
		const f = fake();
		const gate = deferred<void>();
		f.onSend(async (_input, on) => {
			on.onStep({
				conversationId: "c1",
				name: "chamados.listar",
				phase: "start",
			});
			await gate.promise;
			return {
				kind: "done",
				blocks: [],
				decision: null,
				count: 1,
				silent: false,
			};
		});
		framed(f.api);
		await screen.findByText(/Olá, Ana/);
		await userEvent.type(field(), "Status{Enter}");
		const label = progressLabel("chamados.listar") as string;
		expect(await screen.findByText(label)).toBeTruthy();
		await userEvent.type(field(), "mais uma");
		expect(sendButton().disabled).toBe(true);
		await act(async () => gate.resolve());
		await waitFor(() => expect(sendButton().disabled).toBe(false));
	});

	test("new messages button", async () => {
		const f = fake(history({ messages: [say(1, "Oi")], count: 1 }));
		render(<ChatScreen api={f.api} pollMs={20} />);
		await screen.findByText("Oi");
		const log = screen.getByRole("log");
		Object.defineProperty(log, "scrollHeight", {
			configurable: true,
			value: 1000,
		});
		Object.defineProperty(log, "clientHeight", {
			configurable: true,
			value: 400,
		});
		log.scrollTop = 0;
		fireEvent.scroll(log);
		f.set(
			history({
				messages: [
					say(1, "Oi"),
					msg(2, "agent", { kind: "text", text: "Novidade" }),
				],
				count: 1,
			}),
		);
		const jump = await screen.findByRole("button", { name: "Novas mensagens" });
		await userEvent.click(jump);
		expect(log.scrollTop).toBe(1000);
		expect(
			screen.queryByRole("button", { name: "Novas mensagens" }),
		).toBeNull();
	});

	test("welcome", async () => {
		render(<ChatScreen api={fake().api} pollMs={60_000} />);
		expect(
			await screen.findByText(
				"Olá, Ana! Sou o Nexo Assist. Posso abrir um chamado, contar como estão os seus ou ajudar com uma dúvida de TI.",
			),
		).toBeTruthy();
	});

	test("health badge", async () => {
		const f = fake();
		f.api.health.mockImplementation(async () => false);
		render(<ChatScreen api={f.api} pollMs={60_000} />);
		expect(await screen.findByText("Assistente indisponível")).toBeTruthy();
	});

	test("skeleton while loading", () => {
		const f = fake();
		f.api.history.mockImplementation(() => new Promise<ChatHistory>(() => {}));
		render(<ChatScreen api={f.api} pollMs={60_000} />);
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
		expect(screen.queryByText(/Olá, Ana/)).toBeNull();
	});

	test("waiting analyst banner", async () => {
		const f = fake(
			history({
				conversation: { id: "c1", state: "aguardando_analista", pending: null },
				contactBy: "2026-10-28T16:43:00.000Z",
				messages: [say(1, "Quero um analista")],
				count: 1,
			}),
		);
		render(<ChatScreen api={f.api} pollMs={60_000} />);
		expect(
			await screen.findByText("Aguardando um analista · contato até 13:43"),
		).toBeTruthy();
		await userEvent.type(field(), "Mais um detalhe");
		expect(sendButton().disabled).toBe(false);
	});

	test("analyst message arrives by polling", async () => {
		const f = fake(history({ messages: [say(1, "Oi")], count: 1 }));
		render(<ChatScreen api={f.api} pollMs={20} />);
		await screen.findByText("Oi");
		f.set(
			history({
				conversation: { id: "c1", state: "com_analista", pending: null },
				messages: [
					say(1, "Oi"),
					msg(2, "system", { kind: "text", text: "Rafael Lima assumiu" }),
					msg(
						3,
						"analyst",
						{ kind: "author", name: "Rafael Lima", team: "Suporte N2" },
						{ kind: "text", text: "Oi Ana, vou olhar seu notebook." },
					),
				],
				count: 1,
			}),
		);
		expect(await screen.findByText("Rafael Lima assumiu")).toBeTruthy();
		expect(screen.getByText("Rafael Lima · Suporte N2")).toBeTruthy();
		expect(screen.getByText("Oi Ana, vou olhar seu notebook.")).toBeTruthy();
	});

	test("failed send", async () => {
		const f = fake();
		f.onSend(async () => ({ kind: "failed" }));
		render(<ChatScreen api={f.api} pollMs={60_000} />);
		await screen.findByText(/Olá, Ana/);
		await userEvent.type(field(), "Minha VPN caiu{Enter}");
		expect(await screen.findByText("Não enviada")).toBeTruthy();
		expect(screen.getByText("Minha VPN caiu")).toBeTruthy();
		f.onSend(async () => ({
			kind: "done",
			blocks: [],
			decision: null,
			count: 1,
			silent: false,
		}));
		await userEvent.click(
			screen.getByRole("button", { name: "Tentar de novo" }),
		);
		await waitFor(() => expect(f.api.send).toHaveBeenCalledTimes(2));
		expect(f.api.send.mock.calls[1]?.[0]).toEqual({ text: "Minha VPN caiu" });
	});

	test("interrupted reply", async () => {
		const f = fake();
		f.onSend(async (_input, on) => {
			on.onDelta("Vou ");
			on.onDelta("ver");
			f.set(history({ messages: [say(1, "Status?")], count: 1 }));
			return { kind: "interrupted", partial: "Vou ver" };
		});
		render(<ChatScreen api={f.api} pollMs={60_000} />);
		await screen.findByText(/Olá, Ana/);
		await userEvent.type(field(), "Status?{Enter}");
		expect(await screen.findByText("Resposta interrompida")).toBeTruthy();
		expect(screen.getByText("Vou ver")).toBeTruthy();
		f.onSend(async () => ({
			kind: "done",
			blocks: [],
			decision: null,
			count: 1,
			silent: false,
		}));
		await userEvent.click(
			screen.getByRole("button", { name: "Tentar de novo" }),
		);
		await waitFor(() => expect(f.api.send).toHaveBeenCalledTimes(2));
		expect(f.api.send.mock.calls[1]?.[0]).toEqual({ action: "retry" });
	});

	test("fits 1280", async () => {
		render(<ChatScreen api={fake().api} pollMs={60_000} />);
		await screen.findByText(/Olá, Ana/);
		const column = screen.getByRole("log").firstElementChild as HTMLElement;
		expect(column.className).toContain("max-w-[760px]");
		expect(column.className).toContain("w-full");
		expect(screen.getByRole("log").className).toContain("overflow-x-hidden");
	});

	test("frame keeps profile and sign out", async () => {
		const onNavigate = mock((_: string) => {});
		const onSignOut = mock(async () => {});
		const { api } = fake(history({ messages: [say(1, "Oi")], count: 1 }));
		framed(api, { onNavigate, onSignOut });
		await screen.findByText("Oi");
		await userEvent.click(screen.getByRole("link", { name: "Meu perfil" }));
		expect(onNavigate).toHaveBeenCalledWith("/perfil");
		await userEvent.click(screen.getByRole("button", { name: /Sair/ }));
		expect(onSignOut).toHaveBeenCalledTimes(1);
		expect(api.newConversation).not.toHaveBeenCalled();
	});

	test("blocks answer through the api", async () => {
		const f = fake(
			history({
				conversation: { id: "c1", state: "agent", pending: "ticket_draft" },
				messages: [
					say(1, "VPN"),
					msg(
						2,
						"agent",
						{ kind: "text", text: "Confira" },
						{ kind: "ticket_draft", draft, status: "Aguardando confirmação" },
					),
				],
				count: 1,
			}),
		);
		render(<ChatScreen api={f.api} pollMs={60_000} />);
		await userEvent.click(
			await screen.findByRole("button", { name: /Confirmar/ }),
		);
		expect(f.api.send.mock.calls[0]?.[0]).toEqual({ action: "confirm" });
	});

	test("question is not repeated above its options", async () => {
		const q = "Quem está sendo afetado?";
		const f = fake(
			history({
				messages: [
					say(1, "VPN"),
					msg(
						2,
						"agent",
						{ kind: "text", text: q },
						{ kind: "options", question: q, options: ["Só eu", "Não sei"] },
					),
				],
				count: 1,
			}),
		);
		render(<ChatScreen api={f.api} pollMs={60_000} />);
		expect(await screen.findAllByText(q)).toHaveLength(1);
	});

	test("question at the end of the text moves to the options", async () => {
		const q = "Quer que eu chame um analista?";
		const f = fake(
			history({
				messages: [
					say(1, "Status"),
					msg(
						2,
						"agent",
						{ kind: "text", text: `Está sem atualização há 5 dias. ${q}` },
						{
							kind: "options",
							question: q,
							options: ["Falar com um analista"],
						},
					),
				],
				count: 1,
			}),
		);
		render(<ChatScreen api={f.api} pollMs={60_000} />);
		expect(
			await screen.findByText("Está sem atualização há 5 dias."),
		).toBeTruthy();
		expect(screen.getAllByText(q)).toHaveLength(1);
	});

	test("action line opens the panel beside the conversation", async () => {
		const decision = {
			intent: "abrir_chamado" as const,
			confidence: 88,
			extracted: {},
			action: "rascunho_chamado" as const,
			rule: "Anexo A",
			reason: "Alta.",
			tools: [{ name: "regra.prioridade", ok: true, attempts: 1 }],
		};
		const f = fake(
			history({
				messages: [
					say(1, "VPN"),
					{ ...msg(2, "agent", { kind: "text", text: "Confira" }), decision },
				],
				count: 1,
			}),
		);
		render(<ChatScreen api={f.api} pollMs={60_000} />);
		await userEvent.click(
			await screen.findByRole("button", { name: /Nexo Assist/ }),
		);
		const panel = screen.getByRole("dialog", {
			name: "Por que o Nexo fez isso",
		});
		expect(panel.parentElement).toBe(
			screen.getByRole("log").parentElement?.parentElement ?? null,
		);
	});

	test("ticket pick shows number and title", async () => {
		const f = fake(
			history({
				messages: [
					say(1, "Status"),
					msg(2, "agent", {
						kind: "ticket_list",
						question: "Qual?",
						tickets: [
							{
								number: "INC-20311",
								title: "Notebook lento após atualização",
								type: "INC",
								category: "Hardware",
								priority: "Média",
								status: "Aguardando analista",
								openedAt: "2026-10-16T17:20:00.000Z",
								updatedAt: "2026-10-23T13:00:00.000Z",
								deadlineAt: "2026-10-21T17:20:00.000Z",
								vencido: true,
								atrasoMinutos: 1,
							},
						],
					}),
					say(3, "INC-20311"),
				],
				count: 2,
			}),
		);
		render(<ChatScreen api={f.api} pollMs={60_000} />);
		expect(
			await screen.findByText("INC-20311 · Notebook lento após atualização", {
				selector: "[data-role='employee'] *",
			}),
		).toBeTruthy();
	});

	test("limit exits", async () => {
		const f = fake(history({ messages: [say(1, "Oi")], count: 30 }));
		render(<ChatScreen api={f.api} pollMs={60_000} />);
		await userEvent.click(
			await screen.findByRole("button", { name: "Falar com um analista" }),
		);
		expect(f.api.send.mock.calls[0]?.[0]).toEqual({ action: "analyst" });
		await userEvent.click(
			screen.getByRole("button", { name: "Nova conversa" }),
		);
		await waitFor(() => expect(f.api.newConversation).toHaveBeenCalledTimes(1));
	});
});
