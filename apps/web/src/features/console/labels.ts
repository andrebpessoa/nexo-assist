import type { ConsoleListItem } from "./api";

const TZ = "America/Sao_Paulo";
const dayKey = (d: Date) =>
	new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

export const hhmm = (iso: string) =>
	new Intl.DateTimeFormat("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: TZ,
	}).format(new Date(iso));

/** "agora", "10:05", "ontem" or "20/10", as in the capture's list. */
export function listTime(iso: string, now: Date): string {
	const at = new Date(iso);
	if (now.getTime() - at.getTime() < 60_000) return "agora";
	if (dayKey(at) === dayKey(now)) return hhmm(iso);
	if (dayKey(at) === dayKey(new Date(now.getTime() - 86_400_000)))
		return "ontem";
	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		timeZone: TZ,
	}).format(at);
}

/** "Hoje", "Ontem" or the date, for the day separator (CON-13). */
export function dayLabel(iso: string, now: Date): string {
	const at = new Date(iso);
	if (dayKey(at) === dayKey(now)) return "Hoje";
	if (dayKey(at) === dayKey(new Date(now.getTime() - 86_400_000)))
		return "Ontem";
	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "long",
		timeZone: TZ,
	}).format(at);
}
export const sameDay = (a: string, b: string) =>
	dayKey(new Date(a)) === dayKey(new Date(b));

export type Tone = "red" | "amber" | "green" | "blue" | "gray";

/** The state line under each conversation (CON-02). */
export function statusLabel(
	item: ConsoleListItem,
	now: Date,
): { text: string; tone: Tone } {
	const s = item.status;
	switch (s.kind) {
		case "transferida": {
			if (s.ticket) return { text: `Transferida · ${s.ticket}`, tone: "red" };
			const min = item.contactBy
				? Math.max(
						0,
						Math.ceil((Date.parse(item.contactBy) - now.getTime()) / 60_000),
					)
				: 0;
			return { text: `Transferida · contato em ${min} min`, tone: "red" };
		}
		case "pediu_ajuda":
			return {
				text: `Agent pediu ajuda · confiança ${s.confidence}%`,
				tone: "amber",
			};
		case "agent":
			return { text: "Agent atendendo", tone: "green" };
		case "resolvida":
			return { text: "Resolvida pelo agent", tone: "gray" };
		case "voce":
			return { text: "Você está atendendo", tone: "blue" };
		case "outro_analista":
			return {
				text: `${item.assigneeName ?? "Outro analista"} está atendendo`,
				tone: "blue",
			};
		case "encerrada":
			return { text: "Encerrada", tone: "gray" };
	}
}

const fold = (s: string) =>
	s
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();

/** Name or ticket number, ignoring case and accents (CON-08). */
export function matches(item: ConsoleListItem, query: string): boolean {
	const q = fold(query);
	if (!q) return true;
	return (
		fold(item.name).includes(q) || item.tickets.some((t) => fold(t).includes(q))
	);
}

export function previewText(item: ConsoleListItem): string {
	const p = item.preview;
	if (!p) return "";
	if (p.role === "agent") return `Nexo: ${p.text}`;
	return p.text;
}

export const initials = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.map((w) => w[0])
		.filter((_, i, all) => i === 0 || i === all.length - 1)
		.join("")
		.toUpperCase();
