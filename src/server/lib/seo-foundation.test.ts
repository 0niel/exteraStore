import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { absoluteUrl, seoDescription } from "~/lib/site";

const sitemap = readFileSync(
	new URL("../../app/sitemap.ts", import.meta.url),
	"utf8",
);

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

test("the sitemap queries the production database at request time", () => {
	assert.match(sitemap, /export const dynamic = "force-dynamic"/);
	assert.doesNotMatch(sitemap, /export const revalidate/);
});
