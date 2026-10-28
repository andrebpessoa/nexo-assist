export const TIME_ZONE = "America/Sao_Paulo";
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 18;

const MINUTE = 60_000;

const formatter = new Intl.DateTimeFormat("en-US", {
	timeZone: TIME_ZONE,
	hourCycle: "h23",
	year: "numeric",
	month: "numeric",
	day: "numeric",
	hour: "numeric",
	minute: "numeric",
	second: "numeric",
	weekday: "short",
});

const WEEKDAYS: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6,
};

interface LocalTime {
	year: number;
	month: number;
	day: number;
	weekday: number;
	/** Minutes since local midnight, with seconds as a fraction. */
	minuteOfDay: number;
}

function localTime(instant: Date): LocalTime {
	const parts = Object.fromEntries(
		formatter.formatToParts(instant).map((part) => [part.type, part.value]),
	);
	const number = (type: string) => Number(parts[type]);
	return {
		year: number("year"),
		month: number("month"),
		day: number("day"),
		weekday: WEEKDAYS[parts.weekday ?? ""] ?? 0,
		minuteOfDay: number("hour") * 60 + number("minute") + number("second") / 60,
	};
}

function offsetMs(instant: Date): number {
	const local = localTime(instant);
	const asUtc =
		Date.UTC(local.year, local.month - 1, local.day) +
		local.minuteOfDay * MINUTE;
	return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Instant of a wall-clock time in Sao Paulo on the local date `daysAhead` after `from`. */
function atLocal(from: Date, daysAhead: number, hour: number): Date {
	const local = localTime(from);
	const guess = Date.UTC(
		local.year,
		local.month - 1,
		local.day + daysAhead,
		hour,
	);
	const first = guess - offsetMs(new Date(guess));
	return new Date(guess - offsetMs(new Date(first)));
}

function isBusinessDay(weekday: number): boolean {
	return weekday >= 1 && weekday <= 5;
}

/** Moves `instant` to the next moment inside business hours (itself, if already inside). */
function nextBusinessMoment(instant: Date): Date {
	let current = instant;
	for (;;) {
		const local = localTime(current);
		if (isBusinessDay(local.weekday)) {
			if (local.minuteOfDay < DAY_START_HOUR * 60)
				return atLocal(current, 0, DAY_START_HOUR);
			if (local.minuteOfDay < DAY_END_HOUR * 60) return current;
		}
		current = atLocal(current, 1, DAY_START_HOUR);
	}
}

/** Adds business minutes (Mon-Fri, 08:00-18:00 in America/Sao_Paulo, no holidays) to `start`. */
export function addBusinessMinutes(start: Date, minutes: number): Date {
	let current = nextBusinessMoment(start);
	let remaining = minutes;
	while (remaining > 0) {
		const available = DAY_END_HOUR * 60 - localTime(current).minuteOfDay;
		const step = Math.min(remaining, available);
		current = new Date(current.getTime() + step * MINUTE);
		remaining -= step;
		if (remaining > 0) current = nextBusinessMoment(current);
	}
	return current;
}

/** Business minutes in [start, end), rounded down. Zero when `end` is not after `start`. */
export function businessMinutesBetween(start: Date, end: Date): number {
	let total = 0;
	let current = nextBusinessMoment(start);
	while (current < end) {
		const dayEnd = new Date(
			current.getTime() +
				(DAY_END_HOUR * 60 - localTime(current).minuteOfDay) * MINUTE,
		);
		const segmentEnd = dayEnd < end ? dayEnd : end;
		total += (segmentEnd.getTime() - current.getTime()) / MINUTE;
		current = nextBusinessMoment(dayEnd);
	}
	return Math.floor(total);
}
