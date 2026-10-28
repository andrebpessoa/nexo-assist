import type { Session } from "@nexo-assist/auth";
import type { Database } from "@nexo-assist/db";

export type Context = {
	session: Session | null;
	db: Database;
};
