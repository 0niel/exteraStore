import assert from "node:assert/strict";
import test from "node:test";
import {
	buildFallbackPluginMetadata,
	normalizeDiscoveryTags,
} from "./plugin-metadata";

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

test("classifies sticker plugins and assigns useful tags", () => {
	const metadata = buildFallbackPluginMetadata(
		{
			name: "Recent Reactions",
			description: "Управление стикерами, эмодзи и недавними реакциями",
			shortDescription: "Быстрые реакции",
			category: "utility",
			tags: "[]",
		},
		new Set(["utility", "stickers"]),
	);

	assert.equal(metadata.category, "stickers");
	assert.deepEqual(metadata.tags.slice(0, 3), ["стикеры", "эмодзи", "реакции"]);
});

test("keeps a valid category when metadata has no strong signals", () => {
	const metadata = buildFallbackPluginMetadata(
		{
			name: "Example",
			description: "",
			shortDescription: "",
			category: "development",
			tags: "[]",
		},
		new Set(["utility", "development"]),
	);

	assert.equal(metadata.category, "development");
	assert.equal(metadata.tags.length, 3);
});

test("classifies TikTok image tools as media without inventing API support", () => {
	const metadata = buildFallbackPluginMetadata(
		{
			name: "tiktok frame",
			description: "создает рамку из тиктока",
			shortDescription: "рамка для сообщения",
			category: "fun",
			tags: "[]",
		},
		new Set(["media", "integrations", "fun"]),
	);

	assert.equal(metadata.category, "media");
	assert.equal(metadata.tags.includes("api"), false);
});
