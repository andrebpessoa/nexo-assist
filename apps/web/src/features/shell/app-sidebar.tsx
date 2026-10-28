import { LogOut, MessageSquare, UserRound } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

import { NexoLogo } from "@/features/brand/nexo-logo";

export type SidebarUser = { name: string; email: string; initials: string };
export type EmployeePage = "atendimento" | "perfil";

const ITEMS: {
	page: EmployeePage;
	to: string;
	label: string;
	icon: ReactNode;
}[] = [
	{
		page: "atendimento",
		to: "/atendimento",
		label: "Atendimento",
		icon: <MessageSquare className="size-4" />,
	},
	{
		page: "perfil",
		to: "/perfil",
		label: "Meu perfil",
		icon: <UserRound className="size-4" />,
	},
];

/** Employee sidebar from `captures/06-cliente-meu-perfil.png` (AUTH-16, AUTH-18). */
export function AppSidebar({
	me,
	active,
	onNavigate,
	onSignOut,
}: {
	me: SidebarUser;
	active: EmployeePage;
	onNavigate: (to: string) => void;
	onSignOut: () => Promise<void>;
}) {
	const go = (to: string) => (event: MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();
		onNavigate(to);
	};
	return (
		<aside className="border-rule bg-paper flex h-svh w-[232px] shrink-0 flex-col border-r px-3 py-5">
			<div className="px-2">
				<NexoLogo />
			</div>
			<nav aria-label="Principal" className="mt-6 space-y-1">
				{ITEMS.map((item) => {
					const current = item.page === active;
					return (
						<a
							key={item.page}
							href={item.to}
							onClick={go(item.to)}
							aria-current={current ? "page" : undefined}
							className={`flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] ${current ? "bg-cta-soft text-cta font-medium" : "text-ink-2 hover:bg-desk"}`}
						>
							{item.icon}
							<span>{item.label}</span>
						</a>
					);
				})}
			</nav>
			<div className="border-rule mt-auto border-t px-2 pt-3">
				<div className="flex items-center gap-2.5">
					<span
						aria-hidden="true"
						className="bg-cta-soft text-cta flex size-8 items-center justify-center rounded-full text-[11px] font-semibold"
					>
						{me.initials}
					</span>
					<div className="min-w-0">
						<p className="text-ink truncate text-[13px] font-medium">
							{me.name}
						</p>
						<p className="text-ink-3 truncate text-[11px]">{me.email}</p>
					</div>
				</div>
				<button
					type="button"
					onClick={() => void onSignOut()}
					className="text-ink-2 hover:text-ink mt-3 flex items-center gap-2 py-1 text-[13px]"
				>
					<LogOut className="size-4" />
					Sair
				</button>
			</div>
		</aside>
	);
}

/** Sidebar plus the top bar breadcrumb ("Service desk de TI › <page>"). */
export function AppShell({
	sidebar,
	here,
	aside,
	children,
}: {
	sidebar: ReactNode;
	here: string;
	/** Right end of the top bar, e.g. the assistant badge (CHAT-01). */
	aside?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="bg-paper flex h-svh">
			{sidebar}
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="border-rule flex h-[60px] shrink-0 items-center gap-2 border-b px-8 text-[13px]">
					<span className="text-ink-3">Service desk de TI</span>
					<span aria-hidden="true" className="text-ink-3">
						›
					</span>
					<span className="text-ink font-medium">{here}</span>
					{aside && <div className="ml-auto">{aside}</div>}
				</header>
				<main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
			</div>
		</div>
	);
}
