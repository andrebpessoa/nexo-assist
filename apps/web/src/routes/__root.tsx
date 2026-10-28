import { Toaster } from "@nexo-assist/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	redirect,
} from "@tanstack/react-router";

import { resolveAccess } from "@/lib/access";
import { loadMe } from "@/lib/session";
import type { trpc } from "@/utils/trpc";

import "../index.css";

export interface RouterAppContext {
	trpc: typeof trpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	/** Every route goes through `resolveAccess` (AUTH-01, AUTH-14). */
	beforeLoad: async ({ location }) => {
		const me = await loadMe();
		const target = resolveAccess(me?.role ?? null, location.pathname);
		if (target) throw redirect({ href: target });
		return { me };
	},
	head: () => ({
		meta: [
			{ title: "Nexo Assist" },
			{ name: "description", content: "Service desk de TI da Nexo" },
		],
		links: [{ rel: "icon", href: "/favicon.ico" }],
	}),
});

function RootComponent() {
	return (
		<>
			<HeadContent />
			<Outlet />
			<Toaster theme="light" richColors />
		</>
	);
}
