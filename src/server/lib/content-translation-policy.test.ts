import assert from "node:assert/strict";
import test from "node:test";
import {
	ADMIN_TRANSLATION_BATCH_SIZE,
	BACKGROUND_TRANSLATION_BATCH_SIZE,
	ContentTranslationRateLimitError,
	entityTypesForTranslationScope,
	MAX_TRANSLATION_BATCH_SIZE,
	normalizeTranslationBatchSize,
	PIPELINE_TRANSLATION_BATCH_SIZE,
	translationRetryAt,
} from "./content-translation-policy";

test("translation scopes prioritize visible marketplace content", () => {
	assert.deepEqual(entityTypesForTranslationScope("plugins"), ["plugin"]);
	assert.deepEqual(entityTypesForTranslationScope("categories"), ["category"]);
	assert.deepEqual(entityTypesForTranslationScope("all"), [
		"plugin",
		"category",
		"collection",
		"version",
		"pipeline_check",
	]);
});

test("translation batch size stays within the configured spending boundary", () => {
	assert.equal(normalizeTranslationBatchSize(0), 1);
	assert.equal(normalizeTranslationBatchSize(5), 5);
	assert.equal(
		normalizeTranslationBatchSize(MAX_TRANSLATION_BATCH_SIZE + 10),
		MAX_TRANSLATION_BATCH_SIZE,
	);
});

test("translation request batches finish within their HTTP timeout budgets", () => {
	assert.equal(ADMIN_TRANSLATION_BATCH_SIZE, 1);
	assert.equal(BACKGROUND_TRANSLATION_BATCH_SIZE, 2);
	assert.equal(PIPELINE_TRANSLATION_BATCH_SIZE, 1);
	assert.equal(BACKGROUND_TRANSLATION_BATCH_SIZE * 6, 12);
});

test("rate-limited jobs wait for the exact budget reset", () => {
	assert.equal(translationRetryAt(1_000, 3_600), 3_600);
	assert.equal(translationRetryAt(1_000, 900), 1_060);
	const error = new ContentTranslationRateLimitError(3_600);
	assert.equal(error.message, "AI_TRANSLATION_RATE_LIMITED");
	assert.equal(error.resetAt, 3_600);
});
