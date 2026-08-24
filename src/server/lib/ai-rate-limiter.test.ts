import assert from "node:assert/strict";
import test from "node:test";
import {
	AI_FEATURE_LIMITS,
	getAiRateLimitRules,
	getWindowStart,
} from "./ai-rate-limit-policy";

test("AI rate limit windows are aligned across application instances", () => {
	const now = Math.floor(
		new Date("2026-08-25T12:34:56.000Z").getTime() / 1_000,
	);

	assert.equal(getWindowStart(now, 3_600), 1_787_659_200);
	assert.equal(getWindowStart(now, 86_400), 1_787_616_000);
});

test("every AI feature receives global and feature limits", () => {
	for (const feature of Object.keys(AI_FEATURE_LIMITS) as Array<
		keyof typeof AI_FEATURE_LIMITS
	>) {
		const rules = getAiRateLimitRules(feature);
		assert.deepEqual(
			rules.map((rule) => rule.scope),
			[
				"application:hour",
				"application:day",
				"caller:hour",
				"caller:day",
				`${feature}:hour`,
				`${feature}:day`,
			],
		);
		assert.ok(rules.every((rule) => rule.limit > 0));
	}
});

test("expensive pipeline and collection operations have strict budgets", () => {
	assert.deepEqual(AI_FEATURE_LIMITS.pipeline_checks, {
		hourly: 4,
		daily: 10,
	});
	assert.deepEqual(AI_FEATURE_LIMITS.collections, {
		hourly: 12,
		daily: 24,
	});
});
