import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const botSource = readFileSync(
	new URL("./telegram-bot.ts", import.meta.url),
	"utf8",
);
const apiRoot = readFileSync(
	new URL("../api/root.ts", import.meta.url),
	"utf8",
);
const workerSource = readFileSync(
	new URL("../../app/api/ai-worker/route.ts", import.meta.url),
	"utf8",
);

test("Telegram responses derive locale from the sender language", () => {
	assert.match(botSource, /callbackQuery\.from\.language_code/);
	assert.match(botSource, /message\.from\.language_code/);
	assert.match(botSource, /resolveTelegramBotLocale/);
	assert.match(botSource, /botText\(locale/);
});

test("the spoofable legacy Telegram tRPC router is not exposed", () => {
	assert.doesNotMatch(apiRoot, /telegramBotRouter/);
	assert.doesNotMatch(apiRoot, /telegramBot:/);
});

test("Telegram bot localizes dynamic marketplace content", () => {
	assert.match(botSource, /localizePluginRows/);
	assert.match(botSource, /localizeCategoryRows/);
	assert.match(
		botSource,
		/getPluginInstallPlan\(db, plugin\[0\]\.id, locale\)/,
	);
	assert.match(botSource, /eq\(pluginTranslations\.locale, locale\)/);
});

test("AI worker backfills all translations and preserves source language", () => {
	assert.match(workerSource, /processTranslations\(\s*"all"/);
	assert.match(workerSource, /contentLocale: locale/);
	assert.match(workerSource, /targetLocale: targetLocale\(locale\)/);
	assert.doesNotMatch(workerSource, /locale: "ru"/);
});

test("AI worker can prioritize translations for requested plugins", () => {
	assert.match(workerSource, /pluginIds: z\.array/);
	assert.match(workerSource, /enqueuePluginTranslations\(db, pluginIds\)/);
	assert.match(workerSource, /body\.pluginIds/);
});
