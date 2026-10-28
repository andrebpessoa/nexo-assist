import { describe, expect, test } from "bun:test";

import { type ConsoleAction, transition } from "./console";
import type { ConversationState } from "./types";

const conv = (state: ConversationState, assigneeId: string | null = null) => ({
	state,
	assigneeId,
});
const ME = "rafael";
const OTHER = "marina";

describe("transition", () => {
	test("assume from waiting or from the agent passes to the analyst", () => {
		for (const from of ["aguardando_analista", "agent"] as const)
			expect(transition(conv(from), "assume", ME)).toEqual({
				ok: true,
				state: "com_analista",
				assigneeId: ME,
				changed: true,
			});
	});

	test("assume twice by the same analyst changes nothing", () => {
		expect(transition(conv("com_analista", ME), "assume", ME)).toEqual({
			ok: true,
			state: "com_analista",
			assigneeId: ME,
			changed: false,
		});
	});

	test("assume a conversation another analyst took is TAKEN", () => {
		expect(transition(conv("com_analista", OTHER), "assume", ME)).toEqual({
			ok: false,
			code: "TAKEN",
		});
	});

	test("reply only by the analyst who assumed", () => {
		expect(transition(conv("com_analista", ME), "reply", ME)).toMatchObject({
			ok: true,
			state: "com_analista",
			changed: false,
		});
		expect(transition(conv("com_analista", OTHER), "reply", ME)).toEqual({
			ok: false,
			code: "NOT_YOURS",
		});
	});

	test("return to the agent from the analyst or from waiting", () => {
		for (const c of [conv("com_analista", ME), conv("aguardando_analista")])
			expect(transition(c, "return", ME)).toEqual({
				ok: true,
				state: "agent",
				assigneeId: null,
				changed: true,
			});
		expect(transition(conv("com_analista", OTHER), "return", ME)).toEqual({
			ok: false,
			code: "NOT_YOURS",
		});
	});

	test("close from the analyst, from waiting and from the agent", () => {
		for (const c of [
			conv("com_analista", ME),
			conv("aguardando_analista"),
			conv("agent"),
		])
			expect(transition(c, "close", ME)).toMatchObject({
				ok: true,
				state: "encerrada",
				changed: true,
			});
		expect(transition(conv("com_analista", OTHER), "close", ME)).toEqual({
			ok: false,
			code: "NOT_YOURS",
		});
	});

	test("every other move is INVALID_TRANSITION", () => {
		const invalid: [ConversationState, ConsoleAction][] = [
			["encerrada", "assume"],
			["encerrada", "reply"],
			["encerrada", "return"],
			["encerrada", "close"],
			["agent", "reply"],
			["agent", "return"],
			["aguardando_analista", "reply"],
		];
		for (const [state, action] of invalid)
			expect(transition(conv(state), action, ME)).toEqual({
				ok: false,
				code: "INVALID_TRANSITION",
			});
	});
});
