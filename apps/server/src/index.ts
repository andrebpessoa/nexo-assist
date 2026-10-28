import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "@nexo-assist/api/routers/index";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { createChatRoutes } from "./chat";
import { createChatResolver } from "./chat-agent";
import { createConsoleRoutes } from "./console";
import { createConsoleResolver } from "./console-access";
import { createContext } from "./context";
import { createDevRoutes } from "./dev-seed";
import { ENV } from "./env.server";
import { createAuth, getDb } from "./services";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: ENV.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", async (c) =>
	(await createAuth()).handler(c.req.raw),
);

app.use(
	"/trpc/*",
	trpcServer({
		endpoint: "/trpc",
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.route(
	"/",
	createChatRoutes({
		resolve: createChatResolver({
			getDb,
			getSession: async (db, headers) =>
				(await createAuth(db)).api.getSession({ headers }),
			env: ENV,
		}),
	}),
);

app.route(
	"/",
	createConsoleRoutes({
		resolve: createConsoleResolver({
			getDb,
			getSession: async (db, headers) =>
				(await createAuth(db)).api.getSession({ headers }),
			env: ENV,
		}),
	}),
);

// Local dev only: every route is 404 unless DEV_SEED_ENABLED=true (TKT-28, TKT-33).
app.route(
	"/",
	createDevRoutes({
		enabled: ENV.DEV_SEED_ENABLED === "true",
		getDb,
		env: ENV,
	}),
);

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
