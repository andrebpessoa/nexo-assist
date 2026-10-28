import { describe, expect, test } from "bun:test";

import type { Block } from "@nexo-assist/agent/types";

import type { ChatMessage } from "./api";
import { draft, ticket } from "./fixtures";
import { foldHistory } from "./fold";

let seq = 0;
const m = (role: ChatMessage["role"], ...blocks: Block[]): ChatMessage => ({
	seq: ++seq,
	role,
	blocks,
	decision: null,
	createdAt: "2026-10-28T13:00:00.000Z",
});
const said = (text: string) => m("employee", { kind: "text", text });
const marker = () => m("employee");
const question: Block = {
	kind: "options",
	question: "Quem está sendo afetado?",
	options: ["Só eu", "Minha equipe", "Toda a empresa", "Não sei"],
};
const pendingDraft: Block = {
	kind: "ticket_draft",
	draft,
	status: "Aguardando confirmação",
};

const items = (messages: ChatMessage[], pending: string | null = null) =>
	foldHistory(messages, pending).flatMap((x) => x.items);

describe("fold history", () => {
	test("answered options lock", () => {
		const [asked, answered, open] = items([
			m("agent", question),
			said("Só eu"),
			m("agent", { ...question, question: "Isso impede você de trabalhar?" }),
		]);
		expect(asked).toMatchObject({ active: false, chosen: "Só eu" });
		expect(answered?.block.kind).toBe("text");
		expect(open).toMatchObject({ active: true });
	});

	test("selected list locks", () => {
		const list: Block = {
			kind: "ticket_list",
			question: "Sobre qual deles quer saber?",
			tickets: [ticket],
		};
		const [picked] = items([
			m("agent", list),
			said("INC-20311 · Notebook lento após atualização"),
		]);
		expect(picked).toMatchObject({ active: false, chosen: "INC-20311" });
		expect(items([m("agent", list)])[0]?.active).toBe(true);
	});

	test("draft final state", () => {
		const folded = foldHistory(
			[
				m("agent", { kind: "text", text: "Confira" }, pendingDraft),
				marker(),
				m(
					"agent",
					{
						kind: "ticket_draft",
						draft,
						status: "Criado",
						number: "INC-20400",
					},
					{ kind: "text", text: "Pronto" },
				),
			],
			null,
		);
		const cards = folded
			.flatMap((x) => x.items)
			.filter((i) => i.block.kind === "ticket_draft");
		expect(cards).toHaveLength(1);
		expect(cards[0]).toMatchObject({
			active: false,
			block: { status: "Criado", number: "INC-20400" },
		});
		expect(folded[0]?.items.map((i) => i.block.kind)).toEqual([
			"text",
			"ticket_draft",
		]);
	});

	test("cancelled draft", () => {
		const cards = items([
			m("agent", pendingDraft),
			marker(),
			m("agent", { kind: "ticket_draft", draft, status: "Cancelado" }),
		]).filter((i) => i.block.kind === "ticket_draft");
		expect(cards).toHaveLength(1);
		expect(cards[0]).toMatchObject({
			active: false,
			block: { status: "Cancelado" },
		});
	});

	test("failed confirm keeps draft active", () => {
		const cards = items(
			[
				m("agent", pendingDraft),
				marker(),
				m("agent", {
					kind: "text",
					text: "Não consegui criar o chamado agora. Seu rascunho está guardado.",
				}),
			],
			"ticket_draft",
		).filter((i) => i.block.kind === "ticket_draft");
		expect(cards).toEqual([{ block: pendingDraft, active: true }]);
	});

	test("edited draft replaces the old card", () => {
		const edited: Block = {
			...pendingDraft,
			draft: { ...draft, title: "VPN fora" },
		};
		const cards = items(
			[m("agent", pendingDraft), marker(), m("agent", edited)],
			"ticket_draft",
		).filter((i) => i.block.kind === "ticket_draft");
		expect(cards).toEqual([{ block: edited, active: true }]);
	});

	test("draft the server no longer holds is locked", () => {
		const cards = items([
			m("agent", pendingDraft),
			said("Na verdade é só uma dúvida"),
			m("agent", { kind: "text", text: "Tudo bem." }),
		]).filter((i) => i.block.kind === "ticket_draft");
		expect(cards[0]?.active).toBe(false);
	});
});
