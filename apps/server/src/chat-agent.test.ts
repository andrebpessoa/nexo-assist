import { describe, expect, test } from "bun:test";

import { emptyUnderstanding } from "@nexo-assist/agent/understand";

import { chooseUnderstander } from "./chat-agent";
import { createDevUnderstander } from "./dev-understander";

const read = async (text: string) =>
	(
		await createDevUnderstander().understand({
			window: { summary: null, messages: [{ role: "employee", text }] },
			profile: { name: "Ana", os: null, department: null },
			pending: null,
		} as never)
	).understanding;

describe("chat agent", () => {
	test("model choice", () => {
		expect(
			chooseUnderstander({ GOOGLE_GENERATIVE_AI_API_KEY: "k" }).modelId,
		).toBe("google/gemini-2.5-flash-lite");
		expect(chooseUnderstander({ DEV_SEED_ENABLED: "true" }).modelId).toBe(
			"dev-keywords",
		);
		expect(chooseUnderstander({}).modelId).toBeUndefined();
	});

	test("no key and no dev: the model is down", async () => {
		const { understander } = chooseUnderstander({ DEV_SEED_ENABLED: "false" });
		await expect(understander.understand({} as never)).rejects.toThrow(
			"model not configured",
		);
	});

	test("dev keywords", async () => {
		const vpn = await read(
			"Meu notebook não conecta na VPN desde ontem. Aparece o erro 809.",
		);
		expect(vpn.intent).toBe("abrir_chamado");
		expect(vpn.fields.category).toBe("Rede e VPN");
		expect(vpn.fields.type).toBe("INC");
		expect(vpn.fields.title).toBe(
			"Meu notebook não conecta na VPN desde ontem",
		);
		expect((await read("Qual o status do meu chamado?")).intent).toBe(
			"consultar_chamado",
		);
		expect((await read("INC-20311")).ticketNumber).toBe("INC-20311");
		expect((await read("quero falar com um analista")).wantsAnalyst).toBe(true);
		expect((await read("oi")).intent).toBe(emptyUnderstanding().intent);
	});
});
