import { describe, expect, mock, test } from "bun:test";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ActionResult, ConsoleAction, ConsoleConversation } from "./api";
import { ConversationView } from "./conversation-view";
import { anaConversation, message, NOW } from "./fixtures";

function setup(
	data: ConsoleConversation = anaConversation(),
	result: ActionResult = { ok: true },
) {
	const act = mock(
		async (_a: ConsoleAction, _t?: string): Promise<ActionResult> => result,
	);
	const onChanged = mock(() => {});
	const onDecision = mock((_d: unknown) => {});
	const onShowTickets = mock(() => {});
	const view = render(
		<ConversationView
			data={data}
			loading={false}
			now={NOW}
			act={act}
			onChanged={onChanged}
			onDecision={onDecision}
			ticketsOpen
			onShowTickets={onShowTickets}
		/>,
	);
	return { act, onChanged, onDecision, onShowTickets, view };
}

const mine = () =>
	anaConversation(
		{
			state: "com_analista",
			status: { kind: "voce" },
			assigneeId: "rafael",
			assigneeName: "Rafael Lima",
			contactBy: null,
		},
		[
			message(
				"system",
				"Rafael Lima assumiu · agent pausado",
				"2026-10-28T13:12:00.000Z",
			),
			message(
				"analyst",
				"Oi, Ana! Aqui é o Rafael.",
				"2026-10-28T13:12:30.000Z",
				{
					blocks: [
						{ kind: "author", name: "Rafael Lima", team: "Suporte N2" },
						{ kind: "text", text: "Oi, Ana! Aqui é o Rafael." },
					],
				},
			),
		],
	);

describe("ConversationView", () => {
	test("history with times, day separator, IA label and system lines", () => {
		setup();
		const log = screen.getByRole("log");
		expect(within(log).getByText("Hoje")).toBeTruthy();
		expect(within(log).getByText("Qual o status do meu chamado?")).toBeTruthy();
		expect(within(log).getAllByText("IA").length).toBeGreaterThan(0);
		expect(within(log).getAllByText("10:01").length).toBe(2);
		expect(
			within(log).getByText("INC-20311 · Notebook lento após atualização"),
		).toBeTruthy();
		expect(
			within(log).getByText("Transferida para Suporte N2 · 10:05"),
		).toBeTruthy();
	});

	test("header: name, department, ticket and state badge", () => {
		setup();
		const header = screen.getByRole("banner");
		expect(within(header).getByText("Ana Souza")).toBeTruthy();
		expect(within(header).getByText("Financeiro · INC-20311")).toBeTruthy();
		expect(within(header).getByText("Aguardando atendente")).toBeTruthy();
	});

	test("waiting: banner, both buttons and a disabled field", async () => {
		const { act, onChanged } = setup();
		expect(screen.getByText("Ana espera um atendente")).toBeTruthy();
		expect(screen.getByText("Agent pausado · até 12:05")).toBeTruthy();
		const field = screen.getByPlaceholderText(
			"Assuma o atendimento para responder",
		) as HTMLTextAreaElement;
		expect(field.disabled).toBe(true);
		await userEvent.click(
			screen.getByRole("button", { name: "Assumir atendimento" }),
		);
		expect(act).toHaveBeenCalledWith("assume", undefined);
		await waitFor(() => expect(onChanged).toHaveBeenCalled());
	});

	test("give back from waiting", async () => {
		const { act } = setup();
		await userEvent.click(
			screen.getByRole("button", { name: "Devolver ao agent" }),
		);
		expect(act).toHaveBeenCalledWith("return", undefined);
	});

	test("assumed by me: field on, header has give back and close", async () => {
		const { act } = setup(mine());
		const header = screen.getByRole("banner");
		expect(
			within(header).getByRole("button", { name: "Devolver ao agent" }),
		).toBeTruthy();
		expect(
			within(header).getByRole("button", { name: "Encerrar atendimento" }),
		).toBeTruthy();
		expect(screen.getByText("Rafael Lima · Suporte N2")).toBeTruthy();
		const field = screen.getByRole("textbox", { name: "Resposta" });
		await userEvent.type(field, "Ótimo! Vou iniciar o acesso remoto.");
		await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
		expect(act).toHaveBeenCalledWith(
			"reply",
			"Ótimo! Vou iniciar o acesso remoto.",
		);
		await waitFor(() => expect((field as HTMLTextAreaElement).value).toBe(""));
	});

	test("close asks for confirmation", async () => {
		const { act } = setup(mine());
		await userEvent.click(
			within(screen.getByRole("banner")).getByRole("button", {
				name: "Encerrar atendimento",
			}),
		);
		const dialog = screen.getByRole("alertdialog");
		expect(
			within(dialog).getByText("Encerrar o atendimento de Ana Souza?"),
		).toBeTruthy();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Voltar" }),
		);
		expect(act).not.toHaveBeenCalled();
		await userEvent.click(
			within(screen.getByRole("banner")).getByRole("button", {
				name: "Encerrar atendimento",
			}),
		);
		await userEvent.click(
			within(screen.getByRole("alertdialog")).getByRole("button", {
				name: "Encerrar",
			}),
		);
		expect(act).toHaveBeenCalledWith("close", undefined);
	});

	test("TAKEN shows who took it and reloads", async () => {
		const { onChanged } = setup(anaConversation(), {
			ok: false,
			error: "TAKEN",
			message: "Marina Teixeira já assumiu esta conversa.",
		});
		await userEvent.click(
			screen.getByRole("button", { name: "Assumir atendimento" }),
		);
		expect((await screen.findByRole("alert")).textContent).toContain(
			"Marina Teixeira já assumiu esta conversa.",
		);
		expect(onChanged).toHaveBeenCalled();
	});

	test("a failed action warns and keeps the screen", async () => {
		setup(anaConversation(), {
			ok: false,
			error: "SERVICE_UNAVAILABLE",
			message: "Não foi possível concluir. Tente de novo.",
		});
		await userEvent.click(
			screen.getByRole("button", { name: "Assumir atendimento" }),
		);
		expect((await screen.findByRole("alert")).textContent).toContain(
			"Não foi possível concluir",
		);
		expect(screen.getByText("Ana espera um atendente")).toBeTruthy();
	});

	test("the magnifier finds and highlights text", async () => {
		setup();
		await userEvent.click(
			screen.getByRole("button", { name: "Buscar na conversa" }),
		);
		await userEvent.type(
			screen.getByRole("searchbox", { name: "Buscar na conversa" }),
			"analista",
		);
		const marks = screen.getByRole("log").querySelectorAll("mark");
		expect(marks.length).toBe(2);
		expect(screen.getByText("2 resultados")).toBeTruthy();
	});

	test("⋮ menu enables items by state", async () => {
		const { onDecision, act } = setup();
		await userEvent.click(screen.getByRole("button", { name: "Mais ações" }));
		const menu = screen.getByRole("menu");
		const itemOf = (name: string) =>
			within(menu).getByRole("menuitem", { name }) as HTMLButtonElement;
		expect(itemOf("Ver decisões do agent").disabled).toBe(false);
		expect(itemOf("Assumir atendimento").disabled).toBe(false);
		expect(itemOf("Encerrar atendimento").disabled).toBe(false);
		await userEvent.click(itemOf("Ver decisões do agent"));
		expect(onDecision).toHaveBeenCalled();
		await userEvent.click(screen.getByRole("button", { name: "Mais ações" }));
		await userEvent.click(
			within(screen.getByRole("menu")).getByRole("menuitem", {
				name: "Assumir atendimento",
			}),
		);
		expect(act).toHaveBeenCalledWith("assume", undefined);
	});

	test("⋮ assume follows the state: on with the agent, off once mine", async () => {
		const assumeItem = async () => {
			await userEvent.click(screen.getByRole("button", { name: "Mais ações" }));
			return within(screen.getByRole("menu")).getByRole("menuitem", {
				name: "Assumir atendimento",
			}) as HTMLButtonElement;
		};
		const agent = setup(
			anaConversation({
				state: "agent",
				status: { kind: "agent" },
				contactBy: null,
			}),
		);
		expect((await assumeItem()).disabled).toBe(false);
		agent.view.unmount();
		setup(mine());
		expect((await assumeItem()).disabled).toBe(true);
		expect(
			(
				within(screen.getByRole("menu")).getByRole("menuitem", {
					name: "Encerrar atendimento",
				}) as HTMLButtonElement
			).disabled,
		).toBe(false);
	});

	test("⋮ on a closed conversation disables the actions", async () => {
		setup(
			anaConversation({
				state: "encerrada",
				status: { kind: "encerrada" },
				contactBy: null,
			}),
		);
		await userEvent.click(screen.getByRole("button", { name: "Mais ações" }));
		const menu = screen.getByRole("menu");
		expect(
			(
				within(menu).getByRole("menuitem", {
					name: "Assumir atendimento",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(
			(
				within(menu).getByRole("menuitem", {
					name: "Encerrar atendimento",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
	});

	test("clicking the action line opens the decision", async () => {
		const { onDecision } = setup();
		await userEvent.click(
			screen.getAllByRole("button", { name: /Nexo Assist/ })[0] as HTMLElement,
		);
		expect(onDecision).toHaveBeenCalled();
	});

	test("skeletons while loading; reopen tickets panel button when closed", async () => {
		const onShowTickets = mock(() => {});
		render(
			<ConversationView
				data={null}
				loading
				now={NOW}
				act={async () => ({ ok: true })}
				onChanged={() => {}}
				onDecision={() => {}}
				ticketsOpen={false}
				onShowTickets={onShowTickets}
			/>,
		);
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
	});

	test("panel closed: header button reopens it", async () => {
		const act = mock(async (): Promise<ActionResult> => ({ ok: true }));
		const onShowTickets = mock(() => {});
		render(
			<ConversationView
				data={anaConversation()}
				loading={false}
				now={NOW}
				act={act}
				onChanged={() => {}}
				onDecision={() => {}}
				ticketsOpen={false}
				onShowTickets={onShowTickets}
			/>,
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Mostrar chamados" }),
		);
		expect(onShowTickets).toHaveBeenCalled();
	});

	test("a question the agent also wrote as text shows once", () => {
		const question = "Quer que eu chame um analista?";
		setup(
			anaConversation({}, [
				message(
					"agent",
					`Está sem atualização há 6 dias. ${question}`,
					"2026-10-28T13:06:00.000Z",
					{
						blocks: [
							{
								kind: "text",
								text: `Está sem atualização há 6 dias. ${question}`,
							},
							{
								kind: "options",
								question,
								options: ["Falar com um analista", "Não, obrigado"],
							},
						],
					},
				),
			]),
		);
		const log = screen.getByRole("log");
		expect(within(log).getAllByText(question, { exact: false })).toHaveLength(
			1,
		);
		expect(
			within(log).getByText("Está sem atualização há 6 dias."),
		).toBeTruthy();
	});
});
