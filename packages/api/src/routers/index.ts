import { initials, loadPasswordChangedAt, passwordAgeDays } from "../access";
import { protectedProcedure, publicProcedure, router } from "../index";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	/** The signed-in user for the sidebar and "Meu perfil" (AUTH-17 to AUTH-19). */
	me: protectedProcedure.query(async ({ ctx }) => {
		const { name, email, id } = ctx.session.user;
		const changedAt = await loadPasswordChangedAt(ctx.db, id);
		return {
			name,
			email,
			role: ctx.role,
			initials: initials(name),
			passwordAgeDays: passwordAgeDays(changedAt, new Date()),
		};
	}),
});
export type AppRouter = typeof appRouter;
