import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const router = readFileSync(
	new URL("../api/routers/developer-platform.ts", import.meta.url),
	"utf8",
);

test("every developer platform procedure requires authentication", () => {
	for (const procedure of [
		"listApiKeys",
		"createApiKey",
		"revokeApiKey",
		"listWebhooks",
		"createWebhook",
		"updateWebhook",
		"rotateWebhookSecret",
		"deleteWebhook",
		"testWebhook",
		"retryDelivery",
	]) {
		assert.match(router, new RegExp(`${procedure}: protectedProcedure`));
	}
});

test("developer resource limits are serialized per user", () => {
	assert.match(router, /pg_advisory_xact_lock/g);
	assert.match(router, /api-key:\$\{ctx\.session\.user\.id\}/);
	assert.match(router, /webhook:\$\{ctx\.session\.user\.id\}/);
});

test("public API routes enforce their documented scopes", () => {
	const routes = [
		["../../app/api/v1/me/route.ts", "profile:read"],
		["../../app/api/v1/plugins/route.ts", "plugins:read"],
		["../../app/api/v1/plugins/[slug]/route.ts", "plugins:read"],
		["../../app/api/v1/webhooks/route.ts", "webhooks:read"],
		["../../app/api/v1/webhooks/[id]/route.ts", "webhooks:write"],
	] as const;

	for (const [path, scope] of routes) {
		const source = readFileSync(new URL(path, import.meta.url), "utf8");
		assert.match(
			source,
			new RegExp(`authenticateApiKey\\(request, "${scope}"\\)`),
		);
	}
	const webhookCollection = readFileSync(
		new URL("../../app/api/v1/webhooks/route.ts", import.meta.url),
		"utf8",
	);
	assert.match(
		webhookCollection,
		/authenticateApiKey\(request, "webhooks:write"\)/,
	);
});
