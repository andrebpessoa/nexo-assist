import { actionLine, progressLabel } from "@nexo-assist/agent/transparency";
import type { DecisionRecord } from "@nexo-assist/agent/types";

export type StepProgress = {
	name: string;
	target?: string;
	done: boolean;
	ok?: boolean;
};

const label = "text-ink-3 inline-flex items-center gap-1";

/**
 * "Nexo Assist ✓ consultou seus chamados …" above a reply (TRN-01 to TRN-05). With `progress`
 * and no decision yet, it shows the running step in the gerund (TRN-04).
 */
export function ActionLine({
	decision,
	progress = [],
	onOpen,
}: {
	decision: DecisionRecord | null;
	progress?: StepProgress[];
	onOpen?: () => void;
}) {
	const brand = <span className="text-ink font-semibold">Nexo Assist</span>;
	if (!decision) {
		const done = actionLine({
			intent: "outro",
			confidence: 0,
			extracted: {},
			action: "responder",
			rule: "",
			reason: "",
			tools: progress
				.filter((p) => p.done)
				.map((p) => ({
					name: p.name,
					target: p.target,
					ok: p.ok ?? true,
					attempts: 1,
				})),
		}).filter((l) => l.label !== "respondeu sem consultar sistemas");
		const running = progress
			.filter((p) => !p.done)
			.map((p) => progressLabel(p.name, p.target))
			.filter((l): l is string => l !== null);
		return (
			<div
				role="status"
				className="flex flex-wrap items-center gap-x-2.5 text-[11px]"
			>
				{brand}
				{done.map((l) => (
					<span key={l.label} className={label}>
						{l.ok ? "✓" : "✕"} {l.label}
					</span>
				))}
				{running.map((l) => (
					<span key={l} className="text-cta animate-pulse">
						{l}
					</span>
				))}
			</div>
		);
	}
	return (
		<button
			type="button"
			onClick={onOpen}
			title="Por que o Nexo fez isso"
			className="hover:bg-desk -mx-1 flex flex-wrap items-center gap-x-2.5 rounded-[6px] px-1 text-left text-[11px]"
		>
			{brand}
			{actionLine(decision).map((l) => (
				<span key={l.label} className={l.ok ? label : `${label} text-red-700`}>
					{l.ok ? "✓" : "✕"} {l.label}
				</span>
			))}
		</button>
	);
}
