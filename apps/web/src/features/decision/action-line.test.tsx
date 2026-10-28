import { describe, expect, mock, test } from "bun:test";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ActionLine } from "./action-line";
import { drafted } from "./fixtures";

describe("ActionLine", () => {
	test("action line above reply", async () => {
		const onOpen = mock(() => {});
		render(<ActionLine decision={drafted} onOpen={onOpen} />);
		const line = screen.getByRole("button", { name: /Nexo Assist/ });
		expect(line.textContent).toBe(
			"Nexo Assist✓ classificou a prioridade✓ consultou o SLA✓ montou o rascunho",
		);
		await userEvent.click(line);
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	test("failed step shows a cross", () => {
		render(
			<ActionLine
				decision={{
					...drafted,
					tools: [
						{
							name: "chamados.listar",
							ok: false,
							attempts: 4,
							error: "SERVICE_UNAVAILABLE",
						},
					],
				}}
			/>,
		);
		expect(
			screen.getByText("✕ não conseguiu consultar seus chamados"),
		).toBeTruthy();
	});

	test("progress in gerund", () => {
		render(
			<ActionLine
				decision={null}
				progress={[
					{ name: "chamados.listar", done: true, ok: true },
					{ name: "central.buscar", done: false },
				]}
			/>,
		);
		const status = screen.getByRole("status");
		expect(status.textContent).toBe(
			"Nexo Assist✓ consultou seus chamadosbuscando na central de ajuda…",
		);
	});
});
