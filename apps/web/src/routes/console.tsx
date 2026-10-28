import {
	createFileRoute,
	useRouteContext,
	useRouter,
} from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { NexoLogo } from "@/features/brand/nexo-logo";
import { signOut } from "@/lib/session";

export const Route = createFileRoute("/console")({
	component: ConsoleRoute,
});

/** Placeholder until `console-analista` brings the queue. */
function ConsoleRoute() {
	const router = useRouter();
	const { me } = useRouteContext({ from: "__root__" });
	if (!me) return null;
	return (
		<div className="bg-paper min-h-svh">
			<header className="border-rule flex h-[60px] items-center justify-between border-b px-6">
				<NexoLogo />
				<div className="flex items-center gap-4 text-[13px]">
					<span className="text-ink-2">{me.name}</span>
					<button
						type="button"
						onClick={async () => {
							await signOut();
							await router.navigate({ to: "/login" });
						}}
						className="text-ink-2 hover:text-ink flex items-center gap-1.5"
					>
						<LogOut className="size-4" />
						Sair
					</button>
				</div>
			</header>
			<main className="mx-auto max-w-[540px] px-6 py-12">
				<h1 className="text-ink text-[22px] font-semibold">Console</h1>
				<p className="text-ink-3 mt-1 text-[13px]">
					A fila de chamados chega na próxima entrega.
				</p>
			</main>
		</div>
	);
}
