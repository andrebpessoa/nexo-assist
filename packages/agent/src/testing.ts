import type { Database } from "@nexo-assist/db";
import { user } from "@nexo-assist/db/schema/index";
import type { TicketService } from "@nexo-assist/tickets";
import { applySeed } from "@nexo-assist/tickets/seed/apply";
import { buildSeed } from "@nexo-assist/tickets/seed/build";
import { createTicketService } from "@nexo-assist/tickets/service";
import { createTestDb } from "@nexo-assist/tickets/testing/db";

import { type AgentDeps, createAgent } from "./engine";
import { createProfileReader } from "./profile";
import type { Sleep } from "./retry";
import { createConversationStore } from "./store";
import type { Block } from "./types";
import type { Understander } from "./understand";
import {
	createScriptedUnderstander,
	type ScriptedTurn,
} from "./understand-scripted";

export const SEED_NOW = new Date("2026-10-28T10:00:00-03:00");

/** In-memory database with the seed applied; ids by e-mail prefix (`ana`, `bruno`, `rafael`). */
export async function seededDb(now: Date = SEED_NOW): Promise<{
	db: Database;
	ids: Record<string, string>;
}> {
	const db = await createTestDb();
	await applySeed(db, buildSeed(now));
	const users = await db.select({ id: user.id, email: user.email }).from(user);
	const ids = Object.fromEntries(
		users.map((u) => [u.email.split(".")[0] as string, u.id]),
	);
	return { db, ids };
}

export interface HarnessOptions {
	turns?: ScriptedTurn[];
	/** Wraps the real service, e.g. with `withSimulatedFailure`. */
	wrap?: (service: TicketService) => TicketService;
	/** The model deadline; defaults to one that never fires. */
	timer?: Sleep;
	now?: Date;
	/** A real model instead of the scripted one (`bun run eval --live`). */
	understander?: Understander;
	onStep?: AgentDeps["onStep"];
	log?: AgentDeps["log"];
	modelId?: string;
}

/** An agent over the seeded database with a scripted model, a fixed clock and instant waits. */
export async function agentHarness(options: HarnessOptions = {}) {
	const now = options.now ?? SEED_NOW;
	const { db, ids } = await seededDb(now);
	const clock = { now: () => now };
	const service = createTicketService({ db, clock });
	const tickets = options.wrap ? options.wrap(service) : service;
	const understander = createScriptedUnderstander(options.turns ?? []);
	const store = createConversationStore({ db, clock });
	const sleeps: number[] = [];
	let key = 0;
	const agent = createAgent({
		tickets,
		understander: options.understander ?? understander,
		store,
		profileOf: createProfileReader(db),
		clock,
		sleep: async (ms) => {
			sleeps.push(ms);
		},
		timer: options.timer ?? (() => new Promise<void>(() => {})),
		newKey: () => `key-${++key}`,
		onStep: options.onStep,
		log: options.log,
		modelId: options.modelId,
	});
	const ana = ids.ana as string;
	return { db, ids, ana, agent, understander, store, service, sleeps };
}

/** Text of every text block, joined; what the employee reads. */
export function said(blocks: Block[]): string {
	return blocks.flatMap((b) => (b.kind === "text" ? [b.text] : [])).join("\n");
}

/** Service and model calls; rule steps run in code are left out. */
export const toolNames = (
	d: { tools: { name: string; kind?: string }[] } | null,
) => (d?.tools ?? []).filter((t) => t.kind !== "rule").map((t) => t.name);
