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
const installDialog = readFileSync(
	new URL("../../components/plugin-install-dialog.tsx", import.meta.url),
	"utf8",
);
const navigationBridge = readFileSync(
	new URL("../../components/telegram-navigation-bridge.tsx", import.meta.url),
	"utf8",
);
const motionProvider = readFileSync(
	new URL("../../components/telegram-motion-provider.tsx", import.meta.url),
	"utf8",
);
const dialog = readFileSync(
	new URL("../../components/ui/dialog.tsx", import.meta.url),
	"utf8",
);
const searchDialog = readFileSync(
	new URL("../../components/search-dialog.tsx", import.meta.url),
	"utf8",
);
const styles = readFileSync(
	new URL("../../styles/globals.css", import.meta.url),
	"utf8",
);
const nextConfig = readFileSync(
	new URL("../../../next.config.js", import.meta.url),
	"utf8",
);
const speculationRules = JSON.parse(
	readFileSync(
		new URL("../../../public/speculation-rules.json", import.meta.url),
		"utf8",
	),
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

test("Telegram consumers share one SDK connection", () => {
	assert.match(telegramHook, /let telegramConnectionPromise:/);
	assert.match(telegramHook, /if \(telegramConnectionPromise\)/);
	assert.match(motionProvider, /useTelegramWebApp\(\)/);
	assert.doesNotMatch(motionProvider, /setInterval/);
});

test("Telegram vertical close gestures stay disabled while content scrolls", () => {
	assert.match(layout, /web_app_setup_swipe_behavior/);
	assert.match(layout, /allow_vertical_swipe:false/);
	assert.match(telegramHook, /candidate\.disableVerticalSwipes\?\.\(\)/);
	assert.doesNotMatch(telegramHook, /candidate\.enableVerticalSwipes\?\.\(\)/);
});

test("Telegram installation opens the bot natively and closes the Mini App", () => {
	assert.match(telegramHook, /openTelegramLink/);
	assert.match(installDialog, /webApp\.openTelegramLink\(botLink\)/);
	assert.match(installDialog, /webApp\.close\(\)/);
	assert.match(installDialog, /await onDownload\(\)/);
});

test("Telegram routes expose the native back button", () => {
	assert.match(telegramHook, /BackButton/);
	assert.match(navigationBridge, /backButton\.show\(\)/);
	assert.match(navigationBridge, /router\.back\(\)/);
});

test("Telegram Mini Apps avoid GPU-heavy compositing effects", () => {
	assert.match(styles, /background-image: none/);
	assert.match(styles, /box-shadow: none/);
	assert.match(styles, /filter: none/);
	assert.match(styles, /transition: none/);
});

test("mobile dialogs have an opaque surface and one optional drag handle", () => {
	assert.match(styles, /--popover: oklch\(1 0\.002 40\)/);
	assert.match(dialog, /handleOnly=\{false\}/);
	assert.match(dialog, /showHandle = true/);
	assert.match(dialog, /bg-black\/35/);
	assert.match(searchDialog, /showHandle=\{false\}/);
});

test("Cloudflare navigation speculation is disabled at the origin", () => {
	assert.match(nextConfig, /key: "Speculation-Rules"/);
	assert.match(nextConfig, /value: '"\/speculation-rules\.json"'/);
	assert.deepEqual(speculationRules, { prefetch: [], prerender: [] });
});
