import { describe, expect, mock, test } from "bun:test";

import type { TicketView } from "@nexo-assist/agent/types";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DraftCard, Options, TicketCard, TicketList } from "./blocks";
import { draft, ticket } from "./fixtures";

const affected = {
	kind: "options" as const,
	question: "Quem está sendo afetado?",
	options: ["Só eu", "Minha equipe", "Toda a empresa", "Não sei"],
};

const tickets: TicketView[] = [
	ticket,
	{
		...ticket,
		number: "INC-20298",
		title: "Acesso à pasta Financeiro no SharePoint",
		status: "Em andamento",
		openedAt: "2026-10-14T12:00:00.000Z",
		vencido: false,
	},
	{
		...ticket,
		number: "REQ-10442",
		title: "Segundo monitor para home office",
		type: "REQ",
		status: "Aprovado",
		openedAt: "2026-10-09T12:00:00.000Z",
		vencido: false,
	},
];

describe("chat blocks", () => {
	test("options numbered", () => {
		render(<Options block={affected} active onPick={() => {}} />);
		expect(screen.getByText("Quem está sendo afetado?")).toBeTruthy();
		const buttons = screen.getAllByRole("button");
		expect(buttons.map((b) => b.textContent)).toEqual([
			"1Só eu",
			"2Minha equipe",
			"3Toda a empresa",
			"4Não sei",
		]);
	});

	test("option by click or key", async () => {
		const onPick = mock((_: string) => {});
		const { unmount } = render(
			<Options block={affected} active onPick={onPick} />,
		);
		await userEvent.click(screen.getByRole("button", { name: "Minha equipe" }));
		expect(onPick).toHaveBeenLastCalledWith("Minha equipe");
		for (const b of screen.getAllByRole("button"))
			expect((b as HTMLButtonElement).disabled).toBe(true);
		fireEvent.keyDown(document.body, { key: "1" });
		expect(onPick).toHaveBeenCalledTimes(1);
		unmount();

		const byKey = mock((_: string) => {});
		render(<Options block={affected} active onPick={byKey} />);
		fireEvent.keyDown(document.body, { key: "3" });
		expect(byKey).toHaveBeenLastCalledWith("Toda a empresa");
		fireEvent.keyDown(document.body, { key: "2" });
		expect(byKey).toHaveBeenCalledTimes(1);
	});

	test("option keys wait while the field has text", () => {
		const onPick = mock((_: string) => {});
		render(
			<>
				<textarea defaultValue="oi" />
				<Options block={affected} active onPick={onPick} />
			</>,
		);
		fireEvent.keyDown(screen.getByRole("textbox"), { key: "1" });
		expect(onPick).not.toHaveBeenCalled();
	});

	test("answered options show the pick", () => {
		render(
			<Options
				block={affected}
				active={false}
				chosen="Só eu"
				onPick={() => {}}
			/>,
		);
		const chosen = screen.getByRole("button", { name: "Só eu" });
		expect(chosen.getAttribute("aria-pressed")).toBe("true");
		expect((chosen as HTMLButtonElement).disabled).toBe(true);
	});

	test("ticket list", () => {
		render(
			<TicketList
				block={{
					kind: "ticket_list",
					question: "Sobre qual deles quer saber?",
					tickets,
				}}
				active
				onSelect={() => {}}
			/>,
		);
		const rows = screen.getAllByRole("radio");
		expect(rows).toHaveLength(3);
		const row = (i: number) => rows[i]?.closest("label") as HTMLElement;
		const first = within(row(0));
		expect(first.getByText("INC-20311")).toBeTruthy();
		expect(first.getByText("Notebook lento após atualização")).toBeTruthy();
		expect(first.getByText("Aguardando analista").className).toContain(
			"text-amber",
		);
		expect(first.getByText("16 out")).toBeTruthy();
		expect(within(row(1)).getByText("Em andamento").className).toContain(
			"text-sky",
		);
		expect(within(row(2)).getByText("Aprovado").className).toContain(
			"text-emerald",
		);
	});

	test("select ticket", async () => {
		const onSelect = mock((_: TicketView) => {});
		render(
			<TicketList
				block={{ kind: "ticket_list", question: "Qual?", tickets }}
				active
				onSelect={onSelect}
			/>,
		);
		await userEvent.click(screen.getByRole("radio", { name: /INC-20298/ }));
		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect.mock.calls[0]?.[0].number).toBe("INC-20298");
		expect(
			(screen.getByRole("radio", { name: /INC-20298/ }) as HTMLInputElement)
				.checked,
		).toBe(true);
		await userEvent.click(screen.getByRole("radio", { name: /INC-20311/ }));
		expect(onSelect).toHaveBeenCalledTimes(1);
	});

	test("ticket card", () => {
		render(
			<TicketCard
				ticket={{ ...ticket, vencido: false }}
				now={new Date("2026-10-28T13:00:00.000Z")}
			/>,
		);
		expect(screen.getByText("Chamado")).toBeTruthy();
		expect(screen.getByText("INC-20311")).toBeTruthy();
		expect(screen.getByText("Aguardando analista")).toBeTruthy();
		expect(screen.getByText("Notebook lento após atualização")).toBeTruthy();
		for (const label of [
			"Categoria",
			"Prioridade",
			"Aberto em",
			"Última atualização",
		])
			expect(screen.getByText(label)).toBeTruthy();
		expect(screen.getByText("Hardware")).toBeTruthy();
		expect(screen.getByText("Média")).toBeTruthy();
		expect(screen.getByText("16 out, 14:20")).toBeTruthy();
		expect(screen.getByText("há 5 dias")).toBeTruthy();
		expect(screen.queryByText(/prazo vencido/)).toBeNull();
	});

	test("overdue card", () => {
		render(
			<TicketCard ticket={ticket} now={new Date("2026-10-28T13:00:00.000Z")} />,
		);
		expect(screen.getByText("há 5 dias").className).toContain("text-amber");
		expect(screen.getByText("· prazo vencido").className).toContain(
			"text-amber",
		);
	});

	test("overdue offers are quick options", async () => {
		const onPick = mock((_: string) => {});
		render(
			<Options
				block={{
					kind: "options",
					question: "Quer que eu chame um analista?",
					options: [
						"Falar com um analista",
						"Adicionar informação",
						"Não, obrigado",
					],
				}}
				active
				onPick={onPick}
			/>,
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Não, obrigado" }),
		);
		expect(onPick).toHaveBeenLastCalledWith("Não, obrigado");
	});

	const pending = {
		kind: "ticket_draft" as const,
		draft,
		status: "Aguardando confirmação" as const,
	};
	const noop = () => {};

	test("draft card", () => {
		render(
			<DraftCard
				block={pending}
				id="D-381"
				active
				onConfirm={noop}
				onEdit={noop}
				onCancel={noop}
			/>,
		);
		expect(screen.getByText("Novo chamado")).toBeTruthy();
		expect(screen.getByText("Rascunho D-381")).toBeTruthy();
		expect(screen.getByText("Aguardando confirmação")).toBeTruthy();
		expect(screen.getByText(draft.title)).toBeTruthy();
		expect(screen.getByText(draft.description)).toBeTruthy();
		expect(screen.getByText("Rede e VPN")).toBeTruthy();
		expect(screen.getByText("Incidente")).toBeTruthy();
		expect(screen.getByText("Alta")).toBeTruthy();
		expect(screen.getByText("· resposta até 13:43")).toBeTruthy();
		expect(screen.getByText("Somente você")).toBeTruthy();
		expect(
			screen.getByRole("button", { name: /Confirmar/ }).textContent,
		).toMatch(/Confirmar.*↵/);
		expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
	});

	test("confirm once", async () => {
		const onConfirm = mock(() => {});
		const { rerender } = render(
			<DraftCard
				block={pending}
				id="D-381"
				active
				onConfirm={onConfirm}
				onEdit={noop}
				onCancel={noop}
			/>,
		);
		const confirm = screen.getByRole("button", { name: /Confirmar/ });
		await userEvent.click(confirm);
		await userEvent.click(confirm);
		fireEvent.keyDown(document.body, { key: "Enter", metaKey: true });
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect((confirm as HTMLButtonElement).disabled).toBe(true);
		rerender(
			<DraftCard
				block={{ ...pending, status: "Criado", number: "INC-20342" }}
				id="D-381"
				active={false}
				onConfirm={onConfirm}
				onEdit={noop}
				onCancel={noop}
			/>,
		);
		expect(screen.getByText("Chamado criado · INC-20342")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
	});

	test("confirm by shortcut", () => {
		const onConfirm = mock(() => {});
		render(
			<DraftCard
				block={pending}
				id="D-381"
				active
				onConfirm={onConfirm}
				onEdit={noop}
				onCancel={noop}
			/>,
		);
		fireEvent.keyDown(document.body, { key: "Enter", ctrlKey: true });
		fireEvent.keyDown(document.body, { key: "Enter", ctrlKey: true });
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	test("edit fields", async () => {
		const onEdit = mock((_: object) => {});
		render(
			<DraftCard
				block={pending}
				id="D-381"
				active
				onConfirm={noop}
				onEdit={onEdit}
				onCancel={noop}
			/>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Editar" }));
		const title = screen.getByLabelText("Título") as HTMLInputElement;
		expect(title.value).toBe(draft.title);
		expect(screen.getByLabelText("Descrição")).toBeTruthy();
		expect(screen.getByLabelText("Categoria")).toBeTruthy();
		expect(screen.getByLabelText("Tipo")).toBeTruthy();
		expect(screen.getByLabelText("Afetados")).toBeTruthy();
		await userEvent.click(
			screen.getByRole("button", { name: "Descartar alterações" }),
		);
		expect(screen.queryByLabelText("Título")).toBeNull();
		expect(onEdit).not.toHaveBeenCalled();

		await userEvent.click(screen.getByRole("button", { name: "Editar" }));
		const again = screen.getByLabelText("Título");
		await userEvent.clear(again);
		await userEvent.type(again, "VPN com erro 809");
		await userEvent.selectOptions(
			screen.getByLabelText("Afetados"),
			"Minha equipe",
		);
		await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
		expect(onEdit).toHaveBeenCalledTimes(1);
		expect(onEdit.mock.calls[0]?.[0]).toEqual({
			title: "VPN com erro 809",
			affected: "Minha equipe",
		});
	});

	test("cancel", async () => {
		const onCancel = mock(() => {});
		const { rerender } = render(
			<DraftCard
				block={pending}
				id="D-381"
				active
				onConfirm={noop}
				onEdit={noop}
				onCancel={onCancel}
			/>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(onCancel).toHaveBeenCalledTimes(1);
		rerender(
			<DraftCard
				block={{ ...pending, status: "Cancelado" }}
				id="D-381"
				active={false}
				onConfirm={noop}
				onEdit={noop}
				onCancel={onCancel}
			/>,
		);
		expect(screen.getByText("Cancelado")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
	});
});
