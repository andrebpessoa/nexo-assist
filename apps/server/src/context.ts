import {
	type Context as ApiContext,
	buildContext,
} from "@nexo-assist/api/context";
import type { Context as HonoContext } from "hono";
import { createAuth, getDb } from "./services";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext({
	context,
}: CreateContextOptions): Promise<ApiContext> {
	const db = await getDb();
	const session = await (await createAuth(db)).api.getSession({
		headers: context.req.raw.headers,
	});
	return buildContext({ db, session });
}
