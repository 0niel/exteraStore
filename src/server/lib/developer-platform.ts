import "server-only";

import crypto from "node:crypto";
import { lookup } from "node:dns/promises";
import https from "node:https";
import { isIP } from "node:net";
import { and, eq } from "drizzle-orm";
import { env } from "~/env";
import { safeJsonParse } from "~/lib/utils";
import { type Database, db } from "~/server/db";
import {
	apiKeys,
	apiKeyUsage,
	users,
	webhookDeliveries,
	webhooks,
} from "~/server/db/schema";
import { consumeDeveloperRateLimits } from "~/server/lib/developer-rate-limiter";

export const API_SCOPES = [
	"plugins:read",
	"profile:read",
	"webhooks:read",
	"webhooks:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export const WEBHOOK_EVENTS = [
	"plugin.created",
	"plugin.approved",
	"plugin.rejected",
	"plugin.updated",
	"security.completed",
	"review.created",
	"download.recorded",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const now = () => Math.floor(Date.now() / 1000);

export function createApiKeyValue() {
	const prefix = crypto.randomBytes(6).toString("hex");
	const secret = crypto.randomBytes(32).toString("base64url");
	const value = `ext_live_${prefix}_${secret}`;
	return { prefix: `ext_live_${prefix}`, value, hash: hashSecret(value) };
}

export function createWebhookSecret() {
	return `whsec_${crypto.randomBytes(32).toString("base64url")}`;
}

export function hashSecret(value: string) {
	return crypto.createHash("sha256").update(value).digest("hex");
}

function encryptionKey() {
	const source = env.NEXTAUTH_SECRET;
	if (!source) {
		throw new Error("Developer platform secret is unavailable");
	}
	return crypto.createHash("sha256").update(source).digest();
}

export function encryptWebhookSecret(value: string) {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
	const ciphertext = Buffer.concat([
		cipher.update(value, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return [iv, tag, ciphertext]
		.map((part) => part.toString("base64url"))
		.join(".");
}

function decryptWebhookSecret(value: string) {
	const [ivEncoded, tagEncoded, ciphertextEncoded] = value.split(".");
	if (!ivEncoded || !tagEncoded || !ciphertextEncoded) {
		throw new Error("Invalid webhook secret");
	}
	const decipher = crypto.createDecipheriv(
		"aes-256-gcm",
		encryptionKey(),
		Buffer.from(ivEncoded, "base64url"),
	);
	decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
	return Buffer.concat([
		decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
		decipher.final(),
	]).toString("utf8");
}

function isPrivateAddress(address: string) {
	if (address === "::" || address === "::1" || address === "0:0:0:0:0:0:0:1")
		return true;
	if (address.startsWith("fc") || address.startsWith("fd")) return true;
	if (address.startsWith("fe80:")) return true;
	if (address.startsWith("ff") || address.startsWith("2001:db8:")) return true;
	if (address.startsWith("::ffff:")) {
		return isPrivateAddress(address.slice(7));
	}
	if (isIP(address) !== 4) return false;
	const parts = address.split(".").map(Number);
	const [a = 0, b = 0] = parts;
	return (
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 100 && b >= 64 && b <= 127) ||
		(a === 192 && b === 0) ||
		(a === 198 && (b === 18 || b === 19)) ||
		(a === 198 && b === 51 && parts[2] === 100) ||
		(a === 203 && b === 0 && parts[2] === 113) ||
		a >= 224
	);
}

async function resolveWebhookUrl(value: string) {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error("Некорректный URL вебхука");
	}
	if (url.protocol !== "https:") {
		throw new Error("Вебхук должен использовать HTTPS");
	}
	if (url.username || url.password) {
		throw new Error("URL вебхука не должен содержать учётные данные");
	}
	const hostname = url.hostname.toLowerCase();
	if (
		hostname === "localhost" ||
		hostname.endsWith(".localhost") ||
		hostname.endsWith(".local")
	) {
		throw new Error("Локальные адреса для вебхуков запрещены");
	}
	const addresses = isIP(hostname)
		? [{ address: hostname, family: isIP(hostname) }]
		: await lookup(hostname, { all: true, verbatim: true });
	if (
		addresses.length === 0 ||
		addresses.some(({ address }) => isPrivateAddress(address))
	) {
		throw new Error("Вебхук должен вести на публичный адрес");
	}
	const address = addresses[0];
	if (!address) throw new Error("Не удалось разрешить адрес вебхука");
	return { url, address };
}

export async function validateWebhookUrl(value: string) {
	return (await resolveWebhookUrl(value)).url.toString();
}

export async function authorizeApiRequest(
	request: Request,
	scope?: ApiScope,
	responseHeaders?: HeadersInit,
) {
	const errorResponse = (
		status: number,
		error: string,
		message: string,
		extraHeaders?: Record<string, string>,
	) => {
		const headers = new Headers(responseHeaders);
		for (const [key, value] of Object.entries(extraHeaders || {})) {
			headers.set(key, value);
		}
		return Response.json({ error, message }, { status, headers });
	};
	const authorization = request.headers.get("authorization") ?? "";
	const token = authorization.startsWith("Bearer ")
		? authorization.slice(7).trim()
		: "";
	if (!token.startsWith("ext_live_") || token.length > 160) {
		return {
			ok: false as const,
			response: errorResponse(
				401,
				"invalid_api_key",
				"API-ключ отсутствует или недействителен",
			),
		};
	}

	const [record] = await db
		.select({
			id: apiKeys.id,
			userId: apiKeys.userId,
			scopes: apiKeys.scopes,
			expiresAt: apiKeys.expiresAt,
			revokedAt: apiKeys.revokedAt,
			isBanned: users.isBanned,
		})
		.from(apiKeys)
		.innerJoin(users, eq(apiKeys.userId, users.id))
		.where(eq(apiKeys.secretHash, hashSecret(token)))
		.limit(1);
	if (
		!record ||
		record.revokedAt ||
		record.isBanned ||
		(record.expiresAt !== null && record.expiresAt <= now())
	) {
		return {
			ok: false as const,
			response: errorResponse(
				401,
				"invalid_api_key",
				"API-ключ отозван, истёк или недействителен",
			),
		};
	}
	const scopes = safeJsonParse<ApiScope[]>(record.scopes, []);
	if (scope && !scopes.includes(scope)) {
		return {
			ok: false as const,
			response: errorResponse(
				403,
				"insufficient_scope",
				`Для запроса требуется scope ${scope}`,
			),
		};
	}

	const rateLimit = await consumeDeveloperRateLimits(db, [
		{
			subjectKey: `api-key:${record.id}`,
			scope: "rest-api",
			limit: 120,
			windowSeconds: 60,
		},
		{
			subjectKey: `user:${record.userId}`,
			scope: "rest-api",
			limit: 600,
			windowSeconds: 60,
		},
	]);
	if (rateLimit.limited) {
		const retryAfter = Math.max(1, rateLimit.resetAt - now());
		return {
			ok: false as const,
			response: errorResponse(
				429,
				"rate_limit_exceeded",
				"Слишком много запросов. Повторите позже",
				{
					"retry-after": String(retryAfter),
					"x-ratelimit-limit": "120",
					"x-ratelimit-remaining": "0",
					"x-ratelimit-reset": String(rateLimit.resetAt),
				},
			),
		};
	}

	const forwarded = request.headers
		.get("x-forwarded-for")
		?.split(",")[0]
		?.trim();
	const ip = forwarded || request.headers.get("x-real-ip") || "";
	await db
		.update(apiKeys)
		.set({ lastUsedAt: now(), lastIpHash: ip ? hashSecret(ip) : null })
		.where(eq(apiKeys.id, record.id));
	const successHeaders = new Headers(responseHeaders);
	successHeaders.set("x-ratelimit-limit", "120");
	successHeaders.set("x-ratelimit-remaining", String(rateLimit.remaining));
	successHeaders.set("x-ratelimit-reset", String(rateLimit.resetAt));
	return {
		ok: true as const,
		credential: { id: record.id, userId: record.userId, scopes },
		rateLimit,
		responseHeaders: successHeaders,
	};
}

export async function recordApiUsage(input: {
	apiKeyId: number;
	request: Request;
	statusCode: number;
	startedAt: number;
}) {
	try {
		await db.insert(apiKeyUsage).values({
			apiKeyId: input.apiKeyId,
			method: input.request.method,
			path: new URL(input.request.url).pathname.slice(0, 256),
			statusCode: input.statusCode,
			latencyMs: Math.max(0, Date.now() - input.startedAt),
		});
	} catch (error) {
		console.error("developer API usage recording failed", error);
	}
}

function signature(secret: string, timestamp: number, payload: string) {
	return crypto
		.createHmac("sha256", secret)
		.update(`${timestamp}.${payload}`)
		.digest("hex");
}

function postWebhook(
	url: URL,
	address: { address: string; family: number },
	headers: Record<string, string>,
	payload: string,
) {
	return new Promise<number>((resolve, reject) => {
		const request = https.request(
			{
				protocol: "https:",
				hostname: url.hostname,
				port: url.port || 443,
				path: `${url.pathname}${url.search}`,
				method: "POST",
				servername: url.hostname,
				headers: {
					...headers,
					"content-length": Buffer.byteLength(payload).toString(),
				},
				lookup: (_hostname, _options, callback) =>
					callback(null, address.address, address.family as 4 | 6),
			},
			(response) => {
				response.resume();
				resolve(response.statusCode ?? 0);
			},
		);
		request.setTimeout(8_000, () => request.destroy(new Error("Timeout")));
		request.on("error", reject);
		request.end(payload);
	});
}

export async function deliverWebhook(
	database: Database,
	webhook: typeof webhooks.$inferSelect,
	event: WebhookEvent,
	payloadData: Record<string, unknown>,
	options?: { attemptCount?: number; mode?: "live" | "test" },
) {
	const resolved = await resolveWebhookUrl(webhook.url);
	const timestamp = now();
	const eventId = crypto.randomUUID();
	const payload = JSON.stringify({
		id: eventId,
		event,
		mode: options?.mode || "live",
		createdAt: new Date(timestamp * 1000).toISOString(),
		data: payloadData,
	});
	const secret = decryptWebhookSecret(webhook.secretEncrypted);
	let status = "failed";
	let responseStatus: number | null = null;
	let errorMessage: string | null = null;

	try {
		responseStatus = await postWebhook(
			resolved.url,
			resolved.address,
			{
				"content-type": "application/json",
				"user-agent": "exteraStore-Webhooks/1.0",
				"x-exterastore-event": event,
				"x-exterastore-delivery": eventId,
				"x-exterastore-timestamp": String(timestamp),
				"x-exterastore-signature": `sha256=${signature(secret, timestamp, payload)}`,
			},
			payload,
		);
		status =
			responseStatus >= 200 && responseStatus < 300 ? "delivered" : "failed";
		if (status !== "delivered") errorMessage = `HTTP ${responseStatus}`;
	} catch (error) {
		errorMessage =
			error instanceof Error ? error.message.slice(0, 500) : "Delivery failed";
	}

	const deliveredAt = status === "delivered" ? now() : null;
	const [delivery] = await database
		.insert(webhookDeliveries)
		.values({
			webhookId: webhook.id,
			event,
			payload,
			status,
			responseStatus,
			attemptCount: options?.attemptCount || 1,
			errorMessage,
			deliveredAt,
		})
		.returning();
	await database
		.update(webhooks)
		.set({
			lastDeliveryAt: now(),
			failureCount: status === "delivered" ? 0 : webhook.failureCount + 1,
			isActive: status === "delivered" || webhook.failureCount < 9,
		})
		.where(eq(webhooks.id, webhook.id));
	if (!delivery) throw new Error("Webhook delivery could not be recorded");
	return delivery;
}

export async function emitWebhookEvent(
	database: Database,
	userId: string | null | undefined,
	event: WebhookEvent,
	payload: Record<string, unknown>,
) {
	if (!userId) return [];
	const hooks = await database
		.select()
		.from(webhooks)
		.where(and(eq(webhooks.userId, userId), eq(webhooks.isActive, true)));
	const matching = hooks.filter((hook) =>
		safeJsonParse<WebhookEvent[]>(hook.events, []).includes(event),
	);
	return Promise.allSettled(
		matching.map((hook) => deliverWebhook(database, hook, event, payload)),
	);
}
