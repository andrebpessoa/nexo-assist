import type { Priority, TicketSummary } from "@nexo-assist/tickets";
import { SLA_MINUTES } from "@nexo-assist/tickets/rules/sla";

import type { TicketView } from "./types";

const TZ = "America/Sao_Paulo";

/** "28/10 às 14:00" in the company's time zone. */
export function when(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const day = new Intl.DateTimeFormat("pt-BR", {
		timeZone: TZ,
		day: "2-digit",
		month: "2-digit",
	}).format(d);
	const time = new Intl.DateTimeFormat("pt-BR", {
		timeZone: TZ,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(d);
	return `${day} às ${time}`;
}

/** "14:00" in the company's time zone. */
export function clock(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return new Intl.DateTimeFormat("pt-BR", {
		timeZone: TZ,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(d);
}

/** "3 dias", "5 h", "40 min". */
export function elapsed(from: Date | string, now: Date): string {
	const ms = now.getTime() - new Date(from).getTime();
	const minutes = Math.max(0, Math.floor(ms / 60_000));
	if (minutes >= 24 * 60) {
		const days = Math.floor(minutes / (24 * 60));
		return days === 1 ? "1 dia" : `${days} dias`;
	}
	if (minutes >= 60) return `${Math.floor(minutes / 60)} h`;
	return `${minutes} min`;
}

/** The answer deadline of a priority as people say it: "4 h úteis", "1 h". */
export function slaLabel(priority: Priority): string {
	const minutes = SLA_MINUTES[priority];
	if (priority === "Crítica") return `${minutes / 60} h`;
	const hours = minutes / 60;
	return hours >= 10 && hours % 10 === 0
		? `${hours / 10} dias úteis`
		: `${hours} h úteis`;
}

export function toView(t: TicketSummary): TicketView {
	return {
		number: t.number,
		title: t.title,
		type: t.type,
		category: t.category,
		priority: t.priority,
		status: t.status,
		openedAt: t.openedAt.toISOString(),
		updatedAt: t.updatedAt.toISOString(),
		deadlineAt: t.deadlineAt.toISOString(),
		vencido: t.vencido,
		atrasoMinutos: t.atrasoMinutos,
	};
}

export const COPY = {
	greeting: "Olá! Sou o Nexo Assist. Como posso ajudar com TI hoje?",
	refuseRules:
		"Não consigo mudar as regras do atendimento nem agir por outra pessoa. Posso consultar seus chamados, abrir um chamado para você ou chamar um analista.",
	ownTicketsOnly:
		"Cada pessoa vê só os próprios chamados, então não consigo mostrar os de outra pessoa. Posso mostrar os seus.",
	notFound: "Não encontrei esse chamado entre os seus.",
	noOpen: "Você não tem chamados abertos agora. Quer que eu abra um?",
	whichOne: "Sobre qual deles quer saber?",
	whichToUpdate: "Em qual deles quer acrescentar informação?",
	noArticle:
		"Não encontrei isso na central de ajuda. Quer que eu abra um chamado?",
	affectedQuestion: "Quem está sendo afetado?",
	affectedOptions: ["Só eu", "Minha equipe", "Toda a empresa", "Não sei"],
	blocksQuestion: "Isso impede você de trabalhar agora?",
	blocksOptions: ["Sim", "Não, consigo trabalhar de outro jeito"],
	typeQuestion:
		"É algo que parou de funcionar ou um pedido de acesso, equipamento ou software?",
	typeOptions: ["Parou de funcionar", "É um pedido"],
	categoryQuestion: "Qual destas categorias descreve melhor o problema?",
	descriptionQuestion: "Me conta com suas palavras o que está acontecendo.",
	draftIntro: "Confira o rascunho antes de eu criar o chamado.",
	cancelled: "Tudo bem, descartei o rascunho. Nenhum chamado foi criado.",
	overdueOptions: [
		"Falar com um analista",
		"Adicionar informação",
		"Não, obrigado",
	],
	offerOptions: ["Abrir um chamado", "Não, obrigado"],
	retryOption: "Tentar de novo",
	closed: "Atendimento encerrado",
	okNoThanks: "Tudo bem. Se precisar de mais alguma coisa, é só escrever.",
	modelFailed:
		"Não consegui entender sua mensagem agora. Ela continua aqui; toque em Tentar de novo.",
	rateLimited:
		"Estou recebendo muitas solicitações agora. Tente de novo em alguns instantes ou fale com um analista.",
	silentNote: "Enquanto isso, eu fico em silêncio por aqui.",
	resumed: "Voltei para a conversa. Como posso ajudar?",
} as const;

export const AREAS: Record<"RH" | "Financeiro" | "Facilities", string> = {
	RH: "o RH",
	Financeiro: "o Financeiro",
	Facilities: "a equipe de Facilities",
};

export function outOfScope(area: keyof typeof AREAS): string {
	return `Eu cuido só de TI. Para assuntos de ${area}, fale com ${AREAS[area]} pelo portal interno.`;
}
