import { describe, expect, test } from "bun:test";

import { COPY } from "./copy";
import { agentHarness, said, toolNames } from "./testing";

const vpn = (judgement: Record<string, unknown>) => [
	{
		understanding: {
			intent: "duvida" as const,
			confidence: 88,
			fields: {
				title: "VPN com erro 809",
				description: "Minha VPN dá erro 809",
			},
		},
		judgement,
	},
];

describe("help center", () => {
	test("searches help center first", async () => {
		const asked = await agentHarness({
			turns: vpn({ articleSlug: "vpn-erro-809", articleFits: true }),
		});
		const doubt = await asked.agent.send(asked.ids.bruno as string, {
			text: "Minha VPN dá erro 809",
		});
		expect(toolNames(doubt.decision)).toEqual([
			"modelo.entender",
			"central.buscar",
			"modelo.comparar",
		]);

		const opening = await agentHarness({
			turns: [
				{
					understanding: {
						intent: "abrir_chamado",
						confidence: 90,
						fields: {
							title: "Impressora não imprime",
							description: "A impressora não imprime nada",
						},
					},
				},
			],
		});
		const open = await opening.agent.send(opening.ana, {
			text: "A impressora não imprime nada",
		});
		const names = toolNames(open.decision);
		expect(names.indexOf("central.buscar")).toBeGreaterThan(-1);
		expect(names.indexOf("central.buscar")).toBeLessThan(
			names.indexOf("chamados.listar"),
		);
	});

	test("article answers", async () => {
		const { agent, ids, store } = await agentHarness({
			turns: vpn({ articleSlug: "vpn-erro-809", articleFits: true }),
		});
		const turn = await agent.send(ids.bruno as string, {
			text: "Minha VPN dá erro 809",
		});
		expect(turn.decision?.action).toBe("responder_artigo");
		expect(said(turn.blocks)).toContain("“VPN com erro 809”");
		expect(turn.blocks).toContainEqual(
			expect.objectContaining({ kind: "article", slug: "vpn-erro-809" }),
		);
		expect(toolNames(turn.decision)).not.toContain("chamados.criar");
		expect((await store.get(turn.conversationId))?.pending).toBeNull();
	});

	test("article condition fails", async () => {
		const { agent, ana } = await agentHarness({
			turns: vpn({
				articleSlug: "vpn-erro-809",
				articleFits: false,
				articleMisfitReason: "Ana usa Windows 11",
			}),
		});
		const turn = await agent.send(ana, { text: "Minha VPN dá erro 809" });
		const text = said(turn.blocks);
		expect(text).toContain("não serve no seu caso");
		expect(text).toContain("no Windows 11, abra um chamado");
		expect(["perguntar", "rascunho_chamado"]).toContain(
			turn.decision?.action as string,
		);
		expect(turn.blocks.some((b) => b.kind === "article")).toBe(false);
	});

	test("no article", async () => {
		const { agent, ana, store } = await agentHarness({
			turns: [{ understanding: { intent: "duvida", confidence: 85 } }],
		});
		const turn = await agent.send(ana, {
			text: "Como instalo o Photoshop no Linux?",
		});
		expect(said(turn.blocks)).toBe(COPY.noArticle);
		expect(turn.blocks).toContainEqual(
			expect.objectContaining({
				kind: "options",
				options: [...COPY.offerOptions],
			}),
		);
		expect((await store.get(turn.conversationId))?.pending).toMatchObject({
			kind: "offer_ticket",
		});
	});
});
