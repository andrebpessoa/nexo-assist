/**
 * `bun run db:seed`: loads the Anexo B sample data. Local dev: through the dev server's
 * `/internal/seed` (`bun run dev` must be up; it enables DEV_SEED_ENABLED). Deploy: with
 * `SERVER_URL` and `SEED_TOKEN`, through the protected `/admin/seed`. Safe to run again: it upserts.
 */
export function seedRequest(env: {
	SERVER_URL?: string;
	SEED_TOKEN?: string;
}): { url: string; headers: Record<string, string> } {
	const serverUrl = (env.SERVER_URL ?? "http://localhost:3000").replace(
		/\/+$/,
		"",
	);
	const token = env.SEED_TOKEN?.trim();
	return token
		? {
				url: `${serverUrl}/admin/seed`,
				headers: { authorization: `Bearer ${token}` },
			}
		: { url: `${serverUrl}/internal/seed`, headers: {} };
}

if (import.meta.main) {
	const { url, headers } = seedRequest(process.env);
	try {
		const response = await fetch(url, {
			method: "POST",
			headers,
			signal: AbortSignal.timeout(30_000),
		});
		if (!response.ok) {
			console.error(
				`db:seed: ${url} answered ${response.status}. Local: is bun run dev up with DEV_SEED_ENABLED=true? Deploy: is SEED_TOKEN the Worker's?`,
			);
			process.exit(1);
		}
		const counts = (await response.json()) as Record<string, number>;
		console.log("db:seed ok", JSON.stringify(counts));
	} catch (error) {
		console.error(
			`db:seed: could not reach ${url}. Start the dev server with bun run dev.`,
			error instanceof Error ? error.message : error,
		);
		process.exit(1);
	}
}
