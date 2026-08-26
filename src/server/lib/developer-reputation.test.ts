import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateDeveloperScore,
	getDeveloperReputation,
} from "~/lib/developer-reputation";

test("developer reputation resolves every tier boundary", () => {
	const cases = [
		{ downloads: 0, expected: "rising" },
		{ downloads: 834, expected: "pro" },
		{ downloads: 3_334, expected: "expert" },
		{ downloads: 8_334, expected: "master" },
		{ downloads: 16_667, expected: "legend" },
	] as const;

	for (const item of cases) {
		const reputation = getDeveloperReputation({
			downloads: item.downloads,
			rating: 0,
			pluginCount: 0,
		});
		assert.equal(reputation.tier.key, item.expected);
	}
});

test("developer reputation reports progress and remaining score", () => {
	const reputation = getDeveloperReputation({
		downloads: 500,
		rating: 5,
		pluginCount: 2,
	});

	assert.equal(reputation.score, 500);
	assert.equal(reputation.tier.key, "pro");
	assert.equal(reputation.nextTier?.key, "expert");
	assert.equal(reputation.progress, 0);
	assert.equal(reputation.scoreNeeded, 1_500);
});

test("developer score normalizes invalid metrics", () => {
	assert.equal(
		calculateDeveloperScore({
			downloads: Number.NaN,
			rating: -5,
			pluginCount: Number.POSITIVE_INFINITY,
		}),
		0,
	);
});
