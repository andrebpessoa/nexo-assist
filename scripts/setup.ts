/**
 * `bun run setup`: creates apps/server/.env and apps/web/.env from their .env.example,
 * never overwriting an existing .env, and fills BETTER_AUTH_SECRET with a random value (DLV-04).
 */
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const APPS = ["apps/server", "apps/web"] as const;

const secret = () => randomBytes(36).toString("base64url");

export function setup({ root }: { root: string }) {
	const created: string[] = [];
	const kept: string[] = [];
	for (const app of APPS) {
		const env = join(root, app, ".env");
		if (existsSync(env)) {
			kept.push(app);
			continue;
		}
		copyFileSync(join(root, app, ".env.example"), env);
		const text = readFileSync(env, "utf8");
		// An empty secret may be written as `=`, `=""` or `= `, with LF or CRLF.
		const filled = text.replace(
			/^BETTER_AUTH_SECRET=[ \t]*(?:""|'')?[ \t]*(\r?)$/m,
			(_, cr: string) => `BETTER_AUTH_SECRET=${secret()}${cr}`,
		);
		writeFileSync(env, filled);
		created.push(app);
	}
	return { created, kept };
}

if (import.meta.main) {
	const { created, kept } = setup({ root: join(import.meta.dir, "..") });
	for (const app of created) console.log(`setup: criado ${app}/.env`);
	for (const app of kept) console.log(`setup: ${app}/.env já existe, mantido`);
	console.log("setup: pronto. Próximo passo: bun run dev");
}
