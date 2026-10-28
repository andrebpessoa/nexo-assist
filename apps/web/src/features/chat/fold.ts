import type { Block } from "@nexo-assist/agent/types";

import type { ChatMessage } from "./api";

export interface FoldedItem {
	block: Block;
	/** Buttons and options still answer; false once answered or settled. */
	active: boolean;
	/** The option or ticket the employee picked. */
	chosen?: string;
}

export interface FoldedMessage {
	message: ChatMessage;
	items: FoldedItem[];
}

const textOf = (m: ChatMessage | undefined) =>
	m?.blocks.find((b) => b.kind === "text")?.text;

/**
 * What each block looks like now, from the stored history (CHAT-25): answered questions and lists
 * lock with the pick, a draft shows its final status on the first card and the later copies go.
 * `pending` is the kind the server still holds; only then do the latest draft's buttons work.
 */
export function foldHistory(
	messages: readonly ChatMessage[],
	pending: string | null,
): FoldedMessage[] {
	const out: FoldedMessage[] = messages.map((message) => ({
		message,
		items: [],
	}));
	/** The card on screen for the draft in progress, to take the later statuses. */
	let card: FoldedItem | null = null;
	messages.forEach((message, i) => {
		const next = messages
			.slice(i + 1)
			.find((m) => m.role === "employee" && m.blocks.length > 0);
		for (const block of message.blocks) {
			if (block.kind === "options") {
				const answer = textOf(next);
				out[i]?.items.push(
					answer && block.options.includes(answer)
						? { block, active: false, chosen: answer }
						: { block, active: !next },
				);
			} else if (block.kind === "ticket_list") {
				const answer = textOf(next);
				const picked = block.tickets.find((t) =>
					answer?.startsWith(t.number),
				)?.number;
				out[i]?.items.push(
					picked
						? { block, active: false, chosen: picked }
						: { block, active: !next },
				);
			} else if (block.kind === "ticket_draft") {
				if (block.status === "Aguardando confirmação") {
					if (card) {
						// An edit: the new card replaces the old one.
						const at = out.findIndex((o) =>
							o.items.includes(card as FoldedItem),
						);
						out[at]?.items.splice(out[at].items.indexOf(card), 1);
					}
					card = { block, active: false };
					out[i]?.items.push(card);
				} else if (card && card.block.kind === "ticket_draft") {
					card.block = {
						...card.block,
						status: block.status,
						number: block.number,
					};
					card.active = false;
					card = null;
				} else out[i]?.items.push({ block, active: false });
			} else out[i]?.items.push({ block, active: true });
		}
	});
	if (
		card &&
		pending === "ticket_draft" &&
		(card as FoldedItem).block.kind === "ticket_draft"
	)
		(card as FoldedItem).active = true;
	return out;
}
