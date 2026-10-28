import { panelFor } from "@nexo-assist/agent/transparency";
import type { DecisionRecord } from "@nexo-assist/agent/types";
import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

const number = (n: number) => n.toLocaleString("pt-BR");
const usd = (n: number) =>
	`US$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}`;

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="border-rule border-b px-5 py-4 last:border-b-0">
			<h3 className="text-ink-3 mb-2 text-[11px] font-medium tracking-wide uppercase">
				{title}
			</h3>
			<div className="text-ink text-[13px]">{children}</div>
		</section>
	);
}

/**
 * "Por que o Nexo fez isso" (TRN-06 to TRN-14, TRN-18). The analyst also sees the model, tokens
 * and cost; the employee sees only the time.
 */
export function DecisionPanel({
	decision,
	audience,
	totals,
	onClose,
}: {
	decision: DecisionRecord;
	audience: "employee" | "analyst";
	totals?: { tokens: number; costUsd: number };
	onClose: () => void;
}) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);
	const p = panelFor(decision, audience);
	return (
		<aside
			role="dialog"
			aria-label="Por que o Nexo fez isso"
			className="border-rule bg-paper flex h-full w-[360px] shrink-0 flex-col overflow-y-auto border-l"
		>
			<header className="border-rule flex items-center justify-between border-b px-5 py-4">
				<h2 className="text-ink text-[15px] font-semibold">
					Por que o Nexo fez isso
				</h2>
				<button
					type="button"
					aria-label="Fechar"
					onClick={onClose}
					className="text-ink-3 hover:bg-desk rounded-[6px] p-1"
				>
					<X className="size-4" />
				</button>
			</header>
			{p.incomplete && (
				<p className="bg-amber-50 px-5 py-2 text-[12px] text-amber-800">
					Resposta incompleta
				</p>
			)}
			<Section title="O que entendi">
				<p className="font-medium">{p.understood.intent}</p>
				{p.understood.data.length > 0 && (
					<dl className="mt-1 space-y-0.5 text-[12px]">
						{p.understood.data.map((d) => (
							<div key={d.label} className="flex gap-1">
								<dt className="text-ink-3">{d.label}:</dt>
								<dd>{d.value}</dd>
							</div>
						))}
					</dl>
				)}
			</Section>
			<Section title="O que fiz">
				<p className="font-medium">{p.did.action}</p>
				<p className="text-ink-2 mt-0.5 text-[12px]">{p.did.rule}</p>
			</Section>
			<Section title="Confiança">
				<p>{`${p.confidence.pct}% · ${p.confidence.band}`}</p>
			</Section>
			<Section title="Por quê">
				<p>{p.why}</p>
			</Section>
			{p.transfer && (
				<Section title="Transferência">
					<p className="font-medium">{p.transfer.trigger}</p>
					<p className="text-ink-2 mt-1 text-[12px] whitespace-pre-line">
						{p.transfer.summary}
					</p>
				</Section>
			)}
			<Section title="Passos">
				<ol className="space-y-2">
					{p.steps.map((s, i) => (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: steps repeat names and never reorder
							key={i}
							className="text-[12px]"
						>
							<p className={s.ok ? "font-medium" : "font-medium text-red-700"}>
								{s.ok ? "✓" : "✕"} {s.label}
							</p>
							<p className="text-ink-3 font-data text-[11px]">
								{[
									s.tool,
									s.durationMs !== undefined ? `${s.durationMs} ms` : null,
									s.attempts > 1 ? `${s.attempts} tentativas` : null,
								]
									.filter(Boolean)
									.join(" · ")}
							</p>
							{s.request && <p className="text-ink-2">Pedido: {s.request}</p>}
							{s.result && <p className="text-ink-2">Resultado: {s.result}</p>}
							{s.error && <p className="text-red-700">Erro: {s.error}</p>}
						</li>
					))}
				</ol>
			</Section>
			{p.time && (
				<Section title="Tempo">
					<p>{p.time}</p>
				</Section>
			)}
			{p.cost && (
				<Section title="Modelo e custo">
					<p>{p.cost.model ?? "sem modelo"}</p>
					<p className="text-ink-2 text-[12px]">
						{`${number(p.cost.inputTokens)} + ${number(p.cost.outputTokens)} tokens · ${usd(p.cost.costUsd)}`}
					</p>
					{totals && (
						<p className="text-ink-2 mt-1 text-[12px]">
							<span className="text-ink-3">Conversa até aqui: </span>
							<span>{`${number(totals.tokens)} tokens · ${usd(totals.costUsd)}`}</span>
						</p>
					)}
				</Section>
			)}
		</aside>
	);
}
