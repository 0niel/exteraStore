import assert from "node:assert/strict";
import test from "node:test";
import { getCategoryEmoji, isCategoryEmoji } from "../../lib/category-icon";

test("maps legacy category icon names to emoji", () => {
	assert.equal(getCategoryEmoji("palette", "ui"), "🎨");
	assert.equal(getCategoryEmoji("eye-off", "privacy"), "🕶️");
});

test("uses the category slug when a stored icon is invalid", () => {
	assert.equal(getCategoryEmoji("unknown-icon", "automation"), "⚡");
	assert.equal(getCategoryEmoji(null, "bots-automation"), "🤖");
});

test("preserves a valid emoji and rejects text labels", () => {
	assert.equal(getCategoryEmoji("🛠️", "tools"), "🛠️");
	assert.equal(isCategoryEmoji("🎨"), true);
	assert.equal(isCategoryEmoji("palette"), false);
	assert.equal(isCategoryEmoji("🎨 palette"), false);
});
