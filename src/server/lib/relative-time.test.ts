import assert from "node:assert/strict";
import test from "node:test";
import { formatRelativeTime } from "~/lib/utils";

const now = new Date("2026-08-25T12:00:00.000Z");

test("relative time works without Intl.RelativeTimeFormat", () => {
	assert.equal(
		formatRelativeTime(new Date("2026-08-25T11:58:00.000Z"), now, "ru"),
		"2 минуты назад",
	);
	assert.equal(
		formatRelativeTime(new Date("2026-08-25T14:00:00.000Z"), now, "en"),
		"in 2 hours",
	);
});
