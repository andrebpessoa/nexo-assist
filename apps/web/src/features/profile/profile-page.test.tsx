import { describe, expect, test } from "bun:test";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProfilePage, passwordAgeLabel } from "./profile-page";

const ana = {
	name: "Ana Souza",
	email: "ana.souza@nexo.com.br",
	passwordAgeDays: 42,
};

describe("ProfilePage", () => {
	test("profile data from the session", () => {
		render(<ProfilePage me={ana} />);
		expect(screen.getByRole("heading", { name: "Meu perfil" })).toBeTruthy();
		expect(
			screen.getByText("Seus dados de acesso ao service desk de TI."),
		).toBeTruthy();
		expect(screen.getByText("Nome")).toBeTruthy();
		expect(screen.getByText("Ana Souza")).toBeTruthy();
		expect(screen.getByText("E-mail corporativo")).toBeTruthy();
		expect(
			screen.getAllByText(/ana\.souza@nexo\.com\.br/).length,
		).toBeGreaterThan(0);
		expect(screen.getByText("Gerenciado pela TI")).toBeTruthy();
		expect(screen.getByText("Alterada há 42 dias")).toBeTruthy();
		expect(
			screen.getByText(
				"Enviaremos um link de redefinição para ana.souza@nexo.com.br.",
			),
		).toBeTruthy();
	});

	test("password age label: days, one day, today, unknown", () => {
		expect(passwordAgeLabel(42)).toBe("Alterada há 42 dias");
		expect(passwordAgeLabel(1)).toBe("Alterada há 1 dia");
		expect(passwordAgeLabel(0)).toBe("Alterada hoje");
		expect(passwordAgeLabel(null)).toBe("Sem registro de alteração");
	});

	test("reset password is simulated", async () => {
		render(<ProfilePage me={ana} />);
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Redefinir senha" }));
		expect(
			screen.getByText(
				"Link enviado para ana.souza@nexo.com.br. (Simulado: nenhum e-mail sai deste ambiente.)",
			),
		).toBeTruthy();
	});
});
