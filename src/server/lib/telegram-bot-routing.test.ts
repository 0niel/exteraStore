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
