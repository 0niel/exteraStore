import { TRPCError } from "@trpc/server";
import {
	and,
	count,
	desc,
	eq,
	gte,
	inArray,
	isNull,
	lte,
	sql,
} from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	apiKeys,
	apiKeyUsage,
	webhookDeliveries,
	webhooks,
} from "~/server/db/schema";
import {
	API_SCOPES,
	createApiKeyValue,
	createWebhookSecret,
	deliverWebhook,
	encryptWebhookSecret,
	validateWebhookUrl,
	WEBHOOK_EVENTS,
} from "~/server/lib/developer-platform";
import { consumeDeveloperRateLimits } from "~/server/lib/developer-rate-limiter";

const scopeSchema = z.enum(API_SCOPES);
const eventSchema = z.enum(WEBHOOK_EVENTS);
const now = () => Math.floor(Date.now() / 1000);

export const developerPlatformRouter = createTRPCRouter({
	listApiKeys: protectedProcedure.query(async ({ ctx }) => {
		const keys = await ctx.db
			.select({
				id: apiKeys.id,
				name: apiKeys.name,
				prefix: apiKeys.prefix,
				scopes: apiKeys.scopes,
				expiresAt: apiKeys.expiresAt,
				lastUsedAt: apiKeys.lastUsedAt,
				revokedAt: apiKeys.revokedAt,
				createdAt: apiKeys.createdAt,
			})
			.from(apiKeys)
			.where(eq(apiKeys.userId, ctx.session.user.id))
			.orderBy(desc(apiKeys.createdAt));
		const weekAgo = now() - 7 * 24 * 60 * 60;
		const usage = await ctx.db
			.select({ apiKeyId: apiKeyUsage.apiKeyId, requests: count() })
			.from(apiKeyUsage)
			.innerJoin(apiKeys, eq(apiKeyUsage.apiKeyId, apiKeys.id))
			.where(
				and(
					eq(apiKeys.userId, ctx.session.user.id),
					gte(apiKeyUsage.createdAt, weekAgo),
				),
			)
			.groupBy(apiKeyUsage.apiKeyId);
		const usageMap = new Map(usage.map((row) => [row.apiKeyId, row.requests]));
		const rankedUsage = ctx.db
			.select({
				id: apiKeyUsage.id,
				apiKeyId: apiKeyUsage.apiKeyId,
				method: apiKeyUsage.method,
				path: apiKeyUsage.path,
				statusCode: apiKeyUsage.statusCode,
				latencyMs: apiKeyUsage.latencyMs,
				createdAt: apiKeyUsage.createdAt,
				rank: sql<number>`row_number() over (partition by ${apiKeyUsage.apiKeyId} order by ${apiKeyUsage.createdAt} desc)`.as(
					"usage_rank",
				),
			})
			.from(apiKeyUsage)
			.innerJoin(apiKeys, eq(apiKeyUsage.apiKeyId, apiKeys.id))
			.where(eq(apiKeys.userId, ctx.session.user.id))
			.as("ranked_api_usage");
		const recentUsage = await ctx.db
			.select({
				id: rankedUsage.id,
				apiKeyId: rankedUsage.apiKeyId,
				method: rankedUsage.method,
				path: rankedUsage.path,
				statusCode: rankedUsage.statusCode,
				latencyMs: rankedUsage.latencyMs,
				createdAt: rankedUsage.createdAt,
			})
			.from(rankedUsage)
			.where(lte(rankedUsage.rank, 6))
			.orderBy(rankedUsage.apiKeyId, desc(rankedUsage.createdAt));
		const usageByKey = new Map<number, typeof recentUsage>();
		for (const request of recentUsage) {
			const existing = usageByKey.get(request.apiKeyId) || [];
			existing.push(request);
			usageByKey.set(request.apiKeyId, existing);
		}
		return keys.map((key) => ({
			...key,
			scopes: z.array(scopeSchema).catch([]).parse(JSON.parse(key.scopes)),
			requestsLast7Days: usageMap.get(key.id) ?? 0,
			recentRequests: usageByKey.get(key.id) || [],
		}));
	}),

	createApiKey: protectedProcedure
		.input(
			z.object({
				name: z.string().trim().min(1).max(80),
				scopes: z.array(scopeSchema).min(1),
				expiresAt: z.number().int().positive().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.expiresAt !== null && input.expiresAt <= now()) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_EXPIRY" });
			}
			const generated = createApiKeyValue();
			return ctx.db.transaction(async (transaction) => {
				await transaction.execute(
					sql`select pg_advisory_xact_lock(hashtextextended(${`api-key:${ctx.session.user.id}`}, 0))`,
				);
				const current = await transaction
					.select({ value: count() })
					.from(apiKeys)
					.where(
						and(
							eq(apiKeys.userId, ctx.session.user.id),
							isNull(apiKeys.revokedAt),
						),
					);
				if ((current[0]?.value ?? 0) >= 20) {
					throw new TRPCError({ code: "BAD_REQUEST", message: "KEY_LIMIT" });
				}
				const [record] = await transaction
					.insert(apiKeys)
					.values({
						userId: ctx.session.user.id,
						name: input.name,
						prefix: generated.prefix,
						secretHash: generated.hash,
						scopes: JSON.stringify([...new Set(input.scopes)]),
						expiresAt: input.expiresAt,
					})
					.returning({ id: apiKeys.id });
				if (!record) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
				return { id: record.id, key: generated.value };
			});
		}),

	revokeApiKey: protectedProcedure
		.input(z.object({ id: z.number().int().positive() }))
		.mutation(async ({ ctx, input }) => {
			const [revoked] = await ctx.db
				.update(apiKeys)
				.set({ revokedAt: now() })
				.where(
					and(
						eq(apiKeys.id, input.id),
						eq(apiKeys.userId, ctx.session.user.id),
					),
				)
				.returning({ id: apiKeys.id });
			if (!revoked) throw new TRPCError({ code: "NOT_FOUND" });
			return { success: true };
		}),

	listWebhooks: protectedProcedure.query(async ({ ctx }) => {
		const hooks = await ctx.db
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
			.where(eq(webhooks.userId, ctx.session.user.id))
			.orderBy(desc(webhooks.createdAt));
		if (hooks.length === 0) return [];
		const rankedDeliveries = ctx.db
			.select({
				id: webhookDeliveries.id,
				webhookId: webhookDeliveries.webhookId,
				event: webhookDeliveries.event,
				status: webhookDeliveries.status,
				responseStatus: webhookDeliveries.responseStatus,
				attemptCount: webhookDeliveries.attemptCount,
				errorMessage: webhookDeliveries.errorMessage,
				deliveredAt: webhookDeliveries.deliveredAt,
				createdAt: webhookDeliveries.createdAt,
				rank: sql<number>`row_number() over (partition by ${webhookDeliveries.webhookId} order by ${webhookDeliveries.createdAt} desc)`.as(
					"delivery_rank",
				),
			})
			.from(webhookDeliveries)
			.where(
				inArray(
					webhookDeliveries.webhookId,
					hooks.map((hook) => hook.id),
				),
			)
			.as("ranked_deliveries");
		const deliveries = await ctx.db
			.select({
				id: rankedDeliveries.id,
				webhookId: rankedDeliveries.webhookId,
				event: rankedDeliveries.event,
				status: rankedDeliveries.status,
				responseStatus: rankedDeliveries.responseStatus,
				attemptCount: rankedDeliveries.attemptCount,
				errorMessage: rankedDeliveries.errorMessage,
				deliveredAt: rankedDeliveries.deliveredAt,
				createdAt: rankedDeliveries.createdAt,
			})
			.from(rankedDeliveries)
			.where(lte(rankedDeliveries.rank, 8))
			.orderBy(rankedDeliveries.webhookId, desc(rankedDeliveries.createdAt));
		const deliveriesByWebhook = new Map<number, typeof deliveries>();
		for (const delivery of deliveries) {
			const existing = deliveriesByWebhook.get(delivery.webhookId) ?? [];
			existing.push(delivery);
			deliveriesByWebhook.set(delivery.webhookId, existing);
		}
		return hooks.map((hook) => ({
			...hook,
			events: z.array(eventSchema).catch([]).parse(JSON.parse(hook.events)),
			deliveries: deliveriesByWebhook.get(hook.id) ?? [],
		}));
	}),

	createWebhook: protectedProcedure
		.input(
			z.object({
				name: z.string().trim().min(1).max(80),
				url: z.string().url().max(2_000),
				events: z.array(eventSchema).min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const url = await validateWebhookUrl(input.url);
			const secret = createWebhookSecret();
			return ctx.db.transaction(async (transaction) => {
				await transaction.execute(
					sql`select pg_advisory_xact_lock(hashtextextended(${`webhook:${ctx.session.user.id}`}, 0))`,
				);
				const current = await transaction
					.select({ value: count() })
					.from(webhooks)
					.where(eq(webhooks.userId, ctx.session.user.id));
				if ((current[0]?.value ?? 0) >= 20) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "WEBHOOK_LIMIT",
					});
				}
				const [record] = await transaction
					.insert(webhooks)
					.values({
						userId: ctx.session.user.id,
						name: input.name,
						url,
						events: JSON.stringify([...new Set(input.events)]),
						secretEncrypted: encryptWebhookSecret(secret),
					})
					.returning({ id: webhooks.id });
				if (!record) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
				return { id: record.id, secret };
			});
		}),

	updateWebhook: protectedProcedure
		.input(
			z.object({
				id: z.number().int().positive(),
				name: z.string().trim().min(1).max(80),
				url: z.string().url().max(2_000),
				events: z.array(eventSchema).min(1),
				isActive: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const url = await validateWebhookUrl(input.url);
			const [updated] = await ctx.db
				.update(webhooks)
				.set({
					name: input.name,
					url,
					events: JSON.stringify([...new Set(input.events)]),
					isActive: input.isActive,
					failureCount: input.isActive ? 0 : undefined,
					updatedAt: now(),
				})
				.where(
					and(
						eq(webhooks.id, input.id),
						eq(webhooks.userId, ctx.session.user.id),
					),
				)
				.returning({ id: webhooks.id });
			if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
			return { success: true };
		}),

	rotateWebhookSecret: protectedProcedure
		.input(z.object({ id: z.number().int().positive() }))
		.mutation(async ({ ctx, input }) => {
			const secret = createWebhookSecret();
			const [updated] = await ctx.db
				.update(webhooks)
				.set({
					secretEncrypted: encryptWebhookSecret(secret),
					updatedAt: now(),
				})
				.where(
					and(
						eq(webhooks.id, input.id),
						eq(webhooks.userId, ctx.session.user.id),
					),
				)
				.returning({ id: webhooks.id });
			if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
			return { secret };
		}),

	deleteWebhook: protectedProcedure
		.input(z.object({ id: z.number().int().positive() }))
		.mutation(async ({ ctx, input }) => {
			const [deleted] = await ctx.db
				.delete(webhooks)
				.where(
					and(
						eq(webhooks.id, input.id),
						eq(webhooks.userId, ctx.session.user.id),
					),
				)
				.returning({ id: webhooks.id });
			if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
			return { success: true };
		}),

	testWebhook: protectedProcedure
		.input(
			z.object({
				id: z.number().int().positive(),
				event: eventSchema,
				data: z.record(z.string().max(100), z.unknown()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [hook] = await ctx.db
				.select()
				.from(webhooks)
				.where(
					and(
						eq(webhooks.id, input.id),
						eq(webhooks.userId, ctx.session.user.id),
					),
				)
				.limit(1);
			if (!hook) throw new TRPCError({ code: "NOT_FOUND" });
			const subscribedEvents = z
				.array(eventSchema)
				.catch([])
				.parse(JSON.parse(hook.events));
			if (!subscribedEvents.includes(input.event)) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "EVENT_DISABLED" });
			}
			if (Buffer.byteLength(JSON.stringify(input.data), "utf8") > 16_384) {
				throw new TRPCError({ code: "PAYLOAD_TOO_LARGE" });
			}
			const limit = await consumeDeveloperRateLimits(ctx.db, [
				{
					subjectKey: `user:${ctx.session.user.id}`,
					scope: `webhook-test:${hook.id}`,
					limit: 5,
					windowSeconds: 60,
				},
			]);
			if (limit.limited) {
				throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
			}
			const delivery = await deliverWebhook(
				ctx.db,
				hook,
				input.event,
				{
					...input.data,
					test: true,
					message: "Проверка подключения exteraStore",
				},
				{ mode: "test" },
			);
			return {
				id: delivery.id,
				status: delivery.status,
				responseStatus: delivery.responseStatus,
				errorMessage: delivery.errorMessage,
				createdAt: delivery.createdAt,
			};
		}),

	retryDelivery: protectedProcedure
		.input(z.object({ id: z.number().int().positive() }))
		.mutation(async ({ ctx, input }) => {
			const [delivery] = await ctx.db
				.select({ delivery: webhookDeliveries, webhook: webhooks })
				.from(webhookDeliveries)
				.innerJoin(webhooks, eq(webhookDeliveries.webhookId, webhooks.id))
				.where(
					and(
						eq(webhookDeliveries.id, input.id),
						eq(webhooks.userId, ctx.session.user.id),
					),
				)
				.limit(1);
			if (!delivery) throw new TRPCError({ code: "NOT_FOUND" });
			const parsed = z
				.object({ data: z.record(z.string(), z.unknown()) })
				.parse(JSON.parse(delivery.delivery.payload));
			return deliverWebhook(
				ctx.db,
				delivery.webhook,
				eventSchema.parse(delivery.delivery.event),
				parsed.data,
				{ attemptCount: delivery.delivery.attemptCount + 1 },
			);
		}),
});
