import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync(
	new URL("../../app/layout.tsx", import.meta.url),
	"utf8",
);
const telegramHook = readFileSync(
	new URL("../../hooks/use-telegram-web-app.ts", import.meta.url),
	"utf8",
);

test("the Telegram SDK is not loaded globally", () => {
	assert.doesNotMatch(
		layout,
		/src=["']https:\/\/telegram\.org\/js\/telegram-web-app\.js/,
	);
	assert.match(telegramHook, /if \(!script && !isTelegramLaunch\(\)\)/);
	assert.match(
		telegramHook,
		/script\.src = "https:\/\/telegram\.org\/js\/telegram-web-app\.js"/,
	);
});
