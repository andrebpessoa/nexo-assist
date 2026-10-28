import { initTRPC, TRPCError } from "@trpc/server";

import type { Role } from "./access";
import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
			cause: "No session",
		});
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});

/** UNAUTHORIZED without a session, FORBIDDEN for any other role (AUTH-15). */
const roleProcedure = (role: Role) =>
	protectedProcedure.use(({ ctx, next }) => {
		if (ctx.role !== role) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Esta área não é do seu perfil.",
			});
		}
		return next({ ctx: { ...ctx, role } });
	});

export const employeeProcedure = roleProcedure("employee");

export const analystProcedure = roleProcedure("analyst");
