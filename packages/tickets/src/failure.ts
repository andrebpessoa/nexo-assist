import { fail, type TicketService } from "./types";

export interface SimulatedFailureOptions {
	/** Fraction of calls that fail, from 0 (never) to 1 (always); `TICKETS_FAILURE_RATE`. */
	rate: number;
	/** Delay added to every call; `TICKETS_EXTRA_LATENCY_MS`. */
	extraLatencyMs?: number;
	random?: () => number;
	sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Makes the service behave like the flaky legacy system: a share of calls answer
 * SERVICE_UNAVAILABLE before reaching the real service, so nothing is read or written (TKT-25, TKT-26).
 */
export function withSimulatedFailure(
	service: TicketService,
	options: SimulatedFailureOptions,
): TicketService {
	const {
		rate,
		extraLatencyMs = 0,
		random = Math.random,
		sleep = defaultSleep,
	} = options;

	const wrap =
		<A extends unknown[], R>(call: (...args: A) => Promise<R>) =>
		async (...args: A): Promise<R> => {
			if (extraLatencyMs > 0) await sleep(extraLatencyMs);
			if (random() < rate) {
				return fail(
					"SERVICE_UNAVAILABLE",
					"O sistema de chamados está fora do ar. Tente de novo em instantes.",
				) as R;
			}
			return call(...args);
		};

	return {
		list: wrap(service.list.bind(service)),
		get: wrap(service.get.bind(service)),
		create: wrap(service.create.bind(service)),
		addNote: wrap(service.addNote.bind(service)),
		reopen: wrap(service.reopen.bind(service)),
		transfer: wrap(service.transfer.bind(service)),
		assume: wrap(service.assume.bind(service)),
		searchArticles: wrap(service.searchArticles.bind(service)),
	};
}
