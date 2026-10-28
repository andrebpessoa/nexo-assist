import type { DecisionRecord } from "@nexo-assist/agent/types";
import { useCallback, useEffect, useRef, useState } from "react";

import { DecisionPanel } from "@/features/decision/decision-panel";

import type {
	ConsoleApi,
	ConsoleConversation,
	ConsoleList,
	TicketsPanelData,
} from "./api";
import { ConversationList, Rail } from "./conversation-list";
import { ConversationView } from "./conversation-view";
import { initials } from "./labels";
import { TicketsPanel } from "./tickets-panel";

const AVAILABLE = "nexo.console.available";

/** The analyst console: rail, list, conversation and tickets, polled every `pollMs` (CON-01, CON-10). */
export function ConsoleScreen({
	api,
	me,
	now = () => new Date(),
	pollMs = 3000,
	onSignOut,
}: {
	api: ConsoleApi;
	me: { name: string };
	now?: () => Date;
	pollMs?: number;
	onSignOut: () => void;
}) {
	const [list, setList] = useState<ConsoleList | null>(null);
	const [selected, setSelected] = useState<string | null>(null);
	const [conv, setConv] = useState<ConsoleConversation | null>(null);
	const [tickets, setTickets] = useState<TicketsPanelData | null>(null);
	const [ticketsFailed, setTicketsFailed] = useState(false);
	const [panelOpen, setPanelOpen] = useState(true);
	const [decision, setDecision] = useState<DecisionRecord | null>(null);
	const [available, setAvailable] = useState(
		() => localStorage.getItem(AVAILABLE) !== "false",
	);
	const selectedRef = useRef(selected);
	selectedRef.current = selected;

	const loadList = useCallback(async () => {
		try {
			const l = await api.list();
			setList(l);
			if (!selectedRef.current && l.items[0]) setSelected(l.items[0].id);
		} catch {
			/* keep the last list; the next poll retries */
		}
	}, [api]);

	const loadConv = useCallback(
		async (id: string) => {
			try {
				const c = await api.conversation(id);
				if (selectedRef.current === id) setConv(c);
			} catch {
				/* the next poll retries */
			}
		},
		[api],
	);

	const loadTickets = useCallback(
		async (id: string) => {
			setTicketsFailed(false);
			try {
				const t = await api.tickets(id);
				if (selectedRef.current === id) setTickets(t);
			} catch {
				if (selectedRef.current === id) setTicketsFailed(true);
			}
		},
		[api],
	);

	useEffect(() => {
		void loadList();
		const t = setInterval(() => {
			void loadList();
			if (selectedRef.current) void loadConv(selectedRef.current);
		}, pollMs);
		return () => clearInterval(t);
	}, [loadList, loadConv, pollMs]);

	useEffect(() => {
		if (!selected) return;
		setConv(null);
		setTickets(null);
		setDecision(null);
		void loadConv(selected);
		void loadTickets(selected);
	}, [selected, loadConv, loadTickets]);

	const toggleAvailable = (v: boolean) => {
		localStorage.setItem(AVAILABLE, String(v));
		setAvailable(v);
	};

	const clock = now();
	return (
		<div className="bg-paper flex h-svh overflow-hidden">
			<Rail
				badge={list?.counts.para_voce ?? 0}
				available={available}
				initials={initials(me.name)}
				onSignOut={onSignOut}
			/>
			<ConversationList
				list={list}
				loading={!list}
				now={clock}
				selectedId={selected}
				onSelect={setSelected}
				available={available}
				onAvailable={toggleAvailable}
			/>
			<ConversationView
				key={selected ?? "none"}
				data={conv}
				loading={!!selected && !conv}
				now={clock}
				act={(action, text) =>
					selected
						? api.act(selected, action, text)
						: Promise.resolve({ ok: true })
				}
				onChanged={() => {
					void loadList();
					if (selected) {
						void loadConv(selected);
						void loadTickets(selected);
					}
				}}
				onDecision={setDecision}
				ticketsOpen={panelOpen && !decision}
				onShowTickets={() => {
					setDecision(null);
					setPanelOpen(true);
				}}
			/>
			{decision ? (
				<DecisionPanel
					decision={decision}
					audience="analyst"
					onClose={() => setDecision(null)}
				/>
			) : (
				panelOpen &&
				conv && (
					<TicketsPanel
						key={selected}
						name={conv.conversation.name}
						data={tickets}
						failed={ticketsFailed}
						now={clock}
						onRetry={() => selected && void loadTickets(selected)}
						onClose={() => setPanelOpen(false)}
						loadTicket={(n) => api.ticket(n)}
					/>
				)
			)}
		</div>
	);
}
