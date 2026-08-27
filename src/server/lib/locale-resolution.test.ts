import assert from "node:assert/strict";
import test from "node:test";
import {
	resolveContentLocale,
	resolveLocaleFromAcceptLanguage,
} from "~/lib/locale-resolution";

test("locale resolution respects quality and regional language tags", () => {
	assert.equal(resolveLocaleFromAcceptLanguage("en;q=0.4, ru-RU;q=0.9"), "ru");
	assert.equal(resolveLocaleFromAcceptLanguage("en-US,en;q=0.8"), "en");
});

test("locale resolution uses English for unsupported or invalid input", () => {
	assert.equal(resolveLocaleFromAcceptLanguage("de-DE, fr;q=invalid"), "en");
	assert.equal(resolveLocaleFromAcceptLanguage(null), "en");
});

test("content locale uses explicit, cookie and language preferences in order", () => {
	assert.equal(
		resolveContentLocale({
			explicit: "ru",
			cookie: "NEXT_LOCALE=en",
			acceptLanguage: "en-US",
		}),
		"ru",
	);
	assert.equal(
		resolveContentLocale({
			cookie: "theme=dark; NEXT_LOCALE=ru",
			acceptLanguage: "en-US",
		}),
		"ru",
	);
	assert.equal(
		resolveContentLocale({ acceptLanguage: "ru;q=0.4, en;q=0.9" }),
		"en",
	);
});
