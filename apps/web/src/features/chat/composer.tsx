import { MAX_CHARS } from "@nexo-assist/agent/session";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

/**
 * The message field (CHAT-04 to CHAT-06, CHAT-22, CHAT-23). `onEmptyChange` lets the screen
 * know when number keys may answer an open question.
 */
export function Composer({
	count,
	limit,
	busy,
	onSend,
	onAnalyst,
	onNewConversation,
	onEmptyChange,
}: {
	count: number;
	limit: number;
	busy: boolean;
	onSend: (text: string) => void;
	onAnalyst: () => void;
	onNewConversation: () => void;
	onEmptyChange?: (empty: boolean) => void;
}) {
	const [text, setText] = useState("");
	const atLimit = count >= limit;
	const tooLong = text.length > MAX_CHARS;
	const canSend = !busy && !atLimit && !tooLong && text.trim() !== "";
	const change = (value: string) => {
		setText(value);
		onEmptyChange?.(value.trim() === "");
	};
	const send = () => {
		if (!canSend) return;
		onSend(text);
		change("");
	};
	return (
		<div>
			{atLimit && (
				<div className="mb-2 flex flex-wrap items-center gap-2 rounded-[8px] bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
					<span className="flex-1">
						Você chegou ao limite de {limit} mensagens nesta conversa.
					</span>
					<button
						type="button"
						onClick={onAnalyst}
						className="border-rule bg-paper text-ink rounded-[6px] border px-2.5 py-1"
					>
						Falar com um analista
					</button>
					<button
						type="button"
						onClick={onNewConversation}
						className="bg-cta rounded-[6px] px-2.5 py-1 text-white"
					>
						Nova conversa
					</button>
				</div>
			)}
			<div className="border-rule bg-paper focus-within:border-cta flex items-end gap-2 rounded-[10px] border p-1.5 pl-3">
				<textarea
					aria-label="Mensagem"
					placeholder="Escreva para o Nexo..."
					rows={1}
					value={text}
					disabled={atLimit}
					onChange={(e) => change(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
							e.preventDefault();
							send();
						}
					}}
					className="text-ink placeholder:text-ink-3 field-sizing-content max-h-40 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-[13px] outline-none disabled:cursor-not-allowed"
				/>
				<button
					type="button"
					disabled={!canSend}
					onClick={send}
					className="bg-cta flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
				>
					<ArrowUp className="size-3.5" aria-hidden />
					Enviar
				</button>
			</div>
			<div className="mt-1.5 flex text-[11px]">
				{tooLong && (
					<span className="text-red-700">
						Máximo de {MAX_CHARS.toLocaleString("pt-BR")} caracteres.
					</span>
				)}
				<span className="text-ink-3 ml-auto">
					{count}/{limit} mensagens nesta sessão
				</span>
			</div>
		</div>
	);
}
