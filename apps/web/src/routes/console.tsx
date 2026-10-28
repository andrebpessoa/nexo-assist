import {
	createFileRoute,
	useRouteContext,
	useRouter,
} from "@tanstack/react-router";
import { useMemo } from "react";

import { ENV } from "@/env.public";
import { createConsoleApi } from "@/features/console/api";
import { ConsoleScreen } from "@/features/console/console-screen";
import { signOut } from "@/lib/session";

export const Route = createFileRoute("/console")({
	component: ConsoleRoute,
});

function ConsoleRoute() {
	const router = useRouter();
	const { me } = useRouteContext({ from: "__root__" });
	const api = useMemo(() => createConsoleApi(ENV.VITE_SERVER_URL), []);
	if (!me) return null;
	return (
		<ConsoleScreen
			api={api}
			me={me}
			onSignOut={async () => {
				await signOut();
				await router.navigate({ to: "/login" });
			}}
		/>
	);
}
