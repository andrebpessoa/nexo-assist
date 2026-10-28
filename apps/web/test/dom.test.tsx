import { expect, test } from "bun:test";

import { render, screen } from "@testing-library/react";

test("component tests render into a DOM", () => {
	render(<p>Nexo Assist</p>);
	expect(screen.getByText("Nexo Assist").tagName).toBe("P");
});
