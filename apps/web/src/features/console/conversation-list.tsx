import type { ConsoleFilter } from "@nexo-assist/agent/console";
import { LogOut, MessageSquare, Search } from "lucide-react";
import { useState } from "react";

import { NexoMark } from "@/features/brand/nexo-logo";

import type { ConsoleList, ConsoleListItem } from "./api";
import {
	initials,
	listTime,
	matches,
	previewText,
	statusLabel,
	type Tone,
} from "./labels";

const FILTERS: { id: ConsoleFilter; label: string }[] = [
	{ id: "todas", label: "Todas" },
	{ id: "para_voce", label: "Para você" },
	{ id: "com_agent", label: "Com o agent" },
	{ id: "minhas", label: "Minhas" },
];

const TONE: Record<Tone, { text: string; dot: string }> = {
	red: { text: "text-red-600", dot: "bg-red-500" },
	amber: { text: "text-amber-700", dot: "bg-amber-500" },
	green: { text: "text-ink-3", dot: "bg-emerald-500" },
	blue: { text: "text-cta", dot: "bg-cta" },
	gray: { text: "text-ink-3", dot: "bg-slate-400" },
};

const AVATAR = [
	"bg-sky-100 text-sky-800",
	"bg-orange-100 text-orange-800",
	"bg-violet-100 text-violet-800",
	"bg-emerald-100 text-emerald-800",
	"bg-rose-100 text-rose-800",
	"bg-slate-200 text-slate-700",
	"bg-amber-100 text-amber-800",
];
function avatarTone(name: string) {
	let h = 0;
	for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	return AVATAR[h % AVATAR.length];
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
	return (
		<span
			className={`inline-flex shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${avatarTone(name)}`}
			style={{ width: size, height: size }}
		>
			{initials(name)}
		</span>
	);
}

/** Inbox in the list filtered by `filter` and `query` (CON-03 to CON-09). */
function visibleItems(list: ConsoleList, filter: ConsoleFilter, query: string) {
	return list.items.filter((i) => {
		const inFilter =
			filter === "todas"
				? true
				: filter === "para_voce"
					? i.state === "aguardando_analista"
					: filter === "com_agent"
						? i.status.kind === "agent"
						: i.status.kind === "voce";
		return inFilter && matches(i, query);
	});
}

function Row({
	item,
	now,
	selected,
	onSelect,
}: {
	item: ConsoleListItem;
	now: Date;
	selected: boolean;
	onSelect: () => void;
}) {
	const label = statusLabel(item, now);
	const tone = TONE[label.tone];
	return (
		<li>
			<button
				type="button"
				aria-current={selected ? "true" : undefined}
				onClick={onSelect}
				className={`border-rule flex w-full gap-3 border-b px-3 py-3 text-left ${selected ? "bg-desk rounded-[10px] border-transparent" : "hover:bg-desk/60"}`}
			>
				<Avatar name={item.name} />
				<span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] gap-0.5">
					<span className="flex items-baseline justify-between gap-2">
						<span className="text-ink min-w-0 truncate text-[14px] font-semibold">
							{item.name}
						</span>
						<span
							className={`shrink-0 text-[11px] ${item.unread > 0 ? "text-cta font-semibold" : "text-ink-3"}`}
						>
							{listTime(item.lastAt, now)}
						</span>
					</span>
					<span className="flex items-center justify-between gap-2">
						<span className="text-ink-2 min-w-0 truncate text-[12px]">
							{previewText(item)}
						</span>
						{item.unread > 0 && (
							<span
								role="img"
								aria-label={`${item.unread} não lidas`}
								className="bg-cta inline-flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
							>
								{item.unread}
							</span>
						)}
					</span>
					<span
						className={`flex items-center gap-1.5 text-[11px] ${tone.text}`}
					>
						<span className={`size-1.5 rounded-full ${tone.dot}`} />
						{label.text}
					</span>
				</span>
			</button>
		</li>
	);
}

export function ConversationList({
	list,
	loading,
	now,
	selectedId,
	onSelect,
	available,
	onAvailable,
}: {
	list: ConsoleList | null;
	loading: boolean;
	now: Date;
	selectedId: string | null;
	onSelect: (id: string) => void;
	available: boolean;
	onAvailable: (value: boolean) => void;
}) {
	const [filter, setFilter] = useState<ConsoleFilter>("todas");
	const [query, setQuery] = useState("");
	const shown = list ? visibleItems(list, filter, query) : [];
	return (
		<section
			aria-label="Lista de conversas"
			className="border-rule bg-paper flex h-full w-[380px] shrink-0 flex-col border-r"
		>
			<header className="flex items-center justify-between px-4 pt-4 pb-3">
				<h1 className="text-ink text-[20px] font-semibold">Conversas</h1>
				<button
					type="button"
					role="switch"
					aria-checked={available}
					aria-label="Disponível"
					onClick={() => onAvailable(!available)}
					className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${available ? "bg-emerald-50 text-emerald-700" : "bg-desk text-ink-3"}`}
				>
					<span
						className={`size-1.5 rounded-full ${available ? "bg-emerald-500" : "bg-slate-400"}`}
					/>
					{available ? "Disponível" : "Indisponível"}
				</button>
			</header>
			<div className="px-4">
				<label className="bg-desk flex items-center gap-2 rounded-[10px] px-3 py-2">
					<Search className="text-ink-3 size-4" />
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Pesquisar conversa ou chamado"
						className="text-ink placeholder:text-ink-3 w-full bg-transparent text-[13px] outline-none"
					/>
				</label>
			</div>
			<div role="tablist" className="flex gap-1.5 px-4 py-3">
				{FILTERS.map((f) => {
					const active = f.id === filter;
					return (
						<button
							key={f.id}
							type="button"
							role="tab"
							aria-selected={active}
							onClick={() => setFilter(f.id)}
							className={`rounded-full px-2.5 py-1 text-[12px] whitespace-nowrap ${active ? "bg-cta-soft text-cta font-medium" : "bg-desk text-ink-2"}`}
						>
							{f.label}
							{f.id !== "todas" && (
								<span className="ml-1">{list?.counts[f.id] ?? 0}</span>
							)}
						</button>
					);
				})}
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-2">
				{loading && !list ? (
					<div className="grid gap-3 px-2">
						{[0, 1, 2, 3, 4].map((i) => (
							<div
								key={i}
								data-testid="skeleton"
								className="bg-desk h-[64px] animate-pulse rounded-[10px]"
							/>
						))}
						<span className="sr-only">Carregando conversas</span>
					</div>
				) : shown.length === 0 ? (
					<p className="text-ink-3 px-3 py-8 text-center text-[13px]">
						Nenhuma conversa aqui.
					</p>
				) : (
					<ul aria-label="Conversas">
						{shown.map((i) => (
							<Row
								key={i.id}
								item={i}
								now={now}
								selected={i.id === selectedId}
								onSelect={() => onSelect(i.id)}
							/>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}

/** The left rail: logo, Conversas with the "Para você" badge, and the analyst (CON-11, CON-12). */
/** The analyst's initials; clicking them opens "Sair" (the capture draws only the initials). */
function RailAccount({
	initials,
	available,
	onSignOut,
}: {
	initials: string;
	available: boolean;
	onSignOut?: () => void;
}) {
	const [open, setOpen] = useState(false);
	return (
		<span className="relative mt-auto">
			<button
				type="button"
				aria-label="Minha conta"
				aria-expanded={open}
				disabled={!onSignOut}
				onClick={() => setOpen(!open)}
				className="bg-cta-soft text-cta inline-flex size-8 items-center justify-center rounded-full text-[11px] font-semibold"
			>
				{initials}
			</button>
			{available && (
				<span className="pointer-events-none absolute right-0 bottom-0 size-2 rounded-full border-2 border-white bg-emerald-500" />
			)}
			{open && onSignOut && (
				<div
					role="menu"
					className="border-rule bg-paper absolute bottom-0 left-10 z-10 grid w-[140px] rounded-[10px] border p-1 shadow-lg"
				>
					<button
						type="button"
						role="menuitem"
						onClick={onSignOut}
						className="text-ink hover:bg-desk inline-flex items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[13px]"
					>
						<LogOut aria-hidden className="size-4" />
						Sair
					</button>
				</div>
			)}
		</span>
	);
}

export function Rail({
	badge,
	available,
	initials: who,
	onSignOut,
}: {
	badge: number;
	available: boolean;
	initials: string;
	onSignOut?: () => void;
}) {
	return (
		<nav
			aria-label="Navegação do console"
			className="border-rule bg-desk flex h-full w-[56px] shrink-0 flex-col items-center gap-4 border-r py-4"
		>
			<NexoMark className="text-cta size-6" />
			<span className="bg-paper relative mt-2 rounded-[10px] p-2 shadow-sm">
				<MessageSquare aria-label="Conversas" className="text-ink size-5" />
				{available && badge > 0 && (
					<span
						role="img"
						aria-label={`${badge} conversas para você`}
						className="bg-cta absolute -top-1 -right-1 inline-flex size-[16px] items-center justify-center rounded-full text-[9px] font-semibold text-white"
					>
						{badge}
					</span>
				)}
			</span>
			<RailAccount initials={who} available={available} onSignOut={onSignOut} />
		</nav>
	);
}
