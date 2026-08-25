import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { webhooks } from "~/server/db/schema";
import {
	authorizeApiRequest,
	recordApiUsage,
	validateWebhookUrl,
	WEBHOOK_EVENTS,
} from "~/server/lib/developer-platform";

const InputSchema = z
	.object({
		name: z.string().trim().min(1).max(80).optional(),
		url: z.string().url().max(2_000).optional(),
		events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
		isActive: z.boolean().optional(),
	})
	.refine((value) => Object.keys(value).length > 0);

export async function PATCH(
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
		const parsed = InputSchema.safeParse(await request.json());
		if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
			statusCode = 400;
			return Response.json(
				{ error: "invalid_request" },
				{ status: statusCode, headers: authorization.responseHeaders },
			);
		}
		const [updated] = await db
			.update(webhooks)
			.set({
				name: parsed.data.name,
				url: parsed.data.url
					? await validateWebhookUrl(parsed.data.url)
					: undefined,
				events: parsed.data.events
					? JSON.stringify([...new Set(parsed.data.events)])
					: undefined,
				isActive: parsed.data.isActive,
				failureCount: parsed.data.isActive ? 0 : undefined,
				updatedAt: Math.floor(Date.now() / 1_000),
			})
			.where(and(eq(webhooks.id, id), eq(webhooks.userId, credential.userId)))
			.returning({ id: webhooks.id });
		if (!updated) {
			statusCode = 404;
			return Response.json(
				{ error: "not_found" },
				{ status: statusCode, headers: authorization.responseHeaders },
			);
		}
		return Response.json(
			{ data: updated },
			{ headers: authorization.responseHeaders },
		);
	} catch (error) {
		statusCode = 400;
		return Response.json(
			{
				error: "invalid_request",
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

export async function DELETE(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const startedAt = Date.now();
	const authorization = await authorizeApiRequest(request, "webhooks:write");
	if (!authorization.ok) return authorization.response;
	const { credential } = authorization;
	let statusCode = 204;
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
		const [deleted] = await db
			.delete(webhooks)
			.where(and(eq(webhooks.id, id), eq(webhooks.userId, credential.userId)))
			.returning({ id: webhooks.id });
		if (!deleted) {
			statusCode = 404;
			return Response.json(
				{ error: "not_found" },
				{ status: statusCode, headers: authorization.responseHeaders },
			);
		}
		return new Response(null, {
			status: 204,
			headers: authorization.responseHeaders,
		});
	} finally {
		await recordApiUsage({
			apiKeyId: credential.id,
			request,
			statusCode,
			startedAt,
		});
	}
}
