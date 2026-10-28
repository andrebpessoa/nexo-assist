import { describe, expect, mock, test } from "bun:test";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppSidebar } from "./app-sidebar";

const ana = {
	name: "Ana Souza",
	email: "ana.souza@nexo.com.br",
	initials: "AS",
};

describe("AppSidebar", () => {
	test("user and active item", () => {
		render(
			<AppSidebar
				me={ana}
				active="perfil"
				onNavigate={() => {}}
				onSignOut={async () => {}}
			/>,
		);
		const nav = screen.getByRole("navigation");
		const current = within(nav).getByRole("link", { current: "page" });
		expect(current.textContent).toBe("Meu perfil");
		expect(
			within(nav)
				.getByRole("link", { name: "Atendimento" })
				.getAttribute("aria-current"),
		).toBeNull();
		expect(screen.getByText("AS")).toBeTruthy();
		expect(screen.getByText("Ana Souza")).toBeTruthy();
		expect(screen.getByText("ana.souza@nexo.com.br")).toBeTruthy();
	});

	test("user and active item follow the open page", () => {
		render(
			<AppSidebar
				me={ana}
				active="atendimento"
				onNavigate={() => {}}
				onSignOut={async () => {}}
			/>,
		);
		expect(screen.getByRole("link", { current: "page" }).textContent).toBe(
			"Atendimento",
		);
	});

	test("navigates without a full reload", async () => {
		const onNavigate = mock(() => {});
		render(
			<AppSidebar
				me={ana}
				active="perfil"
				onNavigate={onNavigate}
				onSignOut={async () => {}}
			/>,
		);
		await userEvent
			.setup()
			.click(screen.getByRole("link", { name: "Atendimento" }));
		expect(onNavigate).toHaveBeenCalledWith("/atendimento");
	});

	test("sign out ends the session", async () => {
		const onSignOut = mock(async () => {});
		render(
			<AppSidebar
				me={ana}
				active="perfil"
				onNavigate={() => {}}
				onSignOut={onSignOut}
			/>,
		);
		await userEvent.setup().click(screen.getByRole("button", { name: "Sair" }));
		expect(onSignOut).toHaveBeenCalledTimes(1);
	});
});
