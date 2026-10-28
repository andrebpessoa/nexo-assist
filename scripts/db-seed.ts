/**
 * `bun run db:seed`: loads the Anexo B sample data into the local D1 through the dev server
 * (`bun run dev` must be up; it enables DEV_SEED_ENABLED). Safe to run again: it upserts.
 */
const serverUrl = process.env.SERVER_URL ?? "http://localhost:3000";

try {
	const response = await fetch(`${serverUrl}/internal/seed`, {
		method: "POST",
		signal: AbortSignal.timeout(30_000),
	});
	if (!response.ok) {
		console.error(
			`db:seed: ${serverUrl}/internal/seed answered ${response.status}. Is bun run dev up with DEV_SEED_ENABLED=true?`,
		);
		process.exit(1);
	}
	const counts = (await response.json()) as Record<string, number>;
	console.log("db:seed ok", JSON.stringify(counts));
} catch (error) {
	console.error(
		`db:seed: could not reach ${serverUrl}. Start the dev server with bun run dev.`,
		error instanceof Error ? error.message : error,
	);
	process.exit(1);
}
