import { describe, expect, mock, test } from "bun:test";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { detail, NOW, panel } from "./fixtures";
import { TicketsPanel } from "./tickets-panel";

function setup(over: Partial<Parameters<typeof TicketsPanel>[0]> = {}) {
	const onRetry = mock(() => {});
	const onClose = mock(() => {});
	const loadTicket = mock(async (n: string) =>
		detail({
			number: n,
			title: "Acesso à pasta Financeiro/2026",
			description: "Preciso ler a pasta.",
		}),
	);
	render(
		<TicketsPanel
			name="Ana Souza"
			data={panel()}
			failed={false}
			now={NOW}
			onRetry={onRetry}
			onClose={onClose}
			loadTicket={loadTicket}
			{...over}
		/>,
	);
	return { onRetry, onClose, loadTicket };
}

describe("TicketsPanel", () => {
	test("title, totals, this conversation and others", () => {
		setup();
		const p = screen.getByRole("complementary", { name: "Chamados da Ana" });
		expect(within(p).getByText("3 abertos · 3 encerrados")).toBeTruthy();
		const here = within(p).getByRole("region", { name: "Desta conversa" });
		expect(within(here).getByText("INC-20311")).toBeTruthy();
		expect(within(here).getByText("Aguardando analista")).toBeTruthy();
		expect(
			within(here).getByText("Notebook lento após atualização"),
		).toBeTruthy();
		expect(within(here).getByText("Hardware · prioridade média")).toBeTruthy();
		expect(
			within(here).getByText("Transferido para Suporte N2 · 10:05"),
		).toBeTruthy();
		const others = within(p).getByRole("region", { name: "Outros chamados" });
		expect(within(others).getAllByRole("listitem")).toHaveLength(4);
		expect(within(others).queryByText("INC-20311")).toBeNull();
	});

	test("Ver todos expands to every ticket", async () => {
		setup();
		await userEvent.click(
			screen.getByRole("button", { name: "Ver todos os chamados da Ana ↗" }),
		);
		const others = screen.getByRole("region", { name: "Outros chamados" });
		expect(within(others).getAllByRole("listitem")).toHaveLength(5);
	});

	test("the arrow expands description, notes and events", async () => {
		const { loadTicket } = setup();
		await userEvent.click(
			screen.getByRole("button", { name: "Detalhes de REQ-10442" }),
		);
		expect(loadTicket).toHaveBeenCalledWith("REQ-10442");
		expect(await screen.findByText("Preciso ler a pasta.")).toBeTruthy();
		expect(screen.getByText("Já reiniciei duas vezes.")).toBeTruthy();
		await userEvent.click(
			screen.getByRole("button", { name: "Detalhes de INC-20311" }),
		);
		expect(
			screen.getByText(
				"Depois da atualização o notebook demora 10 minutos para ligar.",
			),
		).toBeTruthy();
	});

	test("X closes", async () => {
		const { onClose } = setup();
		await userEvent.click(
			screen.getByRole("button", { name: "Fechar chamados" }),
		);
		expect(onClose).toHaveBeenCalled();
	});

	test("failure offers a retry", async () => {
		const { onRetry } = setup({ data: null, failed: true });
		expect(
			screen.getByText("Não foi possível carregar os chamados"),
		).toBeTruthy();
		await userEvent.click(
			screen.getByRole("button", { name: "Tentar de novo" }),
		);
		await waitFor(() => expect(onRetry).toHaveBeenCalled());
	});

	test("no ticket for this conversation; skeleton while loading", () => {
		const { unmount } = render(
			<TicketsPanel
				name="Bruno Costa"
				data={panel({ current: null })}
				failed={false}
				now={NOW}
				onRetry={() => {}}
				onClose={() => {}}
				loadTicket={async () => detail()}
			/>,
		);
		expect(
			screen.getByRole("complementary", { name: "Chamados do Bruno" }),
		).toBeTruthy();
		expect(
			screen.getByText("Nenhum chamado ligado a esta conversa."),
		).toBeTruthy();
		unmount();
		setup({ data: null });
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
	});
});
