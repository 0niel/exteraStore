import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routerSource = readFileSync(
	new URL("../api/routers/translations.ts", import.meta.url),
	"utf8",
);

test("bulk translation starts processing the selected content immediately", () => {
	assert.match(routerSource, /processContentTranslationQueue/);
	assert.match(routerSource, /entityTypesForTranslationScope\(input\.entity\)/);
	assert.match(routerSource, /ADMIN_TRANSLATION_BATCH_SIZE/);
	assert.match(routerSource, /return \{ \.\.\.enqueued, processed \}/);
});
