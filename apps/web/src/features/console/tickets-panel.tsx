import {
	ArrowLeftRight,
	ChevronDown,
	ChevronRight,
	Clock,
	Headset,
	X,
} from "lucide-react";
import { useState } from "react";

import { statusTone } from "@/features/chat/blocks";

import type { TicketDetailJson, TicketJson, TicketsPanelData } from "./api";
import { hhmm, listTime } from "./labels";

const OTHERS = 4;

/** "da Ana", "do Bruno": the prototype's wording, guessed from the first name. */
export function ofName(name: string) {
	const first = name.split(" ")[0] ?? name;
	return `${first.endsWith("a") ? "da" : "do"} ${first}`;
}

function eventText(e: TicketDetailJson["events"][number]): string {
	switch (e.kind) {
		case "assumido":
			return `Assumido por ${e.actor}`;
		case "transferido":
			return `Transferido para ${e.team ?? "outra equipe"}`;
		case "criado":
			return `Aberto por ${e.actor}`;
		default:
			return `${e.kind[0]?.toUpperCase()}${e.kind.slice(1)} por ${e.actor}`;
	}
}

// Literal class names, so Tailwind generates them.
const DOT: Record<string, string> = {
	"text-amber-700": "bg-amber-500",
	"text-sky-700": "bg-sky-500",
	"text-emerald-700": "bg-emerald-500",
};
const dotOf = (status: string) => DOT[statusTone(status)] ?? "bg-slate-400";

function Status({ status }: { status: string }) {
	return (
		<span
			className={`inline-flex items-center gap-1 text-[11px] font-medium ${statusTone(status)}`}
		>
			<span className={`size-1.5 rounded-full ${dotOf(status)}`} />
			{status}
		</span>
	);
}

const EVENT_ICON = { assumido: Headset, transferido: ArrowLeftRight } as const;

function Detail({ t }: { t: TicketDetailJson }) {
	return (
		<div className="border-rule grid gap-2 border-t pt-2 text-[12px]">
			<p className="text-ink-2 whitespace-pre-wrap">{t.description}</p>
			{t.notes.length > 0 && (
				<div className="grid gap-1">
					<p className="text-ink-3 text-[11px] font-semibold uppercase">
						Notas
					</p>
					{t.notes.map((n) => (
						<p key={`${n.at}${n.body}`} className="text-ink-2">
							<span className="text-ink font-medium">{n.author}:</span> {n.body}
						</p>
					))}
				</div>
			)}
			<div className="grid gap-1">
				<p className="text-ink-3 text-[11px] font-semibold uppercase">
					Eventos
				</p>
				{t.events.map((e) => (
					<p key={`${e.at}${e.kind}`} className="text-ink-2">
						{eventText(e)} · {hhmm(e.at)}
					</p>
				))}
			</div>
		</div>
	);
}

/** "Assumido por Rafael Lima" with its icon, the time on the right (capture 05). */
function LastEvent({ e }: { e: TicketDetailJson["events"][number] }) {
	const Icon = EVENT_ICON[e.kind as keyof typeof EVENT_ICON] ?? Clock;
	const text = eventText(e);
	return (
		<p className="border-rule text-ink-2 mt-1 flex items-center gap-2 border-t pt-3 text-[13px]">
			<span className="sr-only">{`${text} · ${hhmm(e.at)}`}</span>
			<Icon aria-hidden className="text-ink-3 size-4" />
			<span aria-hidden className="flex-1">
				{text}
			</span>
			<span aria-hidden className="text-ink-3 text-[12px]">
				{hhmm(e.at)}
			</span>
		</p>
	);
}

function Row({
	t,
	now,
	loadTicket,
}: {
	t: TicketJson;
	now: Date;
	loadTicket: (n: string) => Promise<TicketDetailJson>;
}) {
	const [open, setOpen] = useState(false);
	const [full, setFull] = useState<TicketDetailJson | null>(null);
	const [failed, setFailed] = useState(false);
	const toggle = async () => {
		setOpen(!open);
		if (!open && !full) {
			setFailed(false);
			try {
				setFull(await loadTicket(t.number));
			} catch {
				setFailed(true);
			}
		}
	};
	const Icon = open ? ChevronDown : ChevronRight;
	return (
		<li className="border-rule grid gap-1 border-b py-3 last:border-b-0">
			<button
				type="button"
				aria-label={`Detalhes de ${t.number}`}
				aria-expanded={open}
				onClick={() => void toggle()}
				title={`atualizado ${listTime(t.updatedAt, now)}`}
				className="flex w-full items-center gap-3 text-left"
			>
				<span className={`size-2 shrink-0 rounded-full ${dotOf(t.status)}`} />
				<span className="grid min-w-0 flex-1 gap-0.5">
					<span className="text-ink truncate text-[13px]">{t.title}</span>
					<span className="text-ink-3 text-[12px]">
						{t.number} · {t.status}
					</span>
				</span>
				<Icon className="text-ink-3 size-4 shrink-0" />
			</button>
			{open && full && <Detail t={full} />}
			{open && failed && (
				<p className="text-[12px] text-red-700">
					Não foi possível carregar o chamado.
				</p>
			)}
		</li>
	);
}

export function TicketsPanel({
	name,
	data,
	failed,
	now,
	onRetry,
	onClose,
	loadTicket,
}: {
	name: string;
	data: TicketsPanelData | null;
	failed: boolean;
	now: Date;
	onRetry: () => void;
	onClose: () => void;
	loadTicket: (n: string) => Promise<TicketDetailJson>;
}) {
	const [all, setAll] = useState(false);
	const [currentOpen, setCurrentOpen] = useState(false);
	const title = `Chamados ${ofName(name)}`;
	const c = data?.current ?? null;
	const others = data ? data.tickets.filter((t) => t.number !== c?.number) : [];
	const shown = all ? others : others.slice(0, OTHERS);
	const last = c?.events.at(-1);
	return (
		<aside
			aria-label={title}
			className="border-rule bg-paper flex h-full w-[320px] shrink-0 flex-col border-l"
		>
			<header className="flex items-start justify-between px-4 pt-4 pb-3">
				<div>
					<h2 className="text-ink text-[15px] font-semibold">{title}</h2>
					{data && (
						<p className="text-ink-3 text-[12px]">
							{data.open} {data.open === 1 ? "aberto" : "abertos"} ·{" "}
							{data.closed} {data.closed === 1 ? "encerrado" : "encerrados"}
						</p>
					)}
				</div>
				<button
					type="button"
					aria-label="Fechar chamados"
					onClick={onClose}
					className="text-ink-3 hover:bg-desk rounded-[6px] p-1"
				>
					<X className="size-4" />
				</button>
			</header>
			<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
				{failed ? (
					<div className="grid justify-items-start gap-2 rounded-[10px] border border-red-200 bg-red-50 p-3">
						<p className="text-[13px] text-red-700">
							Não foi possível carregar os chamados
						</p>
						<button
							type="button"
							onClick={onRetry}
							className="border-rule bg-paper text-ink rounded-[8px] border px-3 py-1 text-[12px] font-medium"
						>
							Tentar de novo
						</button>
					</div>
				) : !data ? (
					<div className="grid gap-3">
						{[0, 1, 2].map((i) => (
							<div
								key={i}
								data-testid="skeleton"
								className="bg-desk h-[72px] animate-pulse rounded-[10px]"
							/>
						))}
					</div>
				) : (
					<div className="grid gap-4">
						<section aria-label="Desta conversa" className="grid gap-2">
							<h3 className="text-ink-2 text-[12px] font-medium">
								Desta conversa
							</h3>
							{c ? (
								<div className="bg-desk grid gap-1.5 rounded-[12px] p-4">
									<button
										type="button"
										aria-label={`Detalhes de ${c.number}`}
										aria-expanded={currentOpen}
										onClick={() => setCurrentOpen(!currentOpen)}
										className="grid gap-1 text-left"
									>
										<span className="flex items-center justify-between gap-2">
											<span className="text-ink-3 text-[12px]">{c.number}</span>
											<Status status={c.status} />
										</span>
										<span className="text-ink text-[15px] font-semibold">
											{c.title}
										</span>
										<span className="text-ink-3 text-[12px]">
											{c.category} · prioridade {c.priority.toLowerCase()}
										</span>
									</button>
									{last && <LastEvent e={last} />}
									{currentOpen && <Detail t={c} />}
								</div>
							) : (
								<p className="text-ink-3 text-[12px]">
									Nenhum chamado ligado a esta conversa.
								</p>
							)}
						</section>
						<section aria-label="Outros chamados" className="grid gap-1">
							<h3 className="text-ink-2 text-[12px] font-medium">
								Outros chamados
							</h3>
							{others.length === 0 ? (
								<p className="text-ink-3 text-[12px]">Nenhum outro chamado.</p>
							) : (
								<ul>
									{shown.map((t) => (
										<Row
											key={t.number}
											t={t}
											now={now}
											loadTicket={loadTicket}
										/>
									))}
								</ul>
							)}
						</section>
					</div>
				)}
			</div>
			{data && !failed && others.length > 0 && (
				<div className="px-4 py-3">
					<button
						type="button"
						onClick={() => setAll(!all)}
						className="border-rule text-ink hover:bg-desk w-full rounded-[10px] border px-3 py-2.5 text-[13px] font-medium"
					>
						{all ? "Mostrar menos" : `Ver todos os chamados ${ofName(name)} ↗`}
					</button>
				</div>
			)}
		</aside>
	);
}
