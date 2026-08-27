import assert from "node:assert/strict";
import test from "node:test";
import { isTranslationLanguageValid } from "./content-translation-quality";

test("rejects unchanged Russian content stored as English", () => {
	assert.equal(
		isTranslationLanguageValid({
			source: "Плагин добавляет быстрые ответы в Telegram",
			translated: "Плагин добавляет быстрые ответы в Telegram",
			targetLocale: "en",
		}),
		false,
	);
});

test("rejects text written in the wrong target alphabet", () => {
	assert.equal(
		isTranslationLanguageValid({
			source: "Плагин добавляет быстрые ответы в Telegram",
			translated: "Плагин всё ещё написан по-русски",
			targetLocale: "en",
		}),
		false,
	);
	assert.equal(
		isTranslationLanguageValid({
			source: "Adds quick replies to Telegram chats",
			translated: "Still written in English",
			targetLocale: "ru",
		}),
		false,
	);
});

test("accepts translated text while preserving technical identifiers", () => {
	assert.equal(
		isTranslationLanguageValid({
			source: "Плагин добавляет NLP-парсинг дат в exteraGram",
			translated: "Adds NLP date parsing to exteraGram",
			targetLocale: "en",
		}),
		true,
	);
	assert.equal(
		isTranslationLanguageValid({
			source: "Adds NLP date parsing to exteraGram",
			translated: "Добавляет NLP-парсинг дат в exteraGram",
			targetLocale: "ru",
		}),
		true,
	);
});

test("allows language-neutral identifiers", () => {
	assert.equal(
		isTranslationLanguageValid({
			source: "NLP API v2",
			translated: "NLP API v2",
			targetLocale: "ru",
		}),
		true,
	);
});
