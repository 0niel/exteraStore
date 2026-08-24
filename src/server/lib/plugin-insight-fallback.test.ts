import assert from "node:assert/strict";
import test from "node:test";
import { buildFallbackPluginInsight } from "./plugin-insight-fallback";
import { isRussianPluginInsight } from "./plugin-insight-locale";

test("builds a Russian fallback from technical requirements", () => {
	const insight = buildFallbackPluginInsight(
		{
			name: "Frame",
			category: "Оформление",
			description: "Создаёт рамку для сообщения.",
			shortDescription: null,
			requirements: JSON.stringify([
				"Android 5.0 or higher",
				"requires internet connection",
				"may not work with all devices",
			]),
			minExteraVersion: "11.0",
		},
		"ru",
	);

	assert.equal(isRussianPluginInsight(insight), true);
	assert.deepEqual(insight.requirements, [
		"exteraGram 11.0 или новее",
		"Android 5.0 или новее",
		"Требуется подключение к интернету",
		"Совместимость со всеми устройствами не гарантирована",
	]);
});

test("omits unknown English prose from the Russian fallback", () => {
	const insight = buildFallbackPluginInsight(
		{
			name: "Frame",
			category: "Оформление",
			description: "Creates a frame around a message.",
			shortDescription: null,
			requirements: JSON.stringify(["desktop edition with custom renderer"]),
			minExteraVersion: null,
		},
		"ru",
	);

	assert.deepEqual(insight.requirements, []);
	assert.equal(isRussianPluginInsight(insight), true);
	assert.equal(insight.summary.includes("Creates a frame"), false);
});
