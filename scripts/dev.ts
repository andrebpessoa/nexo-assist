/**
 * `bun run dev`: starts the local stack (alchemy dev: D1 with migrations, server :3000, web :3001)
 * and, once the server answers, loads the Anexo B seed once (DLV-04). The seed is idempotent.
 */
const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:3000";

async function answers(fetch: typeof globalThis.fetch, url: string) {
	try {
		return (await fetch(`${url}/internal/health`)).ok;
	} catch {
		return false; // Not up yet.
	}
}

/** One POST: a seed that fails is reported, never retried as if the server were down. */
async function seedOnce(
	fetch: typeof globalThis.fetch,
	url: string,
	log: (line: string) => void,
): Promise<"seeded" | "seed_failed"> {
	try {
		const seed = await fetch(`${url}/internal/seed`, { method: "POST" });
		if (!seed.ok) {
			log(`dev: o seed respondeu ${seed.status}. Rode bun run db:seed.`);
			return "seed_failed";
		}
		log(`dev: seed ok ${JSON.stringify(await seed.json())}`);
		return "seeded";
	} catch (error) {
		log(
			`dev: o seed falhou (${error instanceof Error ? error.message : error}). Rode bun run db:seed.`,
		);
		return "seed_failed";
	}
}

export async function waitThenSeed({
	url,
	fetch = globalThis.fetch,
	attempts = 120,
	delayMs = 1000,
	log = console.log,
}: {
	url: string;
	fetch?: typeof globalThis.fetch;
	attempts?: number;
	delayMs?: number;
	log?: (line: string) => void;
}): Promise<"seeded" | "seed_failed" | "timeout"> {
	for (let i = 0; i < attempts; i++) {
		if (await answers(fetch, url)) return seedOnce(fetch, url, log);
		await Bun.sleep(delayMs);
	}
	log(
		`dev: o servidor não respondeu em ${url}; o seed não rodou. Com o servidor no ar, rode bun run db:seed.`,
	);
	return "timeout";
}

if (import.meta.main) {
	const stack = Bun.spawn(["bunx", "turbo", "run", "dev", "--ui=stream"], {
		stdio: ["inherit", "inherit", "inherit"],
	});
	const stop = () => stack.kill();
	process.on("SIGINT", stop);
	process.on("SIGTERM", stop);
	void waitThenSeed({ url: SERVER_URL });
	process.exit(await stack.exited);
}
