import type { AppRouter } from "@nexo-assist/api/routers/index";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

import { ENV } from "../env.public";

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${ENV.VITE_SERVER_URL.replace(/\/$/, "")}/trpc`,
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: "include",
				});
			},
		}),
	],
});
