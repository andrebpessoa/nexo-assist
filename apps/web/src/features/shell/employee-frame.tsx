import { useRouteContext, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { signOut } from "@/lib/session";

import { AppShell, AppSidebar, type EmployeePage } from "./app-sidebar";

/** Employee pages: sidebar with the session user, Sair ends the session (AUTH-16, AUTH-18). */
export function EmployeeFrame({
	active,
	here,
	aside,
	children,
}: {
	active: EmployeePage;
	here: string;
	aside?: ReactNode;
	children: ReactNode;
}) {
	const router = useRouter();
	const { me } = useRouteContext({ from: "__root__" });
	if (!me) return null;
	return (
		<AppShell
			here={here}
			aside={aside}
			sidebar={
				<AppSidebar
					me={me}
					active={active}
					onNavigate={(to) => void router.navigate({ to })}
					onSignOut={async () => {
						await signOut();
						await router.navigate({ to: "/login" });
					}}
				/>
			}
		>
			{children}
		</AppShell>
	);
}
