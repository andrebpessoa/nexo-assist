import type {
	Affected,
	Article,
	Category,
	EventKind,
	Priority,
	Status,
	Team,
	TicketType,
} from "../types";

export interface SeedUser {
	name: string;
	email: string;
	role: "employee" | "analyst";
	department: string | null;
	os: string | null;
	team: Team | null;
}

export interface SeedTicket {
	number: string;
	type: TicketType;
	title: string;
	description: string;
	category: Category;
	item: string | null;
	priority: Priority;
	affected: Affected;
	status: Status;
	/** E-mails, resolved to user ids when the seed is applied. */
	requester: string;
	assignee: string | null;
	openedAt: Date;
	updatedAt: Date;
	slaAnchorAt: Date;
	resolvedAt: Date | null;
	notes: { author: string; body: string; at: Date }[];
	events: {
		kind: EventKind;
		actor: string;
		summary?: string;
		team?: Team;
		at: Date;
	}[];
}

export interface SeedData {
	users: SeedUser[];
	articles: Article[];
	tickets: SeedTicket[];
}

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

const ANA = "ana.souza@nexo.com.br";
const BRUNO = "bruno.costa@nexo.com.br";
const CARLA = "carla.mendes@nexo.com.br";
const DIEGO = "diego.alves@nexo.com.br";
const MARINA = "marina.teixeira@nexo.com.br";
const RAFAEL = "rafael.lima@nexo.com.br";

const employee = (
	name: string,
	email: string,
	department: string,
	os: string,
): SeedUser => ({
	name,
	email,
	role: "employee",
	department,
	os,
	team: null,
});
const analyst = (name: string, email: string, team: Team): SeedUser => ({
	name,
	email,
	role: "analyst",
	department: "TI",
	os: null,
	team,
});

const USERS: SeedUser[] = [
	employee("Ana Souza", ANA, "Financeiro", "Windows 11"),
	employee("Bruno Costa", BRUNO, "Comercial", "Windows 10"),
	employee("Carla Mendes", CARLA, "Recursos Humanos", "macOS"),
	employee("Diego Alves", DIEGO, "Logística", "Windows 10"),
	employee("Elisa Rocha", "elisa.rocha@nexo.com.br", "Marketing", "Windows 11"),
	analyst("Marina Teixeira", MARINA, "Suporte N1"),
	analyst("Rafael Lima", RAFAEL, "Suporte N2"),
];

const ARTICLES: Article[] = [
	{
		slug: "vpn-erro-809",
		title: "VPN com erro 809",
		body: "VPN com erro 809: reinstale o cliente de VPN pelo portal de softwares e reinicie o computador.",
		appliesWhen: "Vale apenas para Windows 10; no Windows 11, abra um chamado.",
		keywords: ["vpn", "809", "conexão", "home office"],
	},
	{
		slug: "horario-service-desk",
		title: "Horário do service desk",
		body: "Horário do service desk: de segunda a sexta, das 8h às 18h. Chamados críticos têm plantão 24 horas.",
		appliesWhen: "Sempre.",
		keywords: ["horário", "atendimento", "plantão", "funcionamento"],
	},
	{
		slug: "senha-bloqueada",
		title: "Senha bloqueada no SAP ou na rede",
		body: "Depois de 3 tentativas erradas a senha bloqueia por 30 minutos. Para liberar antes, use o portal de autoatendimento de senhas.",
		appliesWhen:
			"Contas do SAP e da rede corporativa; outros sistemas pedem chamado de Acesso.",
		keywords: ["senha", "bloqueada", "sap", "desbloquear", "login"],
	},
	{
		slug: "outlook-nao-sincroniza",
		title: "Outlook não sincroniza e-mails",
		body: "Feche o Outlook, abra de novo pelo menu Iniciar com a tecla Ctrl pressionada para o modo de segurança e confira se a pasta Caixa de Entrada atualiza.",
		appliesWhen:
			"Outlook para Windows; no celular, remova e adicione a conta de novo.",
		keywords: ["outlook", "e-mail", "sincroniza", "caixa de entrada"],
	},
	{
		slug: "impressora-nao-imprime",
		title: "Impressora não imprime",
		body: "Confira se a impressora do andar está selecionada como padrão e se a fila não tem trabalhos travados; cancele os trabalhos e envie de novo.",
		appliesWhen: "Impressoras de rede dos escritórios.",
		keywords: ["impressora", "imprimir", "fila"],
	},
	{
		slug: "pedido-de-equipamento",
		title: "Pedido de equipamento",
		body: "Monitor, teclado, mouse e headset são pedidos por requisição (REQ) na categoria Hardware, com aprovação do gestor.",
		appliesWhen:
			"Equipamentos de uso individual; notebooks novos seguem o ciclo de troca.",
		keywords: [
			"monitor",
			"teclado",
			"mouse",
			"headset",
			"equipamento",
			"requisição",
		],
	},
	{
		slug: "wifi-escritorio",
		title: "Wi-Fi do escritório",
		body: "Conecte-se à rede Nexo-Corp com o seu e-mail e a senha da rede. A rede Nexo-Visitantes não acessa os sistemas internos.",
		appliesWhen: "Escritórios da Nexo.",
		keywords: ["wi-fi", "wifi", "rede", "internet", "sem fio"],
	},
];

type TicketSpec = Omit<
	SeedTicket,
	"openedAt" | "updatedAt" | "slaAnchorAt" | "resolvedAt" | "notes" | "events"
> & {
	/** Offsets back from `now`, in milliseconds. */
	opened: number;
	updated: number;
	anchor?: number;
	resolved?: number;
	notes?: { author: string; body: string; ago: number }[];
	events?: {
		kind: EventKind;
		actor: string;
		summary?: string;
		team?: Team;
		ago: number;
	}[];
};

const base = { item: null, affected: "Só eu", assignee: null } as const;

const TICKETS: TicketSpec[] = [
	{
		...base,
		number: "INC-20311",
		type: "INC",
		title: "Notebook lento após atualização do Windows",
		description:
			"Desde a última atualização do Windows o notebook demora uns 10 minutos para ligar e trava ao abrir o Excel.",
		category: "Hardware",
		item: "Notebook",
		priority: "Média",
		status: "Aguardando analista",
		requester: ANA,
		opened: 6 * DAY,
		updated: 6 * DAY,
		notes: [
			{
				author: ANA,
				body: "Já reiniciei duas vezes e continua igual.",
				ago: 6 * DAY,
			},
		],
	},
	{
		...base,
		number: "INC-20298",
		type: "INC",
		title: "Acesso à pasta Financeiro no SharePoint",
		description:
			"Preciso de acesso de edição à pasta Financeiro/Fechamento no SharePoint para o fechamento do mês.",
		category: "Acesso",
		item: "SharePoint",
		priority: "Alta",
		status: "Em andamento",
		requester: ANA,
		assignee: MARINA,
		opened: 2 * DAY,
		updated: HOUR,
		notes: [
			{ author: MARINA, body: "Pedi a liberação ao dono da pasta.", ago: HOUR },
		],
		events: [
			{
				kind: "assumido",
				actor: MARINA,
				team: "Suporte N1",
				ago: 2 * DAY - 2 * HOUR,
			},
			{ kind: "atualizado", actor: MARINA, ago: HOUR },
		],
	},
	{
		...base,
		number: "REQ-10442",
		type: "REQ",
		title: "Segundo monitor para home office",
		description:
			"Solicito um segundo monitor para trabalhar de casa, aprovado pelo meu gestor.",
		category: "Hardware",
		item: "Monitor",
		priority: "Baixa",
		status: "Aprovado",
		requester: ANA,
		assignee: MARINA,
		opened: 10 * DAY,
		updated: 7 * DAY,
		events: [
			{
				kind: "atualizado",
				actor: MARINA,
				summary: "Aprovado pelo gestor.",
				ago: 7 * DAY,
			},
		],
	},
	{
		...base,
		number: "INC-20150",
		type: "INC",
		title: "Senha do SAP bloqueada",
		description: "Minha senha do SAP bloqueou depois que errei a digitação.",
		category: "Acesso",
		item: "SAP",
		priority: "Média",
		status: "Resolvido",
		requester: ANA,
		assignee: MARINA,
		opened: 5 * DAY,
		updated: 4 * DAY,
		resolved: 4 * DAY,
		events: [
			{
				kind: "resolvido",
				actor: MARINA,
				summary: "Senha desbloqueada e redefinida.",
				ago: 4 * DAY,
			},
		],
	},
	{
		...base,
		number: "INC-19877",
		type: "INC",
		title: "Outlook não sincroniza no celular",
		description:
			"Os e-mails pararam de chegar no aplicativo do Outlook do celular.",
		category: "E-mail",
		item: "Outlook",
		priority: "Baixa",
		status: "Resolvido",
		requester: ANA,
		assignee: MARINA,
		opened: 30 * DAY,
		updated: 20 * DAY,
		resolved: 20 * DAY,
		events: [
			{
				kind: "resolvido",
				actor: MARINA,
				summary: "Conta removida e adicionada de novo.",
				ago: 20 * DAY,
			},
		],
	},
	{
		...base,
		number: "INC-19410",
		type: "INC",
		title: "Impressora do 3º andar não imprime",
		description:
			"A impressora do 3º andar mostra os trabalhos na fila mas não imprime.",
		category: "Hardware",
		item: "Impressora",
		priority: "Média",
		status: "Fechado",
		requester: ANA,
		assignee: MARINA,
		affected: "Minha equipe",
		opened: 110 * DAY,
		updated: 100 * DAY,
		resolved: 100 * DAY,
		events: [
			{
				kind: "resolvido",
				actor: MARINA,
				summary: "Fila da impressora reiniciada.",
				ago: 100 * DAY,
			},
		],
	},
	{
		...base,
		number: "INC-20305",
		type: "INC",
		title: "VPN com erro 809",
		description: "A VPN não conecta de casa e mostra o erro 809.",
		category: "Rede e VPN",
		item: "VPN",
		priority: "Alta",
		status: "Aguardando analista",
		requester: BRUNO,
		opened: 3 * HOUR,
		updated: 3 * HOUR,
	},
	{
		...base,
		number: "REQ-10450",
		type: "REQ",
		title: "Licença do Figma",
		description:
			"Preciso de uma licença do Figma para revisar as telas do novo portal de vagas.",
		category: "Software",
		item: "Figma",
		priority: "Baixa",
		status: "Em andamento",
		requester: CARLA,
		assignee: MARINA,
		opened: 2 * DAY,
		updated: DAY,
		events: [{ kind: "assumido", actor: MARINA, team: "Suporte N1", ago: DAY }],
	},
	{
		...base,
		number: "INC-20290",
		type: "INC",
		title: "Leitor de código de barras parou no centro de distribuição",
		description:
			"Nenhum leitor da doca 2 lê as etiquetas desde a troca de turno; a expedição está parada.",
		category: "Hardware",
		item: "Leitor de código de barras",
		priority: "Crítica",
		status: "Em atendimento",
		requester: DIEGO,
		assignee: RAFAEL,
		affected: "Minha equipe",
		opened: 2 * HOUR,
		updated: 30 * 60_000,
		events: [
			{
				kind: "transferido",
				actor: DIEGO,
				summary: "Leitores da doca 2 sem leitura.",
				team: "Suporte N2",
				ago: HOUR,
			},
			{ kind: "assumido", actor: RAFAEL, team: "Suporte N2", ago: 30 * 60_000 },
		],
	},
];

/** Anexo B sample data with dates relative to `now` (TKT-28 to TKT-30). Pure, so it is tested directly. */
export function buildSeed(now: Date): SeedData {
	const ago = (ms: number) => new Date(now.getTime() - ms);
	const tickets = TICKETS.map(
		({
			opened,
			updated,
			anchor,
			resolved,
			notes = [],
			events = [],
			...ticket
		}) => ({
			...ticket,
			openedAt: ago(opened),
			updatedAt: ago(updated),
			slaAnchorAt: ago(anchor ?? updated),
			resolvedAt: resolved === undefined ? null : ago(resolved),
			notes: notes.map(({ ago: offset, ...note }) => ({
				...note,
				at: ago(offset),
			})),
			events: [
				{ kind: "criado" as const, actor: ticket.requester, at: ago(opened) },
				...events.map(({ ago: offset, ...event }) => ({
					...event,
					at: ago(offset),
				})),
			],
		}),
	);
	return {
		users: USERS.map((person) => ({ ...person })),
		articles: ARTICLES.map((a) => ({ ...a })),
		tickets,
	};
}
