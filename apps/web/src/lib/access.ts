import type { Role } from "@nexo-assist/api/access";

export type { Role };

const AREAS: Record<Role, readonly string[]> = {
	employee: ["/atendimento", "/perfil"],
	analyst: ["/console"],
};

export const homeFor = (role: Role) =>
	role === "analyst" ? "/console" : "/atendimento";

const inside = (pathname: string, area: string) =>
	pathname === area || pathname.startsWith(`${area}/`);

const isAreaOf = (role: Role, pathname: string) =>
	AREAS[role].some((area) => inside(pathname, area));

/**
 * Where to send someone who opens `pathname`, or `null` to let them in (AUTH-01, AUTH-14). Pure, so
 * the route guard only applies it.
 */
export function resolveAccess(role: Role | null, pathname: string) {
	if (!role) {
		if (pathname === "/login") return null;
		if (pathname === "/") return "/login";
		return `/login?redirect=${encodeURIComponent(pathname)}`;
	}
	return isAreaOf(role, pathname) ? null : homeFor(role);
}

/** After login: back to the route asked for when it is the role's area, else home (Edge Cases). */
export function afterLogin(role: Role, redirect: string | undefined) {
	if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
		const pathname = redirect.split(/[?#]/)[0] ?? redirect;
		if (isAreaOf(role, pathname)) return redirect;
	}
	return homeFor(role);
}
