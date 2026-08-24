import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
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
	getLatestWebhookDeliveries,
	validateWebhookUrl,
	WEBHOOK_EVENTS,
} from "~/server/lib/developer-platform";

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
		return keys.map((key) => ({
			...key,
			scopes: z.array(scopeSchema).catch([]).parse(JSON.parse(key.scopes)),
			requestsLast7Days: usageMap.get(key.id) ?? 0,
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
			const current = await ctx.db
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
			const generated = createApiKeyValue();
			const [record] = await ctx.db
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
			return { id: record?.id, key: generated.value };
		}),

	revokeApiKey: protectedProcedure
		.input(z.object({ id: z.number().int().positive() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(apiKeys)
				.set({ revokedAt: now() })
				.where(
					and(
						eq(apiKeys.id, input.id),
						eq(apiKeys.userId, ctx.session.user.id),
					),
				);
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
		return Promise.all(
			hooks.map(async (hook) => ({
				...hook,
				events: z.array(eventSchema).catch([]).parse(JSON.parse(hook.events)),
				deliveries: await getLatestWebhookDeliveries(ctx.db, hook.id, 8),
			})),
		);
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
			const current = await ctx.db
				.select({ value: count() })
				.from(webhooks)
				.where(eq(webhooks.userId, ctx.session.user.id));
			if ((current[0]?.value ?? 0) >= 20) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "WEBHOOK_LIMIT" });
			}
			const url = await validateWebhookUrl(input.url);
			const secret = createWebhookSecret();
			const [record] = await ctx.db
				.insert(webhooks)
				.values({
					userId: ctx.session.user.id,
					name: input.name,
					url,
					events: JSON.stringify([...new Set(input.events)]),
					secretEncrypted: encryptWebhookSecret(secret),
				})
				.returning({ id: webhooks.id });
			return { id: record?.id, secret };
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
			await ctx.db
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
				);
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
			await ctx.db
				.delete(webhooks)
				.where(
					and(
						eq(webhooks.id, input.id),
						eq(webhooks.userId, ctx.session.user.id),
					),
				);
			return { success: true };
		}),

	testWebhook: protectedProcedure
		.input(z.object({ id: z.number().int().positive() }))
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
			return deliverWebhook(ctx.db, hook, "plugin.updated", {
				test: true,
				message: "Проверка подключения exteraStore",
			});
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
			);
		}),
});
