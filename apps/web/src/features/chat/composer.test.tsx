import { describe, expect, mock, test } from "bun:test";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Composer } from "./composer";

const base = {
	count: 18,
	limit: 30,
	busy: false,
	onSend: () => {},
	onAnalyst: () => {},
	onNewConversation: () => {},
};

describe("Composer", () => {
	test("send disabled when empty", async () => {
		render(<Composer {...base} />);
		const send = screen.getByRole("button", {
			name: /Enviar/,
		}) as HTMLButtonElement;
		expect(send.disabled).toBe(true);
		await userEvent.type(
			screen.getByPlaceholderText("Escreva para o Nexo..."),
			"   ",
		);
		expect(send.disabled).toBe(true);
		await userEvent.type(
			screen.getByPlaceholderText("Escreva para o Nexo..."),
			"oi",
		);
		expect(send.disabled).toBe(false);
		expect(screen.getByText("18/30 mensagens nesta sessão")).toBeTruthy();
	});

	test("max length", () => {
		const onSend = mock((_: string) => {});
		render(<Composer {...base} onSend={onSend} />);
		const field = screen.getByPlaceholderText("Escreva para o Nexo...");
		fireEvent.change(field, { target: { value: "a".repeat(2001) } });
		expect(screen.getByText("Máximo de 2.000 caracteres.")).toBeTruthy();
		const send = screen.getByRole("button", {
			name: /Enviar/,
		}) as HTMLButtonElement;
		expect(send.disabled).toBe(true);
		fireEvent.keyDown(field, { key: "Enter" });
		expect(onSend).not.toHaveBeenCalled();
		fireEvent.change(field, { target: { value: "a".repeat(2000) } });
		expect(screen.queryByText("Máximo de 2.000 caracteres.")).toBeNull();
	});

	test("enter sends, shift enter breaks", async () => {
		const onSend = mock((_: string) => {});
		render(<Composer {...base} onSend={onSend} />);
		const field = screen.getByPlaceholderText(
			"Escreva para o Nexo...",
		) as HTMLTextAreaElement;
		await userEvent.type(field, "linha 1{Shift>}{Enter}{/Shift}linha 2");
		expect(field.value).toBe("linha 1\nlinha 2");
		expect(onSend).not.toHaveBeenCalled();
		await userEvent.type(field, "{Enter}");
		expect(onSend).toHaveBeenCalledWith("linha 1\nlinha 2");
		expect(field.value).toBe("");
	});

	test("busy keeps the text but blocks sending", async () => {
		const onSend = mock((_: string) => {});
		render(<Composer {...base} busy onSend={onSend} />);
		const field = screen.getByPlaceholderText("Escreva para o Nexo...");
		await userEvent.type(field, "oi{Enter}");
		expect(onSend).not.toHaveBeenCalled();
		expect(
			(screen.getByRole("button", { name: /Enviar/ }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	test("limit reached", async () => {
		const onAnalyst = mock(() => {});
		const onNew = mock(() => {});
		render(
			<Composer
				{...base}
				count={30}
				onAnalyst={onAnalyst}
				onNewConversation={onNew}
			/>,
		);
		expect(
			screen.getByText("Você chegou ao limite de 30 mensagens nesta conversa."),
		).toBeTruthy();
		expect(
			(
				screen.getByPlaceholderText(
					"Escreva para o Nexo...",
				) as HTMLTextAreaElement
			).disabled,
		).toBe(true);
		expect(
			(screen.getByRole("button", { name: /Enviar/ }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		await userEvent.click(
			screen.getByRole("button", { name: "Falar com um analista" }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Nova conversa" }),
		);
		expect(onAnalyst).toHaveBeenCalledTimes(1);
		expect(onNew).toHaveBeenCalledTimes(1);
		expect(screen.getByText("30/30 mensagens nesta sessão")).toBeTruthy();
	});
});
