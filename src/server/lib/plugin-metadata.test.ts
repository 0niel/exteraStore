import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDiscoveryTags } from "./plugin-metadata";

test("normalizes, deduplicates and limits discovery tags", () => {
	assert.deepEqual(
		normalizeDiscoveryTags([
			" #Безопасность ",
			"Безопасность",
			"Social Media",
			"image++tools",
			"--telegram--",
			"a",
			"analytics",
			"privacy",
			"automation",
		]),
		[
			"безопасность",
			"social-media",
			"imagetools",
			"telegram",
			"analytics",
			"privacy",
		],
	);
});

test("drops empty and oversized tags", () => {
	assert.deepEqual(
		normalizeDiscoveryTags(["#", " ", "x".repeat(41), "  useful  "]),
		["useful"],
	);
});
