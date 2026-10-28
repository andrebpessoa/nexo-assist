import { describe, expect, mock, test } from "bun:test";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { type LoginOutcome, LoginPage, type LoginValues } from "./login-page";

function setup(
	submit: (values: LoginValues) => Promise<LoginOutcome> = async () => ({
		ok: true,
	}),
) {
	const onSubmit = mock(submit);
	const user = userEvent.setup();
	render(<LoginPage onSubmit={onSubmit} />);
	const email = screen.getByLabelText("E-mail corporativo") as HTMLInputElement;
	const password = screen.getByLabelText("Senha") as HTMLInputElement;
	const button = screen.getByRole("button", { name: /Entrar/ });
	return { onSubmit, user, email, password, button };
}

describe("LoginPage", () => {
	test("prototype texts: showcase and form", () => {
		setup();
		expect(
			screen.getByText("Seu problema de TI, resolvido em uma conversa."),
		).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy();
		expect(
			screen.getByText("Use seu e-mail corporativo e a senha da rede Nexo."),
		).toBeTruthy();
		expect(screen.getByLabelText("E-mail corporativo")).toBeTruthy();
		expect(screen.getByLabelText("Senha")).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Esqueci minha senha" }),
		).toBeTruthy();
		expect(
			screen.getByLabelText("Manter conectado neste computador"),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: /Entrar/ })).toBeTruthy();
		expect(screen.getByText("Ligue no ramal 4000")).toBeTruthy();
		for (const stat of ["8 s", "72%", "6"]) {
			expect(screen.getByText(stat)).toBeTruthy();
		}
	});

	test("submits the typed values with remember me", async () => {
		const { onSubmit, user, email, password, button } = setup();
		await user.type(email, "ana.souza@nexo.com.br");
		await user.type(password, "qualquer");
		await user.click(button);
		expect(onSubmit).toHaveBeenCalledWith({
			email: "ana.souza@nexo.com.br",
			password: "qualquer",
			rememberMe: true,
		});
		await user.click(
			screen.getByLabelText("Manter conectado neste computador"),
		);
		await user.click(button);
		expect(onSubmit).toHaveBeenLastCalledWith(
			expect.objectContaining({ rememberMe: false }),
		);
	});

	test("unknown email message under the field", async () => {
		const { user, email, password, button } = setup(async () => ({
			ok: false,
			error: "EMAIL_NOT_FOUND",
		}));
		await user.type(email, "fulano@nexo.com.br");
		await user.type(password, "x");
		await user.click(button);
		const message = await screen.findByText(
			"Não encontramos esse e-mail. Use seu e-mail corporativo da Nexo.",
		);
		expect(email.getAttribute("aria-invalid")).toBe("true");
		expect(email.getAttribute("aria-describedby")).toBe(message.id);
	});

	test("invalid fields are not sent", async () => {
		const { onSubmit, user, email, password, button } = setup();
		await user.click(button);
		expect(screen.getByText("Digite seu e-mail corporativo.")).toBeTruthy();
		expect(screen.getByText("Digite sua senha.")).toBeTruthy();
		await user.type(email, "ana.souza");
		await user.type(password, "x");
		await user.click(button);
		expect(screen.getByText("Digite um e-mail válido.")).toBeTruthy();
		expect(email.getAttribute("aria-invalid")).toBe("true");
		await user.clear(email);
		await user.type(email, "ana.souza@nexo.com.br");
		await user.clear(password);
		await user.type(password, "   ");
		await user.click(button);
		expect(password.getAttribute("aria-invalid")).toBe("true");
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test("pending disables submit and shows a spinner", async () => {
		let finish: (outcome: LoginOutcome) => void = () => {};
		const { user, email, password, button } = setup(
			() =>
				new Promise<LoginOutcome>((resolve) => {
					finish = resolve;
				}),
		);
		await user.type(email, "ana.souza@nexo.com.br");
		await user.type(password, "x");
		await user.click(button);
		expect((button as HTMLButtonElement).disabled).toBe(true);
		expect(button.getAttribute("aria-busy")).toBe("true");
		expect(screen.getByTestId("login-spinner")).toBeTruthy();
		finish({ ok: false, error: "UNKNOWN" });
		await waitFor(() =>
			expect((button as HTMLButtonElement).disabled).toBe(false),
		);
	});

	test("server error keeps input and shows the generic message", async () => {
		const { user, email, password, button } = setup(async () => {
			throw new Error("network down");
		});
		await user.type(email, "ana.souza@nexo.com.br");
		await user.type(password, "segredo");
		await user.click(button);
		expect(
			await screen.findByText("Não foi possível entrar agora. Tente de novo."),
		).toBeTruthy();
		expect(email.value).toBe("ana.souza@nexo.com.br");
		expect(password.value).toBe("segredo");
	});

	test("eye toggles password visibility", async () => {
		const { user, password } = setup();
		expect(password.type).toBe("password");
		await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
		expect(password.type).toBe("text");
		await user.click(screen.getByRole("button", { name: "Esconder senha" }));
		expect(password.type).toBe("password");
	});

	test("forgot password is simulated", async () => {
		const { onSubmit, user } = setup();
		await user.click(
			screen.getByRole("button", { name: "Esqueci minha senha" }),
		);
		expect(
			screen.getByText(
				"Neste ambiente qualquer senha entra. Em produção, enviaríamos um link para o seu e-mail.",
			),
		).toBeTruthy();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test("privacy opens a short modal", async () => {
		const { user } = setup();
		await user.click(
			screen.getByRole("button", { name: "Privacidade e uso de dados" }),
		);
		const dialog = screen.getByRole("dialog");
		expect(dialog.textContent).toContain("só os próprios chamados");
		await user.click(screen.getByRole("button", { name: "Fechar" }));
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	test("no sign up link anywhere", () => {
		setup();
		const text = document.body.textContent?.toLowerCase() ?? "";
		for (const word of ["cadastr", "criar conta", "sign up", "registr"]) {
			expect(text).not.toContain(word);
		}
	});
});
