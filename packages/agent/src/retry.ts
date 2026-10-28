import type { Result } from "@nexo-assist/tickets";

export type Sleep = (ms: number) => Promise<void>;
export const realSleep: Sleep = (ms) =>
	new Promise((resolve) => setTimeout(resolve, ms));

/** Waits before the 2nd, 3rd and 4th attempt when the ticket service is unavailable (AGT-43). */
export const TICKET_RETRY_DELAYS = [500, 1000, 2000] as const;
export const MODEL_TIMEOUT_MS = 30_000;
export const DEFAULT_RETRY_AFTER_MS = 2000;

/**
 * Retries only SERVICE_UNAVAILABLE. The caller closes over the same idempotency key, so a write
 * that did land is not repeated by the service.
 */
export async function withTicketRetry<T>(
	call: () => Promise<Result<T>>,
	sleep: Sleep,
): Promise<{ result: Result<T>; attempts: number }> {
	let result = await call();
	let attempts = 1;
	for (const delay of TICKET_RETRY_DELAYS) {
		if (result.ok || result.error.code !== "SERVICE_UNAVAILABLE") break;
		await sleep(delay);
		result = await call();
		attempts++;
	}
	return { result, attempts };
}

export type ModelOutcome<T> =
	| { ok: true; value: T; attempts: number }
	| {
			ok: false;
			reason: "rate_limited" | "failed" | "timeout";
			attempts: number;
	  };

interface ProviderError {
	statusCode?: number;
	status?: number;
	responseHeaders?: Record<string, string>;
}

function rateLimitWait(error: unknown): number | null {
	if (!error || typeof error !== "object") return null;
	const e = error as ProviderError;
	if ((e.statusCode ?? e.status) !== 429) return null;
	const seconds = Number(e.responseHeaders?.["retry-after"]);
	return Number.isFinite(seconds) && seconds > 0
		? seconds * 1000
		: DEFAULT_RETRY_AFTER_MS;
}

const TIMED_OUT = Symbol("timeout");

/**
 * One model call within 30 s: a 429 waits what the provider asks (2 s by default) and tries once
 * more; any other error or the deadline ends the turn without an action (AGT-44, AGT-47).
 */
export async function withModelLimits<T>(
	call: () => Promise<T>,
	opts: { sleep: Sleep; timer?: Sleep },
): Promise<ModelOutcome<T>> {
	const timer = opts.timer ?? realSleep;
	const deadline = timer(MODEL_TIMEOUT_MS).then(
		(): typeof TIMED_OUT => TIMED_OUT,
	);
	let attempts = 0;
	const run = async (): Promise<ModelOutcome<T>> => {
		for (;;) {
			attempts++;
			try {
				return { ok: true, value: await call(), attempts };
			} catch (error) {
				const wait = rateLimitWait(error);
				if (wait === null) return { ok: false, reason: "failed", attempts };
				if (attempts > 1)
					return { ok: false, reason: "rate_limited", attempts };
				await opts.sleep(wait);
			}
		}
	};
	const outcome = await Promise.race([run(), deadline]);
	if (outcome === TIMED_OUT) return { ok: false, reason: "timeout", attempts };
	return outcome;
}
