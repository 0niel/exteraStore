import assert from "node:assert/strict";
import test from "node:test";
import {
	entityTypesForTranslationScope,
	MAX_TRANSLATION_BATCH_SIZE,
	normalizeTranslationBatchSize,
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
