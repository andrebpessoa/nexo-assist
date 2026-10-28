import { TRPCClientError } from "@trpc/client";
import type { LoginOutcome, LoginValues } from "@/features/login/login-page";
import { authClient } from "@/lib/auth-client";
import { trpcClient } from "@/utils/trpc";
import type { Role } from "./access";

export type Me = Awaited<ReturnType<typeof trpcClient.me.query>>;

/** The signed-in user, or `null` without a session (the guard sends them to `/login`). */
export async function loadMe(): Promise<Me | null> {
	try {
		return await trpcClient.me.query();
	} catch (error) {
		if (error instanceof TRPCClientError) return null;
		throw error;
	}
}

type SeedLoginResponse = { role: Role; redirectTo: string };

/** Calls the seed login (AUTH-03 to AUTH-06, AUTH-11). */
export async function signInSeed(
	values: LoginValues,
): Promise<LoginOutcome & { role?: Role }> {
	const { data, error } = await authClient.$fetch<SeedLoginResponse>(
		"/sign-in/seed",
		{ method: "POST", body: values },
	);
	if (error) {
		if (
			error.status === 401 &&
			"code" in error &&
			error.code === "EMAIL_NOT_FOUND"
		) {
			return { ok: false, error: "EMAIL_NOT_FOUND" };
		}
		return { ok: false, error: "UNKNOWN" };
	}
	return { ok: true, role: data.role };
}

export async function signOut() {
	await authClient.signOut();
}
