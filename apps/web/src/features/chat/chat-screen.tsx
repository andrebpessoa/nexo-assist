import type { AgentInput } from "@nexo-assist/agent/engine";
import type {
	Block,
	DecisionRecord,
	TicketDraft,
} from "@nexo-assist/agent/types";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import { ActionLine, type StepProgress } from "../decision/action-line";
import { DecisionPanel } from "../decision/decision-panel";
import type { ChatApi, ChatHistory, ChatMessage, SendResult } from "./api";
import {
	Bubble,
	DraftCard,
	Options,
	statusTone,
	TicketCard,
	TicketList,
} from "./blocks";
import { Composer } from "./composer";
import { type FoldedItem, foldHistory } from "./fold";

const TZ = "America/Sao_Paulo";
const hhmm = (iso: string) =>
	new Intl.DateTimeFormat("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: TZ,
	}).format(new Date(iso));

/** What the employee just sent, shown at once (CHAT-02) until the history has it. */
type Outgoing = { input: AgentInput; said: string | null; failed: boolean };
/** The reply being streamed (CHAT-02, CHAT-03, CHAT-31). */
type Live = { steps: StepProgress[]; text: string; interrupted: boolean };

const sameHistory = (a: ChatHistory | null, b: ChatHistory) =>
	a !== null &&
	a.conversation.id === b.conversation.id &&
	a.conversation.state === b.conversation.state &&
	a.conversation.pending === b.conversation.pending &&
	a.count === b.count &&
	a.messages.length === b.messages.length &&
	a.messages.at(-1)?.seq === b.messages.at(-1)?.seq;

function said(input: AgentInput): string | null {
	if ("text" in input) return input.text;
	if (input.action === "option") return input.value;
	return null;
}

function HealthBadge({ online }: { online: boolean | null }) {
	if (online === null) return null;
	return online ? (
		<span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
			<span className="size-1.5 rounded-full bg-emerald-500" />
			Assistente online
		</span>
	) : (
		<span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-800">
			<span className="size-1.5 rounded-full bg-red-500" />
			Assistente indisponível
		</span>
	);
}

function Skeletons() {
	return (
		<div className="grid gap-4" aria-busy="true">
			<span className="sr-only">Carregando conversa</span>
			{["ml-auto w-2/5", "w-3/5", "ml-auto w-1/3", "w-1/2"].map((w) => (
				<div
					key={w}
					data-testid="skeleton"
					className={`bg-desk h-12 animate-pulse rounded-[10px] ${w}`}
				/>
			))}
		</div>
	);
}

function EmployeeBubble({
	text,
	children,
}: {
	text: string;
	children?: ReactNode;
}) {
	return (
		<div
			data-role="employee"
			className="flex flex-col items-end justify-end gap-1"
		>
			<div className="bg-ink max-w-[520px] rounded-[10px] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-white">
				{text}
			</div>
			{children}
		</div>
	);
}

function RetryLine({ label, onRetry }: { label: string; onRetry: () => void }) {
	return (
		<span className="flex items-center gap-1 text-[11px] text-red-700">
			<span>{label}</span>
			<span>·</span>
			<button type="button" onClick={onRetry} className="font-medium underline">
				Tentar de novo
			</button>
		</span>
	);
}

/** The employee conversation at /atendimento (CHAT-01 to CHAT-33). */
export function ChatScreen({
	api,
	pollMs = 2000,
	healthMs = 15_000,
	frame = (aside, body) => (
		<>
			{aside}
			{body}
		</>
	),
}: {
	api: ChatApi;
	pollMs?: number;
	healthMs?: number;
	frame?: (aside: ReactNode, body: ReactNode) => ReactNode;
}) {
	const [hist, setHist] = useState<ChatHistory | null>(null);
	const [online, setOnline] = useState<boolean | null>(null);
	const [out, setOut] = useState<Outgoing | null>(null);
	const [live, setLive] = useState<Live | null>(null);
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [panel, setPanel] = useState<DecisionRecord | null>(null);
	const [unseen, setUnseen] = useState(false);
	const log = useRef<HTMLDivElement>(null);
	const atBottom = useRef(true);
	const busyRef = useRef(false);

	const load = useCallback(async () => {
		const next = await api.history();
		setHist((old) => (sameHistory(old, next) ? old : next));
		return next;
	}, [api]);

	useEffect(() => {
		void load().catch(() => {});
	}, [load]);

	useEffect(() => {
		const id = setInterval(() => {
			if (!busyRef.current) void load().catch(() => {});
		}, pollMs);
		return () => clearInterval(id);
	}, [load, pollMs]);

	useEffect(() => {
		const check = () =>
			void api
				.health()
				.then(setOnline)
				.catch(() => setOnline(false));
		check();
		const id = setInterval(check, healthMs);
		return () => clearInterval(id);
	}, [api, healthMs]);

	const toBottom = useCallback(() => {
		const el = log.current;
		if (el) el.scrollTop = el.scrollHeight;
		atBottom.current = true;
		setUnseen(false);
	}, []);

	// New content: follow it when at the end, otherwise offer the button (CHAT-07).
	const size =
		(hist?.messages.length ?? 0) + (out ? 1 : 0) + (live?.text.length ?? 0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when the content grows.
	useEffect(() => {
		if (atBottom.current) toBottom();
		else setUnseen(true);
	}, [size, toBottom]);

	const run = async (
		input: AgentInput,
		attempt: AgentInput = input,
		shown: string | null = said(input),
	) => {
		if (busyRef.current) return;
		busyRef.current = true;
		setBusy(true);
		setNotice(null);
		setOut({ input, said: shown, failed: false });
		setLive({ steps: [], text: "", interrupted: false });
		toBottom();
		let result: SendResult;
		try {
			result = await api.send(attempt, {
				onStep: (e) =>
					setLive((l) => {
						if (!l) return l;
						const steps = [...l.steps];
						const i = steps.findIndex((s) => s.name === e.name && !s.done);
						if (e.phase === "start")
							steps.push({ name: e.name, target: e.target, done: false });
						else if (i >= 0)
							steps[i] = { ...steps[i], name: e.name, done: true, ok: e.ok };
						return { ...l, steps };
					}),
				onDelta: (text) =>
					setLive((l) => (l ? { ...l, text: l.text + text } : l)),
			});
		} catch {
			result = { kind: "failed" };
		}
		if (result.kind === "done" || result.kind === "refused") {
			const next = await api.history().catch(() => null);
			if (next) setHist(next);
			setOut(null);
			setLive(null);
			if (result.kind === "refused" && result.error !== "limit")
				setNotice(result.message || "Não foi possível enviar.");
		} else if (result.kind === "failed") {
			setOut((o) => (o ? { ...o, failed: true } : o));
			setLive(null);
		} else
			setLive((l) => ({
				steps: l?.steps ?? [],
				text: result.partial,
				interrupted: true,
			}));
		busyRef.current = false;
		setBusy(false);
	};

	/** Try again without saving the employee message twice (CHAT-30, CHAT-31). */
	const retry = async (input: AgentInput) => {
		const next = await api.history().catch(() => null);
		if (next) setHist(next);
		const last = next?.messages.at(-1);
		const stored =
			last?.role === "employee" &&
			last.blocks.length > 0 &&
			last.blocks.some((b) => b.kind === "text" && b.text === said(input));
		await run(
			input,
			stored ? { action: "retry" } : input,
			out?.said ?? said(input),
		);
	};

	const newConversation = async () => {
		const next = await api.newConversation();
		setHist(next);
		setOut(null);
		setLive(null);
	};

	const folded = hist
		? foldHistory(hist.messages, hist.conversation.pending)
		: [];
	const lastPending = hist?.conversation.pending ?? null;
	const lists = hist?.messages.flatMap((m) =>
		m.blocks.flatMap((b) => (b.kind === "ticket_list" ? b.tickets : [])),
	);
	const shownText = (text: string) => {
		const t = lists?.find((x) => x.number === text);
		return t ? `${t.number} · ${t.title}` : text;
	};

	const renderItems = (
		message: ChatMessage,
		items: FoldedItem[],
		isLast: boolean,
	) => {
		const groups: ReactNode[] = [];
		let bubble: ReactNode[] = [];
		const flush = () => {
			if (bubble.length)
				groups.push(<Bubble key={`b${groups.length}`}>{bubble}</Bubble>);
			bubble = [];
		};
		items.forEach(({ block, active, chosen }, i) => {
			const key = `${message.seq}-${i}`;
			const live = active && !busy;
			if (block.kind === "author") return;
			if (block.kind === "text") {
				bubble.push(
					<p key={key} className="whitespace-pre-wrap">
						{block.text}
					</p>,
				);
				return;
			}
			if (block.kind === "options") {
				bubble.push(
					<Options
						key={key}
						block={block}
						active={live}
						chosen={chosen}
						onPick={(value) => void run({ action: "option", value })}
					/>,
				);
				flush();
				return;
			}
			flush();
			groups.push(
				<div key={key}>
					{renderBlock(block, message, live, chosen, isLast)}
				</div>,
			);
		});
		flush();
		return groups;
	};

	const renderBlock = (
		block: Block,
		message: ChatMessage,
		active: boolean,
		chosen: string | undefined,
		isLast: boolean,
	): ReactNode => {
		switch (block.kind) {
			case "ticket_list":
				return (
					<TicketList
						block={block}
						active={active}
						chosen={chosen}
						onSelect={(t) =>
							void run(
								{ action: "select", number: t.number },
								undefined,
								`${t.number} · ${t.title}`,
							)
						}
					/>
				);
			case "ticket_card":
				return <TicketCard ticket={block.ticket} />;
			case "ticket_draft":
				return (
					<DraftCard
						block={block}
						id={`D-${message.seq}`}
						active={active}
						onConfirm={() => void run({ action: "confirm" })}
						onCancel={() => void run({ action: "cancel" })}
						onEdit={(edits: Partial<TicketDraft>) =>
							void run({ action: "edit", edits })
						}
					/>
				);
			case "article":
				return (
					<Bubble>
						<p className="font-semibold">{block.title}</p>
						<p className="text-ink-2 mt-1 text-[12px] whitespace-pre-wrap">
							{block.steps}
						</p>
					</Bubble>
				);
			case "transfer":
				return (
					<div className="border-rule bg-desk rounded-[10px] border px-4 py-3 text-[12px]">
						<p className="text-ink font-medium">
							Transferido para {block.team} · contato até{" "}
							{hhmm(block.contactBy)}
						</p>
						<p className="text-ink-2 mt-1">{block.summary}</p>
					</div>
				);
			case "update_draft":
			case "reopen_draft": {
				const waiting =
					block.kind === "reopen_draft" ||
					block.status === "Aguardando confirmação";
				const can = active && isLast && lastPending === block.kind && waiting;
				const status =
					block.kind === "update_draft"
						? block.status
						: "Aguardando confirmação";
				return (
					<article className="border-rule bg-paper rounded-[10px] border px-4 py-3 text-[13px]">
						<div className="text-ink-3 flex text-[11px]">
							<span>
								{block.kind === "update_draft"
									? "Adicionar informação"
									: "Reabrir"}{" "}
								· {block.number}
							</span>
							<span className={`ml-auto ${statusTone(status)}`}>{status}</span>
						</div>
						<p className="text-ink mt-1.5">
							{block.kind === "update_draft" ? block.note : block.reason}
						</p>
						{can && (
							<div className="mt-2 flex gap-1.5">
								<button
									type="button"
									disabled={busy}
									onClick={() => void run({ action: "confirm" })}
									className="bg-cta rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-white"
								>
									Confirmar
								</button>
								<button
									type="button"
									disabled={busy}
									onClick={() => void run({ action: "cancel" })}
									className="text-ink-2 rounded-[6px] px-3 py-1.5 text-[12px]"
								>
									Cancelar
								</button>
							</div>
						)}
					</article>
				);
			}
			default:
				return null;
		}
	};

	const waitingAnalyst = hist?.conversation.state === "aguardando_analista";
	const body = (
		<div className="flex h-full min-h-0 flex-col">
			{waitingAnalyst && (
				<div className="border-rule flex items-center justify-center gap-2 border-b bg-amber-50 px-6 py-2 text-[12px] text-amber-900">
					<span className="size-1.5 rounded-full bg-amber-500" />
					{hist?.contactBy
						? `Aguardando um analista · contato até ${hhmm(hist.contactBy)}`
						: "Aguardando um analista"}
				</div>
			)}
			<div
				ref={log}
				role="log"
				aria-label="Conversa"
				onScroll={(e) => {
					const el = e.currentTarget;
					atBottom.current =
						el.scrollHeight - el.scrollTop - el.clientHeight < 48;
					if (atBottom.current) setUnseen(false);
				}}
				className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-8"
			>
				<div className="mx-auto grid w-full max-w-[760px] min-w-0 gap-4">
					{!hist ? (
						<Skeletons />
					) : (
						<>
							{hist.messages.length === 0 && !out && (
								<div className="grid gap-1.5">
									<span className="text-ink text-[11px] font-semibold">
										Nexo Assist
									</span>
									<Bubble>
										<p>
											Olá, {hist.firstName}! Sou o Nexo Assist. Posso abrir um
											chamado, contar como estão os seus ou ajudar com uma
											dúvida de TI.
										</p>
									</Bubble>
								</div>
							)}
							{folded.map(({ message, items }, idx) => {
								const isLast = idx === folded.length - 1;
								if (message.role === "employee") {
									const t = message.blocks.find((b) => b.kind === "text");
									return t && t.kind === "text" ? (
										<EmployeeBubble
											key={message.seq}
											text={shownText(t.text)}
										/>
									) : null;
								}
								if (message.role === "system")
									return (
										<p
											key={message.seq}
											className="text-ink-3 text-center text-[11px]"
										>
											{message.blocks
												.map((b) => (b.kind === "text" ? b.text : ""))
												.join(" ")}
										</p>
									);
								const author = message.blocks.find((b) => b.kind === "author");
								return (
									<div key={message.seq} className="grid min-w-0 gap-1.5">
										{message.role === "analyst" && author?.kind === "author" ? (
											<span className="text-ink text-[11px] font-semibold">
												{author.name} · {author.team}
											</span>
										) : message.decision ? (
											<ActionLine
												decision={message.decision}
												onOpen={() => setPanel(message.decision)}
											/>
										) : (
											<span className="text-ink text-[11px] font-semibold">
												Nexo Assist
											</span>
										)}
										{renderItems(message, items, isLast)}
									</div>
								);
							})}
							{out?.said != null && (
								<EmployeeBubble text={out.said}>
									{out.failed && (
										<RetryLine
											label="Não enviada"
											onRetry={() => void retry(out.input)}
										/>
									)}
								</EmployeeBubble>
							)}
							{out && !out.said && out.failed && (
								<div className="flex justify-end">
									<RetryLine
										label="Não enviada"
										onRetry={() => void retry(out.input)}
									/>
								</div>
							)}
							{live && (
								<div className="grid gap-1.5">
									<ActionLine decision={null} progress={live.steps} />
									{live.text && (
										<Bubble>
											<p className="whitespace-pre-wrap">{live.text}</p>
										</Bubble>
									)}
									{live.interrupted && out && (
										<RetryLine
											label="Resposta interrompida"
											onRetry={() => void retry(out.input)}
										/>
									)}
								</div>
							)}
						</>
					)}
				</div>
			</div>
			{unseen && (
				<div className="relative">
					<button
						type="button"
						onClick={toBottom}
						className="bg-ink absolute -top-12 left-1/2 -translate-x-1/2 rounded-full px-3 py-1.5 text-[12px] text-white shadow"
					>
						Novas mensagens
					</button>
				</div>
			)}
			<div className="mx-auto w-full max-w-[760px] px-6 pb-4">
				{notice && <p className="mb-1.5 text-[12px] text-red-700">{notice}</p>}
				<Composer
					count={hist?.count ?? 0}
					limit={hist?.limit ?? 30}
					busy={busy || !hist}
					onSend={(text) => void run({ text })}
					onAnalyst={() => void run({ action: "analyst" })}
					onNewConversation={() => void newConversation()}
				/>
			</div>
			{panel && (
				<DecisionPanel
					decision={panel}
					audience="employee"
					onClose={() => setPanel(null)}
				/>
			)}
		</div>
	);
	return frame(<HealthBadge online={online} />, body);
}
