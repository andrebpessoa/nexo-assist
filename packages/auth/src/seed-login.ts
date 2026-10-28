import type { Database } from "@nexo-assist/db";
import { profile } from "@nexo-assist/db/schema/tickets";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { eq } from "drizzle-orm";
import * as z from "zod";

export const SEED_LOGIN_ERRORS = {
	EMAIL_NOT_FOUND: {
		code: "EMAIL_NOT_FOUND",
		message: "Não encontramos esse e-mail. Use seu e-mail corporativo da Nexo.",
	},
	PASSWORD_REQUIRED: {
		code: "PASSWORD_REQUIRED",
		message: "Digite sua senha.",
	},
} as const;

export type Role = "employee" | "analyst";

/** Where each role lands after login (AUTH-03, AUTH-04). */
export const homeFor = (role: Role) =>
	role === "analyst" ? "/console" : "/atendimento";

/**
 * Login for the demo: any non-empty password signs in a seed e-mail (AUTH-03 to AUTH-06). Mirrors
 * Better Auth's own `signInEmail` session and cookie handling, without the password check.
 */
export const seedLogin = (database: Database) =>
	({
		id: "seed-login",
		endpoints: {
			signInSeed: createAuthEndpoint(
				"/sign-in/seed",
				{
					method: "POST",
					body: z.object({
						email: z.string(),
						password: z.string(),
						rememberMe: z.boolean().optional(),
					}),
				},
				async (ctx) => {
					const email = ctx.body.email.trim().toLowerCase();
					if (ctx.body.password.trim() === "") {
						throw APIError.from(
							"BAD_REQUEST",
							SEED_LOGIN_ERRORS.PASSWORD_REQUIRED,
						);
					}
					const found =
						await ctx.context.internalAdapter.findUserByEmail(email);
					if (!found) {
						throw APIError.from(
							"UNAUTHORIZED",
							SEED_LOGIN_ERRORS.EMAIL_NOT_FOUND,
						);
					}
					const [row] = await database
						.select({ role: profile.role })
						.from(profile)
						.where(eq(profile.userId, found.user.id));
					if (!row) {
						throw APIError.from(
							"UNAUTHORIZED",
							SEED_LOGIN_ERRORS.EMAIL_NOT_FOUND,
						);
					}
					const dontRememberMe = ctx.body.rememberMe === false;
					const session = await ctx.context.internalAdapter.createSession(
						found.user.id,
						dontRememberMe,
					);
					await setSessionCookie(
						ctx,
						{ session, user: found.user },
						dontRememberMe,
					);
					return ctx.json({
						role: row.role,
						redirectTo: homeFor(row.role),
						user: {
							id: found.user.id,
							name: found.user.name,
							email: found.user.email,
						},
					});
				},
			),
		},
	}) satisfies BetterAuthPlugin;
