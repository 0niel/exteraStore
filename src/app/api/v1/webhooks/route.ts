import { count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { webhooks } from "~/server/db/schema";
import {
	authenticateApiKey,
	createWebhookSecret,
	encryptWebhookSecret,
	recordApiUsage,
	validateWebhookUrl,
	WEBHOOK_EVENTS,
} from "~/server/lib/developer-platform";

const InputSchema = z.object({
	name: z.string().trim().min(1).max(80),
	url: z.string().url().max(2_000),
	events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
});

export async function GET(request: Request) {
	const startedAt = Date.now();
	const credential = await authenticateApiKey(request, "webhooks:read");
	if (!credential) {
		return Response.json({ error: "invalid_api_key" }, { status: 401 });
	}
	let statusCode = 200;
	try {
		const rows = await db
			.select({
				id: webhooks.id,
				name: webhooks.name,
				url: webhooks.url,
				events: webhooks.events,
				isActive: webhooks.isActive,
				failureCount: webhooks.failureCount,
				lastDeliveryAt: webhooks.lastDeliveryAt,
				createdAt: webhooks.createdAt,
			})
			.from(webhooks)
			.where(eq(webhooks.userId, credential.userId))
			.orderBy(desc(webhooks.createdAt));
		return Response.json({
			data: rows.map((row) => ({ ...row, events: JSON.parse(row.events) })),
		});
	} catch {
		statusCode = 500;
		return Response.json({ error: "internal_error" }, { status: statusCode });
	} finally {
		await recordApiUsage({
			apiKeyId: credential.id,
			request,
			statusCode,
			startedAt,
		});
	}
}

export async function POST(request: Request) {
	const startedAt = Date.now();
	const credential = await authenticateApiKey(request, "webhooks:write");
	if (!credential) {
		return Response.json({ error: "invalid_api_key" }, { status: 401 });
	}
	let statusCode = 201;
	try {
		const parsed = InputSchema.safeParse(await request.json());
		if (!parsed.success) {
			statusCode = 400;
			return Response.json(
				{ error: "invalid_request", issues: parsed.error.flatten() },
				{ status: statusCode },
			);
		}
		const url = await validateWebhookUrl(parsed.data.url);
		const secret = createWebhookSecret();
		const created = await db.transaction(async (transaction) => {
			await transaction.execute(
				sql`select pg_advisory_xact_lock(hashtextextended(${`webhook:${credential.userId}`}, 0))`,
			);
			const [current] = await transaction
				.select({ value: count() })
				.from(webhooks)
				.where(eq(webhooks.userId, credential.userId));
			if ((current?.value ?? 0) >= 20) return null;
			const [record] = await transaction
				.insert(webhooks)
				.values({
					userId: credential.userId,
					name: parsed.data.name,
					url,
					events: JSON.stringify([...new Set(parsed.data.events)]),
					secretEncrypted: encryptWebhookSecret(secret),
				})
				.returning({ id: webhooks.id });
			return record ?? null;
		});
		if (!created) {
			statusCode = 409;
			return Response.json({ error: "webhook_limit" }, { status: statusCode });
		}
		return Response.json(
			{ data: { id: created.id, secret } },
			{ status: statusCode },
		);
	} catch (error) {
		statusCode = 400;
		return Response.json(
			{
				error: "invalid_request",
				message: error instanceof Error ? error.message : undefined,
			},
			{ status: statusCode },
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
