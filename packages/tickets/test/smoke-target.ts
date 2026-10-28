/**
 * The dev server the D1 smoke runs against (AD-019): only an explicit SERVER_URL, never a default
 * port, so `bun run test` never reaches another app that happens to listen on 3000.
 */
export function smokeTarget(
	env: Record<string, string | undefined>,
): string | undefined {
	const url = env.SERVER_URL?.trim();
	return url ? url.replace(/\/+$/, "") : undefined;
}
