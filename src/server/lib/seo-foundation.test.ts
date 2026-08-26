import assert from "node:assert/strict";
import test from "node:test";
import { absoluteUrl, seoDescription } from "~/lib/site";

test("SEO descriptions remove markup, links, and excess whitespace", () => {
	assert.equal(
		seoDescription("  **Плагин** <b>для Telegram</b> https://example.com  "),
		"Плагин для Telegram",
	);
});

test("SEO descriptions stay within their requested length", () => {
	const description = seoDescription("Очень длинное описание плагина", 18);
	assert.equal(description.length, 18);
	assert.match(description, /…$/);
});

test("site URLs resolve against the canonical origin", () => {
	assert.equal(
		absoluteUrl("/plugins/example"),
		"https://exterastore.app/plugins/example",
	);
});
