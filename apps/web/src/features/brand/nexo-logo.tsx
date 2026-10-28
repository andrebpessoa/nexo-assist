/** The Nexo "N" mark from the prototype. */
export function NexoMark({ className = "size-5" }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
			<path
				fill="currentColor"
				d="M3 3h4.6l8.4 11.2V3H21v18h-4.6L8 9.8V21H3z"
			/>
		</svg>
	);
}

export function NexoLogo({ tone = "ink" }: { tone?: "ink" | "light" }) {
	return (
		<div
			className={`flex items-center gap-2 text-[15px] font-semibold ${tone === "light" ? "text-white" : "text-ink"}`}
		>
			<NexoMark
				className={`size-5 ${tone === "light" ? "text-white" : "text-cta"}`}
			/>
			<span>Nexo Assist</span>
		</div>
	);
}
