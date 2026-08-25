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
		["../../app/api/v1/webhooks/[id]/test/route.ts", "webhooks:write"],
	] as const;

	for (const [path, scope] of routes) {
		const source = readFileSync(new URL(path, import.meta.url), "utf8");
		assert.match(
			source,
			new RegExp(`authorizeApiRequest\\(\\s*request,\\s*"${scope}"`),
		);
	}
	const webhookCollection = readFileSync(
		new URL("../../app/api/v1/webhooks/route.ts", import.meta.url),
		"utf8",
	);
	assert.match(
		webhookCollection,
		/authorizeApiRequest\(request, "webhooks:write"\)/,
	);
	const keyCheck = readFileSync(
		new URL("../../app/api/v1/key/route.ts", import.meta.url),
		"utf8",
	);
	assert.match(keyCheck, /authorizeApiRequest\(request\)/);
});

test("REST API and webhook tests use persistent atomic limits", () => {
	const platform = readFileSync(
		new URL("developer-platform.ts", import.meta.url),
		"utf8",
	);
	const limiter = readFileSync(
		new URL("developer-rate-limiter.ts", import.meta.url),
		"utf8",
	);
	assert.match(platform, /limit: 120/);
	assert.match(platform, /limit: 600/);
	assert.match(router, /scope: `webhook-test:\$\{hook\.id\}`/);
	assert.match(router, /limit: 5/);
	assert.match(limiter, /onConflictDoUpdate/);
	assert.match(limiter, /requestCount} \+ 1/);
	assert.match(limiter, /setWhere:/);
});

test("webhook test payloads are bounded and limited to subscribed events", () => {
	assert.match(router, /subscribedEvents\.includes\(input\.event\)/);
	assert.match(router, /Buffer\.byteLength\(JSON\.stringify\(input\.data\)/);
	assert.match(router, /> 16_384/);
});
