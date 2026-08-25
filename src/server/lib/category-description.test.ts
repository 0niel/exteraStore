import assert from "node:assert/strict";
import test from "node:test";
import { getCategoryDescriptionKey } from "~/lib/category-description";

test("legacy category slugs resolve to useful localized description keys", () => {
	assert.equal(getCategoryDescriptionKey("tools"), "legacy_tools_description");
	assert.equal(getCategoryDescriptionKey("fun"), "legacy_fun_description");
	assert.equal(
		getCategoryDescriptionKey("bots-automation"),
		"legacy_bots_automation_description",
	);
});

test("categories with database descriptions do not receive a legacy key", () => {
	assert.equal(getCategoryDescriptionKey("security"), null);
});
