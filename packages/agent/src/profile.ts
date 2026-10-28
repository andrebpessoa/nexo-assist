import type { Database } from "@nexo-assist/db";
import { profile, user } from "@nexo-assist/db/schema/index";
import { eq } from "drizzle-orm";

import type { EmployeeProfile } from "./understand";

/** Name, OS and department the model may use to judge an article's condition (AGT-10). */
export function createProfileReader(db: Database) {
	return async (userId: string): Promise<EmployeeProfile> => {
		const [row] = await db
			.select({
				name: user.name,
				os: profile.os,
				department: profile.department,
			})
			.from(user)
			.leftJoin(profile, eq(profile.userId, user.id))
			.where(eq(user.id, userId));
		return {
			name: row?.name ?? "",
			os: row?.os ?? null,
			department: row?.department ?? null,
		};
	};
}
