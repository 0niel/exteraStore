import assert from "node:assert/strict";
import test from "node:test";
import { isRussianPluginInsight } from "./plugin-insight-locale";

test("accepts a fully localized plugin insight", () => {
	assert.equal(
		isRussianPluginInsight({
			summary: "Создаёт изображение из сообщения в стиле TikTok.",
			bestFor: ["Тем, кто публикует оформленные цитаты"],
			requirements: ["Telegram 7.0 или новее"],
			caveats: ["Для работы требуется подключение к интернету"],
			privacyReason: "Обработка выполняется локально на устройстве.",
		}),
		true,
	);
});

test("rejects mixed-language plugin insight fields", () => {
	assert.equal(
		isRussianPluginInsight({
			summary: "Создаёт изображение из сообщения в стиле TikTok.",
			bestFor: ["social media"],
			requirements: ["Android 5.0 or higher"],
			caveats: ["requires internet connection"],
			privacyReason: "The plugin sends data to a server.",
		}),
		false,
	);
});
