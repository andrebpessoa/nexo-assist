// Alchemy validates deployment inputs with Varlock; Workers use native env bindings.
import type { PublicCoercedEnvSchema } from "./env";

const serverUrl: string | undefined = import.meta.env.VITE_SERVER_URL;
if (!serverUrl)
	throw new Error(
		"VITE_SERVER_URL ausente: rode bun run setup (apps/web/.env).",
	);

export const ENV = {
	VITE_SERVER_URL: serverUrl,
} satisfies Pick<PublicCoercedEnvSchema, "VITE_SERVER_URL">;
