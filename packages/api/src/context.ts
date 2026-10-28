import type { Session } from "@nexo-assist/auth";
import type { Database } from "@nexo-assist/db";

import { loadRole, type Role } from "./access";

export type Context = {
	session: Session | null;
	db: Database;
	role: Role | null;
};

/** Context for one request: the session plus the role read from `profile` (AUTH-15). */
export async function buildContext({
	db,
	session,
}: {
	db: Database;
	session: Session | null;
}): Promise<Context> {
	const role = session ? await loadRole(db, session.user.id) : null;
	return { db, session, role };
}
