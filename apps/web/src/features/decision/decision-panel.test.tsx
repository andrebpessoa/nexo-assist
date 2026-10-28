import { describe, expect, mock, test } from "bun:test";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DecisionPanel } from "./decision-panel";
import { drafted } from "./fixtures";

describe("DecisionPanel", () => {
	test("panel opens and closes", async () => {
		const onClose = mock(() => {});
		render(
			<DecisionPanel
				decision={drafted}
				audience="employee"
				onClose={onClose}
			/>,
		);
		const panel = screen.getByRole("dialog", {
			name: "Por que o Nexo fez isso",
		});
		expect(within(panel).getByText("Abrir chamado")).toBeTruthy();
		expect(within(panel).getByText("88% · alta")).toBeTruthy();
		expect(within(panel).getByText(drafted.rule)).toBeTruthy();
		await userEvent.click(
			within(panel).getByRole("button", { name: "Fechar" }),
		);
		expect(onClose).toHaveBeenCalledTimes(1);
		await userEvent.keyboard("{Escape}");
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	test("employee sees time, analyst sees cost", () => {
		const { unmount } = render(
			<DecisionPanel
				decision={drafted}
				audience="employee"
				onClose={() => {}}
			/>,
		);
		expect(screen.getByText("1,3 s")).toBeTruthy();
		expect(screen.queryByText(/tokens/)).toBeNull();
		unmount();
		render(
			<DecisionPanel
				decision={drafted}
				audience="analyst"
				totals={{
					tokens: 3200,
					costUsd: 0.00036,
				}}
				onClose={() => {}}
			/>,
		);
		expect(screen.getByText("google/gemini-2.5-flash-lite")).toBeTruthy();
		expect(screen.getByText("1.840 + 96 tokens · US$ 0,000222")).toBeTruthy();
		expect(screen.getByText("3.200 tokens · US$ 0,00036")).toBeTruthy();
	});
});
