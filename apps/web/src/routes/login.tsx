import { createFileRoute, useRouter } from "@tanstack/react-router";
import * as z from "zod";

import { LoginPage } from "@/features/login/login-page";
import { afterLogin } from "@/lib/access";
import { signInSeed } from "@/lib/session";

export const Route = createFileRoute("/login")({
	validateSearch: z.object({ redirect: z.string().optional() }),
	component: LoginRoute,
});

function LoginRoute() {
	const router = useRouter();
	const { redirect } = Route.useSearch();
	return (
		<LoginPage
			onSubmit={async (values) => {
				const outcome = await signInSeed(values);
				if (outcome.ok && outcome.role) {
					await router.navigate({ href: afterLogin(outcome.role, redirect) });
				}
				return outcome;
			}}
		/>
	);
}
