import type { Understander } from "@nexo-assist/agent/understand";
import {
	emptyJudgement,
	emptyUnderstanding,
} from "@nexo-assist/agent/understand";

const has = (text: string, re: RegExp) => re.test(text);

/**
 * Local dev only, with no model key: reads a message by keywords so the screens can be walked.
 * Never used when `GOOGLE_GENERATIVE_AI_API_KEY` is set or `DEV_SEED_ENABLED` is not `true` (D-06).
 */
export function createDevUnderstander(): Understander {
	return {
		async understand({ window }) {
			const last = [...window.messages]
				.reverse()
				.find((m) => m.role === "employee");
			const text = last?.text ?? "";
			const t = text.toLowerCase();
			const u = emptyUnderstanding();
			const number =
				/\b(INC|REQ)-\d+\b/i.exec(text)?.[0]?.toUpperCase() ?? null;
			if (has(t, /^(sim|pode|quero|ok)\b/)) u.answer = "sim";
			if (has(t, /^(n[ãa]o|nao)\b/)) u.answer = "nao";
			if (has(t, /analista|atendente|uma pessoa/)) {
				u.intent = "falar_com_analista";
				u.wantsAnalyst = true;
			} else if (number || has(t, /status|meus? chamados?/)) {
				u.intent = "consultar_chamado";
				u.ticketNumber = number;
			} else if (
				has(
					t,
					/n[ãa]o (conecta|liga|funciona|abre|imprime)|parou|erro|lento|travando|preciso de|acesso/,
				)
			) {
				u.intent = "abrir_chamado";
				const first = text.split(/[.!?]/)[0]?.trim() ?? text;
				u.fields.title = first.slice(0, 80);
				u.fields.description = text;
				const request = has(t, /preciso de|acesso a|instalar|novo /);
				u.fields.type = request ? "REQ" : "INC";
				u.fields.typeConfidence = 85;
				u.fields.category = has(t, /vpn|wi-?fi|rede|internet/)
					? "Rede e VPN"
					: has(t, /notebook|mouse|monitor|teclado|impressora/)
						? "Hardware"
						: has(t, /e-?mail|outlook/)
							? "E-mail"
							: has(t, /senha|login|acesso/)
								? "Acesso"
								: "Software";
				u.fields.categoryConfidence = 85;
			} else if (has(t, /^(oi|ol[áa]|bom dia|boa tarde|obrigad|valeu)/)) {
				u.intent = "outro";
			} else if (!u.answer) {
				u.intent = "duvida";
				u.confidence = 75;
			}
			if (has(t, /s[óo] eu|somente eu/)) u.fields.affected = "Só eu";
			if (has(t, /minha equipe/)) u.fields.affected = "Minha equipe";
			if (has(t, /toda a empresa/)) u.fields.affected = "Toda a empresa";
			if (has(t, /reuni[ãa]o|hoje [àa]s|às \d+h/)) {
				u.fields.sameDayCommitment = true;
				u.fields.blocksWork = true;
			}
			return { understanding: u };
		},
		async judge() {
			return { judgement: emptyJudgement() };
		},
	};
}
