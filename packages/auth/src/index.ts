import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@nexo-assist/db";
import * as schema from "@nexo-assist/db/schema/auth";
import { betterAuth } from "better-auth";

import { seedLogin } from "./seed-login";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export type AuthConfig = {
	BETTER_AUTH_URL: string;
	BETTER_AUTH_SECRET: string;
	CORS_ORIGIN: string;
};

export function createAuth(
	env: AuthConfig,
	database: Database,
	desktopOrigins: readonly string[] = [],
) {
	return betterAuth({
		database: drizzleAdapter(database, {
			provider: "sqlite",
			schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
		// No sign-up and no real password: the seed login is the only way in (AUTH-13).
		emailAndPassword: { enabled: false },
		session: { expiresIn: THIRTY_DAYS },
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		plugins: [seedLogin(database)],
	});
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
