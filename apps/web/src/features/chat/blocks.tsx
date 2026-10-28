import type { Block, TicketDraft, TicketView } from "@nexo-assist/agent/types";
import { AFFECTED, CATEGORIES, TICKET_TYPES } from "@nexo-assist/tickets/types";
import { type ReactNode, useEffect, useRef, useState } from "react";

type Of<K extends Block["kind"]> = Extract<Block, { kind: K }>;

const TZ = "America/Sao_Paulo";
const day = (iso: string) =>
	new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "short",
		timeZone: TZ,
	})
		.format(new Date(iso))
		.replace(".", "")
		.replace(" de ", " ");
const time = (iso: string) =>
	new Intl.DateTimeFormat("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: TZ,
	}).format(new Date(iso));
const ago = (iso: string, now: Date) => {
	const min = Math.max(
		0,
		Math.round((now.getTime() - Date.parse(iso)) / 60000),
	);
	if (min < 60) return `há ${min} min`;
	if (min < 1440) return `há ${Math.round(min / 60)} h`;
	const d = Math.round(min / 1440);
	return d === 1 ? "há 1 dia" : `há ${d} dias`;
};

const TYPE_LABEL = { INC: "Incidente", REQ: "Requisição" } as const;
const AFFECTED_LABEL: Record<TicketDraft["affected"], string> = {
	"Só eu": "Somente você",
	"Minha equipe": "Sua equipe",
	"Toda a empresa": "Toda a empresa",
	"Não sei": "Não sabe",
};

/** Status color as in capture 03: waiting amber, working sky, approved and done emerald. */
export function statusTone(status: string): string {
	if (status.startsWith("Aguardando")) return "text-amber-700";
	if (status === "Em andamento" || status === "Em atendimento")
		return "text-sky-700";
	if (status === "Cancelado") return "text-ink-3";
	return "text-emerald-700";
}
const dotTone = (status: string) =>
	statusTone(status).replace("text-", "bg-").replace("-700", "-500");

function Status({
	status,
	label = status,
}: {
	status: string;
	label?: string;
}) {
	return (
		<span className="flex items-center gap-1.5 text-[11px]">
			<span className={`size-1.5 rounded-full ${dotTone(status)}`} />
			<span className={statusTone(status)}>{label}</span>
		</span>
	);
}

/** Number keys answer the question when the field is empty (CHAT-11). */
function typingSomewhere(target: EventTarget | null) {
	return (
		(target instanceof HTMLTextAreaElement ||
			target instanceof HTMLInputElement) &&
		target.value.trim() !== ""
	);
}

export function Bubble({ children }: { children: ReactNode }) {
	return (
		<div className="border-rule bg-paper text-ink w-fit max-w-[600px] rounded-[10px] border px-3.5 py-2.5 text-[13px] leading-relaxed">
			{children}
		</div>
	);
}

export function Options({
	block,
	active,
	chosen,
	onPick,
}: {
	block: Of<"options">;
	active: boolean;
	chosen?: string;
	onPick: (option: string) => void;
}) {
	const [picked, setPicked] = useState<string | undefined>(chosen);
	const live = active && picked === undefined;
	const pick = useRef<(o: string) => void>(() => {});
	pick.current = (o: string) => {
		if (!live) return;
		setPicked(o);
		onPick(o);
	};
	useEffect(() => {
		if (!live) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey || typingSomewhere(e.target))
				return;
			const n = Number(e.key);
			const o = Number.isInteger(n) ? block.options[n - 1] : undefined;
			if (o === undefined) return;
			e.preventDefault();
			pick.current(o);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [live, block.options]);
	const shown = picked ?? chosen;
	return (
		<div>
			<p className="text-ink mt-2 text-[13px] font-semibold">
				{block.question}
			</p>
			<div className="mt-2 flex flex-wrap gap-1.5">
				{block.options.map((o, i) => (
					<button
						key={o}
						type="button"
						aria-label={o}
						aria-pressed={shown === o}
						disabled={!live}
						onClick={() => pick.current(o)}
						className={`flex items-center gap-1.5 rounded-[6px] border px-2.5 py-1.5 text-[12px] ${
							shown === o
								? "border-cta bg-cta-soft text-cta"
								: "border-rule text-ink hover:bg-desk disabled:text-ink-3 disabled:hover:bg-transparent"
						}`}
					>
						<span className="text-ink-3 font-data text-[10px]">{i + 1}</span>
						{o}
					</button>
				))}
			</div>
		</div>
	);
}

export function TicketList({
	block,
	active,
	chosen,
	onSelect,
}: {
	block: Of<"ticket_list">;
	active: boolean;
	chosen?: string;
	onSelect: (ticket: TicketView) => void;
}) {
	const [picked, setPicked] = useState<string | undefined>(chosen);
	const live = active && picked === undefined;
	const shown = picked ?? chosen;
	return (
		<fieldset className="border-rule bg-paper divide-rule w-full divide-y overflow-hidden rounded-[10px] border">
			<legend className="sr-only">{block.question}</legend>
			{block.tickets.map((t) => (
				<label
					key={t.number}
					className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] ${
						shown === t.number
							? "bg-desk"
							: live
								? "hover:bg-desk cursor-pointer"
								: ""
					}`}
				>
					<input
						type="radio"
						name={`tickets-${block.tickets.map((x) => x.number).join("-")}`}
						aria-label={`${t.number} · ${t.title}`}
						checked={shown === t.number}
						disabled={!live}
						onChange={() => {
							if (!live) return;
							setPicked(t.number);
							onSelect(t);
						}}
						className="accent-cta size-3.5 shrink-0"
					/>
					<span className="text-ink-3 font-data text-[11px]">{t.number}</span>
					<span className="text-ink flex-1 truncate font-medium">
						{t.title}
					</span>
					<Status status={t.status} />
					<span className="text-ink-3 w-12 text-right text-[11px]">
						{day(t.openedAt)}
					</span>
				</label>
			))}
		</fieldset>
	);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div>
			<div className="text-ink-3 text-[11px]">{label}</div>
			<div className="text-ink mt-0.5 text-[13px]">{children}</div>
		</div>
	);
}

function CardHead({
	kind,
	id,
	status,
}: {
	kind: string;
	id: string;
	status: ReactNode;
}) {
	return (
		<div className="text-ink-3 flex items-center gap-2 text-[11px]">
			<span>{kind}</span>
			<span>·</span>
			<span>{id}</span>
			<span className="ml-auto">{status}</span>
		</div>
	);
}

export function TicketCard({
	ticket,
	now = new Date(),
}: {
	ticket: TicketView & { description?: string };
	now?: Date;
}) {
	const late = ticket.vencido ? "text-amber-700" : "text-ink";
	return (
		<article className="border-rule bg-paper w-full rounded-[10px] border px-4 py-3.5 shadow-xs">
			<CardHead
				kind="Chamado"
				id={ticket.number}
				status={<Status status={ticket.status} />}
			/>
			<h3 className="text-ink mt-2 text-[16px] font-semibold">
				{ticket.title}
			</h3>
			{ticket.description && (
				<p className="text-ink-2 mt-1 text-[12px]">{ticket.description}</p>
			)}
			<div className="border-rule mt-3 grid grid-cols-4 gap-3 border-t pt-3">
				<Field label="Categoria">{ticket.category}</Field>
				<Field label="Prioridade">{ticket.priority}</Field>
				<Field label="Aberto em">
					{day(ticket.openedAt)}, {time(ticket.openedAt)}
				</Field>
				<Field label="Última atualização">
					<span className={late}>{ago(ticket.updatedAt, now)}</span>
					{ticket.vencido && (
						<span className="ml-1 text-[11px] text-amber-700">
							· prazo vencido
						</span>
					)}
				</Field>
			</div>
		</article>
	);
}

type DraftEdits = Partial<
	Pick<TicketDraft, "title" | "description" | "type" | "category" | "affected">
>;

const input =
	"border-rule focus:border-cta w-full rounded-[6px] border px-2 py-1 text-[13px] outline-none";

function DraftForm({
	draft,
	onSave,
	onDiscard,
}: {
	draft: TicketDraft;
	onSave: (edits: DraftEdits) => void;
	onDiscard: () => void;
}) {
	const [v, setV] = useState({
		title: draft.title,
		description: draft.description,
		type: draft.type,
		category: draft.category,
		affected: draft.affected,
	});
	const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) =>
		setV((old) => ({ ...old, [k]: value }));
	const changes = Object.fromEntries(
		Object.entries(v).filter(([k, x]) => draft[k as keyof typeof v] !== x),
	) as DraftEdits;
	return (
		<form
			className="mt-2 grid gap-2.5"
			onSubmit={(e) => {
				e.preventDefault();
				onSave(changes);
			}}
		>
			<label className="text-ink-3 grid gap-1 text-[11px]">
				Título
				<input
					className={input}
					value={v.title}
					maxLength={200}
					onChange={(e) => set("title", e.target.value)}
				/>
			</label>
			<label className="text-ink-3 grid gap-1 text-[11px]">
				Descrição
				<textarea
					className={input}
					rows={3}
					value={v.description}
					maxLength={2000}
					onChange={(e) => set("description", e.target.value)}
				/>
			</label>
			<div className="grid grid-cols-3 gap-3">
				<label className="text-ink-3 grid gap-1 text-[11px]">
					Categoria
					<select
						className={input}
						value={v.category}
						onChange={(e) =>
							set("category", e.target.value as typeof v.category)
						}
					>
						{CATEGORIES.map((c) => (
							<option key={c}>{c}</option>
						))}
					</select>
				</label>
				<label className="text-ink-3 grid gap-1 text-[11px]">
					Tipo
					<select
						className={input}
						value={v.type}
						onChange={(e) => set("type", e.target.value as typeof v.type)}
					>
						{TICKET_TYPES.map((t) => (
							<option key={t} value={t}>
								{TYPE_LABEL[t]}
							</option>
						))}
					</select>
				</label>
				<label className="text-ink-3 grid gap-1 text-[11px]">
					Afetados
					<select
						className={input}
						value={v.affected}
						onChange={(e) =>
							set("affected", e.target.value as typeof v.affected)
						}
					>
						{[...AFFECTED, "Não sei" as const].map((a) => (
							<option key={a}>{a}</option>
						))}
					</select>
				</label>
			</div>
			<div className="flex gap-1.5">
				<button
					type="submit"
					disabled={!v.title.trim() || !v.description.trim()}
					className="bg-cta rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
				>
					Salvar
				</button>
				<button
					type="button"
					onClick={onDiscard}
					className="border-rule text-ink rounded-[6px] border px-3 py-1.5 text-[12px]"
				>
					Descartar alterações
				</button>
			</div>
		</form>
	);
}

/** "Novo chamado · Rascunho <id>" (CHAT-17 to CHAT-20); one confirmation per card. */
export function DraftCard({
	block,
	id,
	active,
	onConfirm,
	onEdit,
	onCancel,
}: {
	block: Of<"ticket_draft">;
	id: string;
	active: boolean;
	onConfirm: () => void;
	onEdit: (edits: DraftEdits) => void;
	onCancel: () => void;
}) {
	const [sent, setSent] = useState(false);
	const [editing, setEditing] = useState(false);
	const waiting = block.status === "Aguardando confirmação";
	const live = active && waiting && !sent;
	const once = useRef<(fn: () => void) => void>(() => {});
	once.current = (fn) => {
		if (!live) return;
		setSent(true);
		fn();
	};
	useEffect(() => {
		if (!live || editing) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				once.current(onConfirm);
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [live, editing, onConfirm]);
	const d = block.draft;
	const created = block.status === "Criado";
	return (
		<article className="border-rule bg-paper w-full overflow-hidden rounded-[10px] border shadow-xs">
			<div className="px-4 py-3.5">
				<CardHead
					kind={created ? "Chamado criado" : "Novo chamado"}
					id={created ? (block.number ?? "") : `Rascunho ${id}`}
					status={
						created ? (
							<Status
								status="Criado"
								label={`Chamado criado · ${block.number ?? ""}`}
							/>
						) : (
							<Status status={block.status} />
						)
					}
				/>
				{editing ? (
					<DraftForm
						draft={d}
						onDiscard={() => setEditing(false)}
						onSave={(edits) => {
							setEditing(false);
							once.current(() => onEdit(edits));
						}}
					/>
				) : (
					<>
						<h3 className="text-ink mt-2 text-[16px] font-semibold">
							{d.title}
						</h3>
						<p className="text-ink-2 mt-1 text-[12px]">{d.description}</p>
						<div className="border-rule mt-3 grid grid-cols-4 gap-3 border-t pt-3">
							<Field label="Categoria">{d.category}</Field>
							<Field label="Tipo">{TYPE_LABEL[d.type]}</Field>
							<Field label="Prioridade">
								<span className="flex items-center gap-1">
									<span className="size-1.5 rounded-full bg-amber-500" />
									<span className="font-medium">{d.priority}</span>
									<span className="text-ink-3 text-[11px]">
										· resposta até {time(d.deadlineAt)}
									</span>
								</span>
							</Field>
							<Field label="Afetados">{AFFECTED_LABEL[d.affected]}</Field>
						</div>
					</>
				)}
			</div>
			{waiting && active && !editing && (
				<div className="bg-desk flex gap-1.5 px-2 py-1.5">
					<button
						type="button"
						disabled={!live}
						onClick={() => once.current(onConfirm)}
						className="bg-cta flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
					>
						Confirmar
						<kbd className="font-data rounded bg-white/20 px-1 text-[10px]">
							⌘↵
						</kbd>
					</button>
					<button
						type="button"
						disabled={!live}
						onClick={() => setEditing(true)}
						className="border-rule bg-paper text-ink rounded-[6px] border px-3 py-1.5 text-[12px] disabled:opacity-50"
					>
						Editar
					</button>
					<button
						type="button"
						disabled={!live}
						onClick={() => once.current(onCancel)}
						className="text-ink-2 rounded-[6px] px-3 py-1.5 text-[12px] disabled:opacity-50"
					>
						Cancelar
					</button>
				</div>
			)}
		</article>
	);
}
