import { describe, expect, mock, test } from "bun:test";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConversationList, Rail } from "./conversation-list";
import { item, list, NOW } from "./fixtures";

const items = [
	item(),
	item({
		id: "c2",
		name: "Carla Mendes",
		status: { kind: "transferida", ticket: null },
		ticket: null,
		tickets: [],
		contactBy: "2026-10-28T13:35:00.000Z",
		unread: 1,
	}),
	item({
		id: "c3",
		name: "Diego Alves",
		state: "agent",
		status: { kind: "agent" },
		ticket: null,
		tickets: ["INC-20519"],
		unread: 0,
		contactBy: null,
	}),
	item({
		id: "c4",
		name: "Fábio Nunes",
		state: "com_analista",
		status: { kind: "voce" },
		assigneeId: "r",
		unread: 0,
		contactBy: null,
	}),
];

function setup(over: Partial<Parameters<typeof ConversationList>[0]> = {}) {
	const onSelect = mock((_id: string) => {});
	const onAvailable = mock((_v: boolean) => {});
	render(
		<ConversationList
			list={list(items)}
			loading={false}
			now={NOW}
			selectedId="c1"
			onSelect={onSelect}
			available
			onAvailable={onAvailable}
			{...over}
		/>,
	);
	return { onSelect, onAvailable };
}

const rows = () => {
	const ul = screen.queryByRole("list", { name: "Conversas" });
	return ul ? within(ul).queryAllByRole("button") : [];
};

describe("ConversationList", () => {
	test("each item shows initials, name, time, preview, unread and label", () => {
		setup();
		const ana = rows()[0] as HTMLElement;
		expect(within(ana).getByText("AS")).toBeTruthy();
		expect(within(ana).getByText("Ana Souza")).toBeTruthy();
		expect(within(ana).getByText("10:05")).toBeTruthy();
		expect(within(ana).getByText("Está parado há 5 dias.")).toBeTruthy();
		expect(within(ana).getByLabelText("2 não lidas")).toBeTruthy();
		expect(within(ana).getByText("Transferida · INC-20311")).toBeTruthy();
		expect(ana.getAttribute("aria-current")).toBe("true");
		expect(
			within(rows()[1] as HTMLElement).getByText(
				"Transferida · contato em 25 min",
			),
		).toBeTruthy();
	});

	test("filters show their totals and narrow the list", async () => {
		setup();
		expect(screen.getByRole("tab", { name: "Todas" })).toBeTruthy();
		expect(screen.getByRole("tab", { name: "Para você 2" })).toBeTruthy();
		expect(screen.getByRole("tab", { name: "Com o agent 1" })).toBeTruthy();
		await userEvent.click(screen.getByRole("tab", { name: "Minhas 1" }));
		expect(rows()).toHaveLength(1);
		expect(
			within(rows()[0] as HTMLElement).getByText("Fábio Nunes"),
		).toBeTruthy();
		await userEvent.click(screen.getByRole("tab", { name: "Para você 2" }));
		expect(rows()).toHaveLength(2);
	});

	test("search by name or ticket without accents; empty shows the notice", async () => {
		setup();
		const box = screen.getByPlaceholderText("Pesquisar conversa ou chamado");
		await userEvent.type(box, "fabio");
		expect(rows()).toHaveLength(1);
		await userEvent.clear(box);
		await userEvent.type(box, "inc-20519");
		expect(
			within(rows()[0] as HTMLElement).getByText("Diego Alves"),
		).toBeTruthy();
		await userEvent.clear(box);
		await userEvent.type(box, "zzz");
		expect(rows()).toHaveLength(0);
		expect(screen.getByText("Nenhuma conversa aqui.")).toBeTruthy();
	});

	test("picking a conversation", async () => {
		const { onSelect } = setup();
		await userEvent.click(screen.getByText("Carla Mendes"));
		expect(onSelect).toHaveBeenCalledWith("c2");
	});

	test("Disponível toggles", async () => {
		const { onAvailable } = setup();
		const sw = screen.getByRole("switch", { name: "Disponível" });
		expect(sw.getAttribute("aria-checked")).toBe("true");
		await userEvent.click(sw);
		expect(onAvailable).toHaveBeenCalledWith(false);
	});

	test("skeletons while loading", () => {
		setup({ list: null, loading: true });
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
	});
});

describe("Rail", () => {
	test("badge shows Para você; off when unavailable", () => {
		const { rerender } = render(<Rail badge={3} available initials="RL" />);
		expect(screen.getByLabelText("3 conversas para você")).toBeTruthy();
		rerender(<Rail badge={3} available={false} initials="RL" />);
		expect(screen.queryByLabelText("3 conversas para você")).toBeNull();
		expect(screen.getByText("RL")).toBeTruthy();
	});
});
