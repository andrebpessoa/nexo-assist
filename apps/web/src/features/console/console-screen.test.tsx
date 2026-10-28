import { beforeEach, describe, expect, mock, test } from "bun:test";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ConsoleApi, ConsoleList } from "./api";
import { ConsoleScreen } from "./console-screen";
import { anaConversation, item, list, NOW, panel } from "./fixtures";

function fakeApi(over: Partial<ConsoleApi> = {}) {
	let current: ConsoleList = list([
		item(),
		item({ id: "c2", name: "Carla Mendes", unread: 1 }),
	]);
	const api: ConsoleApi = {
		list: mock(async () => current),
		conversation: mock(async (id: string) =>
			anaConversation(id === "c2" ? { id: "c2", name: "Carla Mendes" } : {}),
		),
		tickets: mock(async () => panel()),
		ticket: mock(async () => panel().current as never),
		act: mock(async () => ({ ok: true }) as const),
		...over,
	};
	return {
		api,
		set: (l: ConsoleList) => {
			current = l;
		},
	};
}

const renderScreen = (api: ConsoleApi) =>
	render(
		<ConsoleScreen
			api={api}
			me={{ name: "Rafael Lima" }}
			now={() => NOW}
			pollMs={30}
			onSignOut={() => {}}
		/>,
	);

beforeEach(() => localStorage.clear());

describe("ConsoleScreen", () => {
	test("rail, list, open conversation and the tickets panel", async () => {
		const { api } = fakeApi();
		renderScreen(api);
		expect(
			await screen.findByRole("log", { name: "Conversa com Ana Souza" }),
		).toBeTruthy();
		expect(
			screen.getByRole("navigation", { name: "Navegação do console" }),
		).toBeTruthy();
		expect(screen.getByRole("list", { name: "Conversas" })).toBeTruthy();
		expect(
			await screen.findByRole("complementary", { name: "Chamados da Ana" }),
		).toBeTruthy();
		expect(screen.getByLabelText("2 conversas para você")).toBeTruthy();
	});

	test("list refreshes by itself", async () => {
		const { api, set } = fakeApi();
		renderScreen(api);
		await screen.findByText("Carla Mendes");
		set(
			list([
				item(),
				item({ id: "c2", name: "Carla Mendes" }),
				item({ id: "c9", name: "Elisa Rocha" }),
			]),
		);
		expect(await screen.findByText("Elisa Rocha")).toBeTruthy();
		await waitFor(() =>
			expect(screen.getByLabelText("3 conversas para você")).toBeTruthy(),
		);
	});

	test("picking another conversation loads it", async () => {
		const { api } = fakeApi();
		renderScreen(api);
		await screen.findByRole("log", { name: "Conversa com Ana Souza" });
		await userEvent.click(screen.getByText("Carla Mendes"));
		expect(
			await screen.findByRole("log", { name: "Conversa com Carla Mendes" }),
		).toBeTruthy();
		expect(api.conversation).toHaveBeenCalledWith("c2");
	});

	test("X closes the panel, header reopens", async () => {
		const { api } = fakeApi();
		renderScreen(api);
		await screen.findByRole("complementary", { name: "Chamados da Ana" });
		await userEvent.click(
			screen.getByRole("button", { name: "Fechar chamados" }),
		);
		expect(
			screen.queryByRole("complementary", { name: "Chamados da Ana" }),
		).toBeNull();
		await userEvent.click(
			screen.getByRole("button", { name: "Mostrar chamados" }),
		);
		expect(
			await screen.findByRole("complementary", { name: "Chamados da Ana" }),
		).toBeTruthy();
	});

	test("panel failure, then retry works", async () => {
		let fail = true;
		const { api } = fakeApi({
			tickets: mock(async () => {
				if (fail) throw new Error("503");
				return panel();
			}),
		});
		renderScreen(api);
		expect(
			await screen.findByText("Não foi possível carregar os chamados"),
		).toBeTruthy();
		fail = false;
		await userEvent.click(
			screen.getByRole("button", { name: "Tentar de novo" }),
		);
		expect(
			await screen.findByRole("region", { name: "Desta conversa" }),
		).toBeTruthy();
	});

	test("Disponível off hides the badge and is remembered", async () => {
		const { api } = fakeApi();
		const view = renderScreen(api);
		await screen.findByLabelText("2 conversas para você");
		await userEvent.click(screen.getByRole("switch", { name: "Disponível" }));
		expect(screen.queryByLabelText("2 conversas para você")).toBeNull();
		view.unmount();
		renderScreen(api);
		await screen.findByRole("list", { name: "Conversas" });
		expect(
			screen
				.getByRole("switch", { name: "Disponível" })
				.getAttribute("aria-checked"),
		).toBe("false");
	});

	test("an action reloads list, conversation and panel", async () => {
		const { api } = fakeApi();
		renderScreen(api);
		await screen.findByRole("log", { name: "Conversa com Ana Souza" });
		const before = (api.tickets as ReturnType<typeof mock>).mock.calls.length;
		await userEvent.click(
			within(screen.getByRole("contentinfo")).getByRole("button", {
				name: "Assumir atendimento",
			}),
		);
		expect(api.act).toHaveBeenCalledWith("c1", "assume", undefined);
		await waitFor(() =>
			expect(
				(api.tickets as ReturnType<typeof mock>).mock.calls.length,
			).toBeGreaterThan(before),
		);
	});

	test("the action line opens the decision panel in place of tickets", async () => {
		const { api } = fakeApi();
		renderScreen(api);
		await screen.findByRole("complementary", { name: "Chamados da Ana" });
		await userEvent.click(
			screen.getAllByRole("button", { name: /Nexo Assist/ })[0] as HTMLElement,
		);
		expect(await screen.findByText("Por que o Nexo fez isso")).toBeTruthy();
	});
});
