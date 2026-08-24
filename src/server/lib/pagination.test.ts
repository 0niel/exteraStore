import assert from "node:assert/strict";
import test from "node:test";
import { getPaginationItems } from "~/lib/pagination";

test("shows every page for short catalogs", () => {
	assert.deepEqual(getPaginationItems(2, 5), [1, 2, 3, 4, 5]);
});

test("keeps the first pages visible near the start", () => {
	assert.deepEqual(getPaginationItems(2, 12), [1, 2, 3, 4, "ellipsis-end", 12]);
});

test("shows both gaps around a middle page", () => {
	assert.deepEqual(getPaginationItems(6, 12), [
		1,
		"ellipsis-start",
		5,
		6,
		7,
		"ellipsis-end",
		12,
	]);
});

test("keeps the last pages visible near the end", () => {
	assert.deepEqual(getPaginationItems(11, 12), [
		1,
		"ellipsis-start",
		9,
		10,
		11,
		12,
	]);
});

test("normalizes out of range inputs", () => {
	assert.deepEqual(getPaginationItems(0, 3), [1, 2, 3]);
	assert.deepEqual(getPaginationItems(99, 3), [1, 2, 3]);
});
