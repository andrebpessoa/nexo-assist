import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import "varlock/auto-load";

export const db = Cloudflare.D1.Database("database", {
	migrations: "../../packages/db/src/migrations",
});

export const server = Cloudflare.Worker("server", {
	main: "../../apps/server/src/index.ts",
	compatibility: {
		flags: ["nodejs_compat"],
	},
	env: {
		DB: db,
		CORS_ORIGIN: Config.String("CORS_ORIGIN"),
		BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
		BETTER_AUTH_URL: Cloudflare.Worker.URL,
		TICKETS_FAILURE_RATE: Config.String("TICKETS_FAILURE_RATE").pipe(
			Config.withDefault("0.1"),
		),
		TICKETS_EXTRA_LATENCY_MS: Config.String("TICKETS_EXTRA_LATENCY_MS").pipe(
			Config.withDefault("0"),
		),
		DEV_SEED_ENABLED: Config.String("DEV_SEED_ENABLED").pipe(
			Config.withDefault("false"),
		),
		// Optional: without it the agent says the model is unavailable (chat-funcionario D-06).
		GOOGLE_GENERATIVE_AI_API_KEY: Config.Redacted(
			"GOOGLE_GENERATIVE_AI_API_KEY",
		).pipe(Config.withDefault(Redacted.make(""))),
	},
	dev: {
		port: 3000,
	},
});

export type ServerEnv = Cloudflare.InferEnv<typeof server>;

export default Alchemy.Stack(
	"nexo-assist",
	{
		providers: Cloudflare.providers(),
		// `alchemy dev` sets ALCHEMY_DEV=true: local dev keeps its state in .alchemy/ and needs no
		// Cloudflare login; deploy and destroy keep the Cloudflare state store (AD-016).
		state:
			process.env.ALCHEMY_DEV === "true"
				? Alchemy.localState()
				: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const serverWorker = yield* server;
		const webWorker = yield* Cloudflare.Website.Vite("web", {
			rootDir: "../../apps/web",
			assets: {
				htmlHandling: "auto-trailing-slash",
				notFoundHandling: "single-page-application",
			},
			env: {
				VITE_SERVER_URL: serverWorker.url.as<string>(),
			},
			dev: {
				port: 3001,
			},
		});

		return {
			web: webWorker.url,
			server: serverWorker.url,
		};
	}),
);
