import type { Block, DecisionRecord } from "@nexo-assist/agent/types";
import { MoreVertical, PanelRightOpen, Search, Send, X } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";

import { ActionLine } from "@/features/decision/action-line";

import type {
	ActionResult,
	ConsoleAction,
	ConsoleConversation,
	ConsoleMessage,
} from "./api";
import { Avatar } from "./conversation-list";
import { dayLabel, hhmm, sameDay } from "./labels";

const MAX = 2000;
const fold = (c: string) =>
	c
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();

/** Indexes of `query` in `text`, ignoring case and accents. */
function hits(text: string, query: string): number[] {
	const q = fold(query.trim());
	if (!q) return [];
	const folded = [...text].map((c) => fold(c) || c).join("");
	const at: number[] = [];
	for (let i = folded.indexOf(q); i >= 0; i = folded.indexOf(q, i + q.length))
		at.push(i);
	return folded.length === text.length ? at : [];
}

function Highlight({ text, query }: { text: string; query: string }) {
	const at = hits(text, query);
	if (at.length === 0) return <>{text}</>;
	const len = query.trim().length;
	const parts: ReactNode[] = [];
	let from = 0;
	for (const i of at) {
		parts.push(text.slice(from, i));
		parts.push(
			<mark key={i} className="rounded-[3px] bg-amber-200 text-inherit">
				{text.slice(i, i + len)}
			</mark>,
		);
		from = i + len;
	}
	parts.push(text.slice(from));
	return <>{parts}</>;
}

/** The searchable lines a message shows. */
function lines(m: ConsoleMessage, all: ConsoleMessage[]): string[] {
	if (m.role === "employee") {
		const action: Record<string, string> = {
			"[confirm]": "Confirmou o rascunho",
			"[cancel]": "Cancelou o rascunho",
			"[edit]": "Editou o rascunho",
			"[analyst]": "Pediu um analista",
		};
		if (action[m.text]) return [action[m.text] as string];
		if (/^(INC|REQ)-\d+$/.test(m.text)) {
			const title = titleOf(m.text, all);
			return [title ? `${m.text} · ${title}` : m.text];
		}
		return [m.text];
	}
	return m.blocks.flatMap(blockLines);
}

function blockLines(b: Block): string[] {
	switch (b.kind) {
		case "text":
			return [b.text];
		case "options":
		case "ticket_list":
			return [b.question];
		case "ticket_card":
			return [`${b.ticket.number} · ${b.ticket.title} · ${b.ticket.status}`];
		case "article":
			return [b.title];
		case "ticket_draft":
			return [
				b.number
					? `Chamado ${b.number} · ${b.draft.title} · ${b.status}`
					: `Rascunho: ${b.draft.title} · ${b.status}`,
			];
		case "update_draft":
			return [`Complemento para ${b.number} · ${b.status}`];
		case "reopen_draft":
			return [`Reabrir ${b.number}`];
		default:
			return [];
	}
}

function titleOf(number: string, all: ConsoleMessage[]): string | null {
	for (const m of all)
		for (const b of m.blocks) {
			if (b.kind === "ticket_card" && b.ticket.number === number)
				return b.ticket.title;
			if (b.kind === "ticket_list") {
				const t = b.tickets.find((x) => x.number === number);
				if (t) return t.title;
			}
		}
	return null;
}

function Bubble({
	m,
	all,
	query,
	onDecision,
}: {
	m: ConsoleMessage;
	all: ConsoleMessage[];
	query: string;
	onDecision: (d: DecisionRecord) => void;
}) {
	const time = (
		<span className="text-ink-3 text-[10px]">{hhmm(m.createdAt)}</span>
	);
	if (m.role === "system")
		return (
			<p className="text-ink-3 my-1 text-center text-[11px]">
				<span className="bg-desk rounded-full px-3 py-1">
					<Highlight text={`${m.text} · ${hhmm(m.createdAt)}`} query={query} />
				</span>
			</p>
		);
	const text = lines(m, all);
	const list = m.blocks.find((b) => b.kind === "ticket_list");
	const body = (
		<div className="grid gap-1 text-[13px] leading-snug">
			{text.map((t) => (
				<p key={t} className="whitespace-pre-wrap">
					<Highlight text={t} query={query} />
				</p>
			))}
			{list?.kind === "ticket_list" && (
				<ul className="grid gap-1 pt-1">
					{list.tickets.map((t) => (
						<li
							key={t.number}
							className="border-rule bg-paper text-ink flex gap-2 rounded-[8px] border px-2 py-1 text-[12px]"
						>
							<span className="font-semibold">{t.number}</span>
							<span className="truncate">{t.title}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
	if (m.role === "employee")
		return (
			<div className="flex max-w-[70%] flex-col items-start gap-1">
				<div className="border-rule bg-paper text-ink rounded-[14px] rounded-tl-[4px] border px-3 py-2 shadow-sm">
					{body}
				</div>
				{time}
			</div>
		);
	const author = m.blocks.find((b) => b.kind === "author");
	return (
		<div className="ml-auto flex max-w-[70%] flex-col items-end gap-1">
			{m.role === "agent" ? (
				<div className="flex items-center gap-1.5">
					{m.decision ? (
						<ActionLine
							decision={m.decision}
							onOpen={() => m.decision && onDecision(m.decision)}
						/>
					) : (
						<span className="text-ink text-[11px] font-semibold">
							Nexo Assist
						</span>
					)}
					<span className="bg-cta-soft text-cta rounded-[4px] px-1 text-[9px] font-semibold">
						IA
					</span>
				</div>
			) : (
				<span className="text-[11px] font-semibold text-emerald-700">
					{author?.kind === "author"
						? `${author.name} · ${author.team}`
						: "Analista"}
				</span>
			)}
			<div
				className={`rounded-[14px] rounded-tr-[4px] px-3 py-2 ${m.role === "agent" ? "bg-cta text-white" : "bg-emerald-600 text-white"}`}
			>
				{body}
			</div>
			{time}
		</div>
	);
}

const BADGE: Record<string, { text: string; cls: string }> = {
	aguardando_analista: {
		text: "Aguardando atendente",
		cls: "bg-amber-50 text-amber-700 border-amber-200",
	},
	com_analista: {
		text: "Em atendimento",
		cls: "bg-sky-50 text-sky-700 border-sky-200",
	},
	agent: {
		text: "Agent atendendo",
		cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
	},
	encerrada: { text: "Encerrada", cls: "bg-desk text-ink-3 border-rule" },
};

const btn =
	"inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-medium disabled:opacity-50";
const ghost = `${btn} border-rule bg-paper text-ink border`;
const primary = `${btn} bg-cta text-white`;
const danger = `${btn} bg-red-600 text-white`;

export function ConversationView({
	data,
	loading,
	now,
	act,
	onChanged,
	onDecision,
	ticketsOpen,
	onShowTickets,
}: {
	data: ConsoleConversation | null;
	loading: boolean;
	now: Date;
	act: (action: ConsoleAction, text?: string) => Promise<ActionResult>;
	onChanged: () => void;
	onDecision: (d: DecisionRecord) => void;
	ticketsOpen: boolean;
	onShowTickets: () => void;
}) {
	const [draft, setDraft] = useState("");
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);
	const [menu, setMenu] = useState(false);
	const [searching, setSearching] = useState(false);
	const [query, setQuery] = useState("");

	if (!data)
		return (
			<section className="bg-desk flex min-w-0 flex-1 flex-col gap-3 p-6">
				{loading ? (
					[0, 1, 2].map((i) => (
						<div
							key={i}
							data-testid="skeleton"
							className="bg-paper h-[56px] w-2/3 animate-pulse rounded-[14px]"
						/>
					))
				) : (
					<p className="text-ink-3 m-auto text-[13px]">
						Escolha uma conversa na lista.
					</p>
				)}
			</section>
		);

	const c = data.conversation;
	const first = c.name.split(" ")[0] ?? c.name;
	const mine = c.status.kind === "voce";
	const theirs = c.status.kind === "outro_analista";
	const waiting = c.state === "aguardando_analista";
	const closed = c.state === "encerrada";
	const canAssume = waiting || c.state === "agent";
	const canClose = !closed && !theirs;
	const decisions = data.messages.filter((m) => m.decision);

	const run = async (action: ConsoleAction, text?: string) => {
		setBusy(true);
		setNotice(null);
		setMenu(false);
		setConfirming(false);
		const r = await act(action, text);
		setBusy(false);
		if (r.ok) {
			if (action === "reply") setDraft("");
			onChanged();
			return;
		}
		setNotice(r.message);
		if (r.error === "TAKEN" || r.error === "NOT_YOURS") onChanged();
	};
	const send = () => {
		const t = draft.trim();
		if (t && t.length <= MAX && !busy) void run("reply", t);
	};
	const total = query
		? data.messages.reduce(
				(n, m) =>
					n +
					(m.role === "system"
						? [`${m.text} · ${hhmm(m.createdAt)}`]
						: lines(m, data.messages)
					).reduce((k, t) => k + hits(t, query).length, 0),
				0,
			)
		: 0;
	const badge = mine ? null : BADGE[c.state];

	return (
		<section className="bg-desk relative flex min-w-0 flex-1 flex-col">
			<header className="border-rule bg-paper flex items-center gap-3 border-b px-5 py-3">
				<Avatar name={c.name} size={36} />
				<div className="min-w-0">
					<p className="text-ink text-[15px] font-semibold">{c.name}</p>
					<p className="text-ink-3 text-[12px]">
						{[c.department, c.ticket].filter(Boolean).join(" · ")}
					</p>
				</div>
				<div className="ml-auto flex items-center gap-2">
					{badge && (
						<span
							className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${badge.cls}`}
						>
							{badge.text}
						</span>
					)}
					{mine && (
						<>
							<button
								type="button"
								className={ghost}
								disabled={busy}
								onClick={() => void run("return")}
							>
								Devolver ao agent
							</button>
							<button
								type="button"
								className={danger}
								disabled={busy}
								onClick={() => setConfirming(true)}
							>
								Encerrar atendimento
							</button>
						</>
					)}
					<button
						type="button"
						aria-label="Buscar na conversa"
						onClick={() => {
							setSearching(!searching);
							setQuery("");
						}}
						className="text-ink-2 hover:bg-desk rounded-[8px] p-1.5"
					>
						<Search className="size-4" />
					</button>
					<div className="relative">
						<button
							type="button"
							aria-label="Mais ações"
							aria-expanded={menu}
							onClick={() => setMenu(!menu)}
							className="text-ink-2 hover:bg-desk rounded-[8px] p-1.5"
						>
							<MoreVertical className="size-4" />
						</button>
						{menu && (
							<div
								role="menu"
								className="border-rule bg-paper absolute top-9 right-0 z-10 grid w-[220px] rounded-[10px] border p-1 shadow-lg"
							>
								{[
									{
										label: "Ver decisões do agent",
										disabled: decisions.length === 0,
										onClick: () => {
											setMenu(false);
											const last = decisions.at(-1)?.decision;
											if (last) onDecision(last);
										},
									},
									{
										label: "Assumir atendimento",
										disabled: !canAssume || busy,
										onClick: () => void run("assume"),
									},
									{
										label: "Encerrar atendimento",
										disabled: !canClose || busy,
										onClick: () => {
											setMenu(false);
											setConfirming(true);
										},
									},
								].map((i) => (
									<button
										key={i.label}
										type="button"
										role="menuitem"
										disabled={i.disabled}
										onClick={i.onClick}
										className="text-ink hover:bg-desk rounded-[6px] px-3 py-2 text-left text-[13px] disabled:opacity-40"
									>
										{i.label}
									</button>
								))}
							</div>
						)}
					</div>
					{!ticketsOpen && (
						<button
							type="button"
							aria-label="Mostrar chamados"
							onClick={onShowTickets}
							className="text-ink-2 hover:bg-desk rounded-[8px] p-1.5"
						>
							<PanelRightOpen className="size-4" />
						</button>
					)}
				</div>
			</header>
			{searching && (
				<div className="border-rule bg-paper flex items-center gap-2 border-b px-5 py-2">
					<Search className="text-ink-3 size-4" />
					<input
						type="search"
						aria-label="Buscar na conversa"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Buscar nesta conversa"
						className="text-ink flex-1 bg-transparent text-[13px] outline-none"
					/>
					{query.trim() && (
						<span className="text-ink-3 text-[12px]">
							{total === 1 ? "1 resultado" : `${total} resultados`}
						</span>
					)}
					<button
						type="button"
						aria-label="Fechar busca"
						onClick={() => {
							setSearching(false);
							setQuery("");
						}}
					>
						<X className="text-ink-3 size-4" />
					</button>
				</div>
			)}
			<div
				role="log"
				aria-label={`Conversa com ${c.name}`}
				className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4"
			>
				{data.messages.map((m, i) => {
					const prev = data.messages[i - 1];
					return (
						<Fragment key={m.seq}>
							{(!prev || !sameDay(prev.createdAt, m.createdAt)) && (
								<p className="text-ink-3 my-1 text-center text-[11px] font-medium">
									{dayLabel(m.createdAt, now)}
								</p>
							)}
							<Bubble
								m={m}
								all={data.messages}
								query={query}
								onDecision={onDecision}
							/>
						</Fragment>
					);
				})}
			</div>
			{notice && (
				<p
					role="alert"
					className="mx-5 mb-2 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
				>
					{notice}
				</p>
			)}
			<footer className="border-rule bg-paper grid gap-3 border-t px-5 py-3">
				{waiting && (
					<div className="flex items-center gap-3 rounded-[10px] bg-amber-50 px-4 py-3">
						<div className="min-w-0 flex-1">
							<p className="text-ink text-[13px] font-semibold">
								{first} espera um atendente
							</p>
							{c.contactBy && (
								<p className="text-ink-3 text-[12px]">
									Agent pausado · até {hhmm(c.contactBy)}
								</p>
							)}
						</div>
						<button
							type="button"
							className={ghost}
							disabled={busy}
							onClick={() => void run("return")}
						>
							Devolver ao agent
						</button>
						<button
							type="button"
							className={primary}
							disabled={busy}
							onClick={() => void run("assume")}
						>
							Assumir atendimento
						</button>
					</div>
				)}
				<form
					className="flex items-end gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						send();
					}}
				>
					<textarea
						aria-label="Resposta"
						rows={1}
						maxLength={MAX}
						disabled={!mine}
						value={mine ? draft : ""}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								send();
							}
						}}
						placeholder={
							mine
								? `Escreva para ${first}…`
								: closed
									? "Atendimento encerrado"
									: theirs
										? `${c.assigneeName ?? "Outro analista"} está atendendo`
										: "Assuma o atendimento para responder"
						}
						className="border-rule bg-desk text-ink placeholder:text-ink-3 min-h-[40px] flex-1 resize-none rounded-[10px] border px-3 py-2 text-[13px] outline-none disabled:cursor-not-allowed"
					/>
					{mine && (
						<button
							type="submit"
							aria-label="Enviar"
							disabled={busy || !draft.trim()}
							className="bg-cta inline-flex size-10 items-center justify-center rounded-full text-white disabled:opacity-50"
						>
							<Send className="size-4" />
						</button>
					)}
				</form>
			</footer>
			{confirming && (
				<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20">
					<div
						role="alertdialog"
						aria-label="Encerrar atendimento"
						className="bg-paper grid w-[360px] gap-4 rounded-[12px] p-5 shadow-xl"
					>
						<p className="text-ink text-[15px] font-semibold">
							Encerrar o atendimento de {c.name}?
						</p>
						<p className="text-ink-2 text-[13px]">
							A conversa sai da sua fila e fica no histórico.
						</p>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								className={ghost}
								onClick={() => setConfirming(false)}
							>
								Voltar
							</button>
							<button
								type="button"
								className={danger}
								disabled={busy}
								onClick={() => void run("close")}
							>
								Encerrar
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
