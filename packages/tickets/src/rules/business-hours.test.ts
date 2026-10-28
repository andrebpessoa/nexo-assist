import { describe, expect, test } from "bun:test";

import { addBusinessMinutes, businessMinutesBetween } from "./business-hours";

// America/Sao_Paulo is UTC-3 all year (no DST since 2019).
const sp = (local: string) => new Date(`${local}-03:00`);

describe("addBusinessMinutes", () => {
	test("friday 16:00 plus 4 business hours is monday 10:00", () => {
		expect(addBusinessMinutes(sp("2026-10-30T16:00:00"), 240)).toEqual(
			sp("2026-11-02T10:00:00"),
		);
	});

	test("monday 09:00 plus 3 business days is thursday 09:00", () => {
		expect(addBusinessMinutes(sp("2026-10-26T09:00:00"), 1800)).toEqual(
			sp("2026-10-29T09:00:00"),
		);
	});

	test("start after hours counts from 08:00 of the next business day", () => {
		expect(addBusinessMinutes(sp("2026-10-27T20:00:00"), 60)).toEqual(
			sp("2026-10-28T09:00:00"),
		);
	});

	test("start before 08:00 counts from 08:00 the same day", () => {
		expect(addBusinessMinutes(sp("2026-10-27T06:30:00"), 30)).toEqual(
			sp("2026-10-27T08:30:00"),
		);
	});

	test("start on the weekend counts from monday 08:00", () => {
		expect(addBusinessMinutes(sp("2026-10-31T11:00:00"), 120)).toEqual(
			sp("2026-11-02T10:00:00"),
		);
	});

	test("clock stops at 18:00 and resumes at 08:00", () => {
		expect(addBusinessMinutes(sp("2026-10-27T17:30:00"), 60)).toEqual(
			sp("2026-10-28T08:30:00"),
		);
	});

	test("ending exactly at 18:00 stays on the same day", () => {
		expect(addBusinessMinutes(sp("2026-10-27T16:00:00"), 120)).toEqual(
			sp("2026-10-27T18:00:00"),
		);
	});

	test("uses the Sao Paulo weekday when the UTC date already turned", () => {
		// Friday 22:00 in Sao Paulo is Saturday 01:00 UTC.
		expect(addBusinessMinutes(sp("2026-10-30T22:00:00"), 60)).toEqual(
			sp("2026-11-02T09:00:00"),
		);
		// Monday 21:30 in Sao Paulo is Tuesday 00:30 UTC; the next business day is Tuesday.
		expect(addBusinessMinutes(sp("2026-10-26T21:30:00"), 30)).toEqual(
			sp("2026-10-27T08:30:00"),
		);
	});

	test("zero minutes inside business hours keeps the start", () => {
		expect(addBusinessMinutes(sp("2026-10-27T10:15:00"), 0)).toEqual(
			sp("2026-10-27T10:15:00"),
		);
	});
});

describe("businessMinutesBetween", () => {
	test("counts minutes inside the same business day", () => {
		expect(
			businessMinutesBetween(
				sp("2026-10-27T09:00:00"),
				sp("2026-10-27T11:30:00"),
			),
		).toBe(150);
	});

	test("skips nights and weekends", () => {
		expect(
			businessMinutesBetween(
				sp("2026-10-30T17:00:00"),
				sp("2026-11-02T09:00:00"),
			),
		).toBe(120);
	});

	test("is zero when the end is not after the start", () => {
		expect(
			businessMinutesBetween(
				sp("2026-10-27T11:00:00"),
				sp("2026-10-27T09:00:00"),
			),
		).toBe(0);
	});

	test("is the inverse of addBusinessMinutes", () => {
		const start = sp("2026-10-26T09:00:00");
		expect(businessMinutesBetween(start, addBusinessMinutes(start, 1800))).toBe(
			1800,
		);
	});
});
