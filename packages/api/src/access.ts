import type { Database } from "@nexo-assist/db";
import { profile } from "@nexo-assist/db/schema/tickets";
import { eq } from "drizzle-orm";

export type Role = "employee" | "analyst";

const DAY = 24 * 60 * 60_000;

/** The session user's role, from `profile` (AD-015); `null` when there is no profile. */
export async function loadRole(
	db: Database,
	userId: string,
): Promise<Role | null> {
	const [row] = await db
		.select({ role: profile.role })
		.from(profile)
		.where(eq(profile.userId, userId));
	return row?.role ?? null;
}

export async function loadPasswordChangedAt(
	db: Database,
	userId: string,
): Promise<Date | null> {
	const [row] = await db
		.select({ changedAt: profile.passwordChangedAt })
		.from(profile)
		.where(eq(profile.userId, userId));
	return row?.changedAt ?? null;
}

/** Whole days since the last password change, for "Alterada há N dias" (AUTH-19). */
export function passwordAgeDays(changedAt: Date | null, now: Date) {
	if (!changedAt) return null;
	return Math.max(0, Math.floor((now.getTime() - changedAt.getTime()) / DAY));
}

/** First and last name initials for the sidebar avatar (AUTH-18). */
export function initials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const first = parts[0]?.[0] ?? "";
	const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
	return `${first}${last}`.toUpperCase();
}
