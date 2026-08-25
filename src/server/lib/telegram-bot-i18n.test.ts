import assert from "node:assert/strict";
import test from "node:test";
import {
	botText,
	pluginCountLabel,
	resolveTelegramBotLocale,
} from "./telegram-bot-i18n";

test("resolves Russian and English Telegram locales", () => {
	assert.equal(resolveTelegramBotLocale("ru"), "ru");
	assert.equal(resolveTelegramBotLocale("ru-RU"), "ru");
	assert.equal(resolveTelegramBotLocale("en"), "en");
	assert.equal(resolveTelegramBotLocale("de"), "en");
	assert.equal(resolveTelegramBotLocale(undefined), "en");
});

test("localizes bot text and plugin count forms", () => {
	assert.equal(botText("ru", "Назад", "Back"), "Назад");
	assert.equal(botText("en", "Назад", "Back"), "Back");
	assert.equal(pluginCountLabel(1, "ru"), "плагин");
	assert.equal(pluginCountLabel(3, "ru"), "плагина");
	assert.equal(pluginCountLabel(12, "ru"), "плагинов");
	assert.equal(pluginCountLabel(2, "en"), "plugins");
});
