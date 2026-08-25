import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { webhooks } from "~/server/db/schema";
import {
	authorizeApiRequest,
	deliverWebhook,
	recordApiUsage,
	WEBHOOK_EVENTS,
} from "~/server/lib/developer-platform";
import { consumeDeveloperRateLimits } from "~/server/lib/developer-rate-limiter";

const inputSchema = z.object({
	event: z.enum(WEBHOOK_EVENTS),
	data: z.record(z.string().max(100), z.unknown()).default({}),
});

export async function POST(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const startedAt = Date.now();
	const authorization = await authorizeApiRequest(request, "webhooks:write");
	if (!authorization.ok) return authorization.response;
	const { credential } = authorization;
	let statusCode = 200;

	try {
		const { id: rawId } = await context.params;
		const id = Number(rawId);
		if (!Number.isInteger(id) || id <= 0) {
			statusCode = 400;
			return Response.json(
				{ error: "invalid_request" },
				{ status: statusCode, headers: authorization.responseHeaders },
			);
		}
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			statusCode = 400;
			return Response.json(
				{ error: "invalid_json" },
				{ status: statusCode, headers: authorization.responseHeaders },
			);
		}
		const parsed = inputSchema.safeParse(body);
		if (!parsed.success) {
			statusCode = 400;
			return Response.json(
				{ error: "invalid_request", issues: parsed.error.flatten() },
				{ status: statusCode, headers: authorization.responseHeaders },
			);
		}
		if (Buffer.byteLength(JSON.stringify(parsed.data.data), "utf8") > 16_384) {
			statusCode = 413;
			return Response.json(
				{ error: "payload_too_large" },
				{ status: statusCode, headers: authorization.responseHeaders },
			);
		}

		const [hook] = await db
			.select()
			.from(webhooks)
			.where(and(eq(webhooks.id, id), eq(webhooks.userId, credential.userId)))
			.limit(1);
		if (!hook) {
			statusCode = 404;
			return Response.json(
				{ error: "not_found" },
				{ status: statusCode, headers: authorization.responseHeaders },
			);
		}
		const subscribedEvents = z
			.array(z.enum(WEBHOOK_EVENTS))
			.catch([])
			.parse(JSON.parse(hook.events));
		if (!subscribedEvents.includes(parsed.data.event)) {
			statusCode = 400;
			return Response.json(
				{ error: "event_not_subscribed" },
				{ status: statusCode, headers: authorization.responseHeaders },
			);
		}

		const limit = await consumeDeveloperRateLimits(db, [
			{
				subjectKey: `user:${credential.userId}`,
				scope: `webhook-test:${hook.id}`,
				limit: 5,
				windowSeconds: 60,
			},
		]);
		if (limit.limited) {
			statusCode = 429;
			return Response.json(
				{ error: "rate_limit_exceeded" },
				{
					status: statusCode,
					headers: {
						...Object.fromEntries(authorization.responseHeaders.entries()),
						"retry-after": String(
							Math.max(1, limit.resetAt - Math.floor(Date.now() / 1_000)),
						),
					},
				},
			);
		}

		const delivery = await deliverWebhook(
			db,
			hook,
			parsed.data.event,
			{
				...parsed.data.data,
				test: true,
				message: "Проверка подключения exteraStore",
			},
			{ mode: "test" },
		);
		return Response.json(
			{
				data: {
					id: delivery.id,
					status: delivery.status,
					responseStatus: delivery.responseStatus,
					errorMessage: delivery.errorMessage,
					createdAt: delivery.createdAt,
				},
			},
			{ headers: authorization.responseHeaders },
		);
	} catch (error) {
		statusCode = 500;
		return Response.json(
			{
				error: "internal_error",
				message: error instanceof Error ? error.message : undefined,
			},
			{ status: statusCode, headers: authorization.responseHeaders },
		);
	} finally {
		await recordApiUsage({
			apiKeyId: credential.id,
			request,
			statusCode,
			startedAt,
		});
	}
}
