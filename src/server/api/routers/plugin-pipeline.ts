import {
	and,
	desc,
	eq,
	getTableColumns,
	inArray,
	like,
	sql,
} from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";
import { getAllowedNotificationUserIds } from "~/lib/telegram-notifications";
import {
	type createTRPCContext,
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	aiPluginCollections,
	notifications,
	pluginPipelineChecks,
	pluginPipelineQueue,
	plugins,
	pluginVersions,
	userNotificationSettings,
	userPluginSubscriptions,
	users,
} from "~/server/db/schema";
import { isAdminSessionUser } from "~/server/lib/admin";
import { sendTelegramMessage } from "~/server/lib/telegram-client";
import { type AILocale, PluginAIChecker } from "./plugin-pipeline-ai";

type PipelineContext = Awaited<ReturnType<typeof createTRPCContext>>;

export async function sendSecurityAlerts(
	database: typeof import("~/server/db").db,
	pluginId: number,
	plugin: { name: string; slug: string },
) {
	const subscribers = await database
		.select({
			userId: userPluginSubscriptions.userId,
			telegramChatId: userPluginSubscriptions.telegramChatId,
			userTelegramId: users.telegramId,
		})
		.from(userPluginSubscriptions)
		.leftJoin(users, eq(userPluginSubscriptions.userId, users.id))
		.where(
			and(
				eq(userPluginSubscriptions.pluginId, pluginId),
				eq(userPluginSubscriptions.subscriptionType, "security_alerts"),
				eq(userPluginSubscriptions.isActive, true),
			),
		);

	const allowedUserIds = await getAllowedNotificationUserIds(
		database,
		subscribers.map((s: { userId: string }) => s.userId),
		"security",
	);

	const baseUrl = env.NEXTAUTH_URL || "http://localhost:3000";
	const pluginUrl = `${baseUrl}/plugins/${plugin.slug}`;

	for (const subscriber of subscribers) {
		if (!allowedUserIds.has(subscriber.userId)) {
			continue;
		}

		await database.insert(notifications).values({
			userId: subscriber.userId,
			pluginId,
			type: "security_alert",
			title: "Критические проблемы найдены",
			message: `В плагине ${plugin.name} обнаружены критические проблемы безопасности или производительности. Проверьте результаты проверки.`,
		});

		const chatId = subscriber.telegramChatId ?? subscriber.userTelegramId;
		if (chatId && env.TELEGRAM_BOT_TOKEN) {
			try {
				await sendTelegramMessage(
					chatId,
					`🚨 *Предупреждение безопасности!*\n\n🔌 Плагин: *${plugin.name}*\n\nОбнаружены критические проблемы безопасности или производительности. Рекомендуем проверить плагин.`,
					{
						parse_mode: "Markdown",
						reply_markup: {
							inline_keyboard: [
								[{ text: "🔍 Посмотреть детали", url: pluginUrl }],
							],
						},
					},
				);
			} catch {
				console.error("Failed to send security alert TG notification");
			}
		}
	}
}

export async function processQueueItem(
	ctx: PipelineContext,
	queueItemId: number,
) {
	const [item] = await ctx.db
		.update(pluginPipelineQueue)
		.set({
			status: "processing",
			startedAt: Math.floor(Date.now() / 1000),
		})
		.where(
			and(
				eq(pluginPipelineQueue.id, queueItemId),
				eq(pluginPipelineQueue.status, "queued"),
			),
		)
		.returning();

	if (!item) return;

	try {
		const plugin = await ctx.db
			.select()
			.from(plugins)
			.where(eq(plugins.id, item.pluginId))
			.limit(1);

		if (!plugin[0]) {
			throw new Error("Plugin not found");
		}

		const latestVersion = await ctx.db
			.select({
				fileContent: pluginVersions.fileContent,
				version: pluginVersions.version,
			})
			.from(pluginVersions)
			.where(eq(pluginVersions.pluginId, item.pluginId))
			.orderBy(desc(pluginVersions.createdAt))
			.limit(1);

		if (!latestVersion[0]) {
			throw new Error("Plugin version not found");
		}

		const aiChecker = new PluginAIChecker();
		const checks = [
			{
				type: "security",
				checker: (code: string, name: string) =>
					aiChecker.checkSecurity(code, name),
			},
			{
				type: "performance",
				checker: (code: string, name: string) =>
					aiChecker.checkPerformance(code, name),
			},
		];
		const checkIds: number[] = [];

		for (const check of checks) {
			const startTime = Date.now();
			let checkId: number | null = null;

			try {
				const [createdCheck] = await ctx.db
					.insert(pluginPipelineChecks)
					.values({
						pluginId: item.pluginId,
						checkType: check.type,
						status: "running",
						llmModel: env.OPENROUTER_MODEL,
						llmPrompt: `Version: ${latestVersion[0].version}`,
					})
					.returning({ id: pluginPipelineChecks.id });
				if (!createdCheck) throw new Error("Failed to create pipeline check");
				checkId = createdCheck.id;
				checkIds.push(createdCheck.id);

				const result = await check.checker(
					latestVersion[0].fileContent,
					plugin[0].name,
				);
				const executionTime = Date.now() - startTime;

				await ctx.db
					.update(pluginPipelineChecks)
					.set({
						status: result.score >= 70 ? "passed" : "failed",
						score: result.score,
						details: JSON.stringify(result.details),
						classification: result.details.classification,
						shortDescription: result.details.shortDescription,
						executionTime,
						completedAt: Math.floor(Date.now() / 1000),
					})
					.where(eq(pluginPipelineChecks.id, createdCheck.id));
			} catch {
				if (checkId !== null) {
					await ctx.db
						.update(pluginPipelineChecks)
						.set({
							status: "error",
							errorMessage: "AI check failed",
							completedAt: Math.floor(Date.now() / 1000),
						})
						.where(eq(pluginPipelineChecks.id, checkId));
				}
			}
		}

		aiChecker.cleanup();

		await ctx.db
			.update(pluginPipelineQueue)
			.set({
				status: "completed",
				completedAt: Math.floor(Date.now() / 1000),
			})
			.where(eq(pluginPipelineQueue.id, item.id));

		const checkResults =
			checkIds.length > 0
				? await ctx.db
						.select()
						.from(pluginPipelineChecks)
						.where(inArray(pluginPipelineChecks.id, checkIds))
				: [];

		const hasCriticalIssues = checkResults.some(
			(check: typeof pluginPipelineChecks.$inferSelect) =>
				check.status === "failed" && check.score !== null && check.score < 50,
		);

		if (hasCriticalIssues) {
			try {
				await sendSecurityAlerts(ctx.db, item.pluginId, plugin[0]);
			} catch (error) {
				console.error("Failed to send security alerts:", error);
			}
		}

		if (plugin[0].authorId) {
			const failedChecks = checkResults.filter(
				(check: typeof pluginPipelineChecks.$inferSelect) =>
					check.status === "failed" || check.status === "error",
			).length;
			try {
				await ctx.db.insert(notifications).values({
					userId: plugin[0].authorId,
					pluginId: item.pluginId,
					type: "pipeline_completed",
					title: "Проверки плагина завершены",
					message:
						failedChecks > 0
							? `Для ${plugin[0].name} завершены проверки. Требуют внимания: ${failedChecks}.`
							: `${plugin[0].name} успешно прошёл автоматические проверки.`,
					data: JSON.stringify({ failedChecks, queueItemId: item.id }),
				});
			} catch (error) {
				console.error("Failed to create pipeline notification:", error);
			}
		}

		return { pluginId: item.pluginId, status: "completed" };
	} catch (error) {
		await ctx.db
			.update(pluginPipelineQueue)
			.set({
				status: "failed",
				errorMessage: error instanceof Error ? error.message : "Unknown error",
				retryCount: item.retryCount + 1,
				completedAt: Math.floor(Date.now() / 1000),
			})
			.where(eq(pluginPipelineQueue.id, item.id));

		throw error;
	}
}

export const pluginPipelineRouter = createTRPCRouter({
	getChecks: publicProcedure
		.input(z.object({ pluginId: z.number() }))
		.query(async ({ ctx, input }) => {
			return ctx.db
				.select({ ...getTableColumns(pluginPipelineChecks) })
				.from(pluginPipelineChecks)
				.innerJoin(plugins, eq(pluginPipelineChecks.pluginId, plugins.id))
				.where(
					and(
						eq(pluginPipelineChecks.pluginId, input.pluginId),
						eq(plugins.status, "approved"),
					),
				)
				.orderBy(desc(pluginPipelineChecks.createdAt))
				.limit(12);
		}),

	runChecks: protectedProcedure
		.input(z.object({ pluginId: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({
					authorId: plugins.authorId,
					name: plugins.name,
					slug: plugins.slug,
				})
				.from(plugins)
				.where(eq(plugins.id, input.pluginId))
				.limit(1);

			if (
				!plugin[0] ||
				(plugin[0].authorId !== ctx.session.user.id &&
					!isAdminSessionUser(ctx.session.user))
			) {
				throw new Error("Unauthorized");
			}

			const latestVersion = await ctx.db
				.select({
					id: pluginVersions.id,
					version: pluginVersions.version,
					fileHash: pluginVersions.fileHash,
				})
				.from(pluginVersions)
				.where(eq(pluginVersions.pluginId, input.pluginId))
				.orderBy(desc(pluginVersions.createdAt))
				.limit(1);

			if (!latestVersion[0]) {
				throw new Error("No version found for this plugin");
			}

			const versionTag = `%Version: ${latestVersion[0].version}%`;
			const existingChecks = await ctx.db
				.select({ id: pluginPipelineChecks.id })
				.from(pluginPipelineChecks)
				.where(
					and(
						eq(pluginPipelineChecks.pluginId, input.pluginId),
						like(pluginPipelineChecks.llmPrompt, versionTag),
						inArray(pluginPipelineChecks.status, ["passed", "failed", "error"]),
					),
				)
				.limit(1);

			if (existingChecks.length > 0 && !isAdminSessionUser(ctx.session.user)) {
				throw new Error("Последняя версия уже проверена");
			}

			const activeQueue = await ctx.db
				.select()
				.from(pluginPipelineQueue)
				.where(
					and(
						eq(pluginPipelineQueue.pluginId, input.pluginId),
						sql`${pluginPipelineQueue.status} IN ('queued', 'processing')`,
					),
				)
				.limit(1);

			if (activeQueue.length > 0 && !isAdminSessionUser(ctx.session.user)) {
				throw new Error("Проверки этого плагина уже выполняются");
			}

			const [queueItem] = await ctx.db
				.insert(pluginPipelineQueue)
				.values({
					pluginId: input.pluginId,
					priority: 5,
					scheduledAt: Math.floor(Date.now() / 1000),
				})
				.returning();

			if (!queueItem) {
				throw new Error("Failed to enqueue pipeline checks");
			}

			return queueItem;
		}),

	getQueueStatus: publicProcedure.query(async ({ ctx }) => {
		const queueItems = await ctx.db
			.select()
			.from(pluginPipelineQueue)
			.where(sql`${pluginPipelineQueue.status} IN ('queued', 'processing')`)
			.orderBy(desc(pluginPipelineQueue.createdAt));

		return {
			totalInQueue: queueItems.length,
			processing: queueItems.filter(
				(item: typeof pluginPipelineQueue.$inferSelect) =>
					item.status === "processing",
			).length,
			queued: queueItems.filter(
				(item: typeof pluginPipelineQueue.$inferSelect) =>
					item.status === "queued",
			).length,
		};
	}),

	getPluginQueueStatus: publicProcedure
		.input(z.object({ pluginId: z.number() }))
		.query(async ({ ctx, input }) => {
			const queueItem = await ctx.db
				.select({ ...getTableColumns(pluginPipelineQueue) })
				.from(pluginPipelineQueue)
				.innerJoin(plugins, eq(pluginPipelineQueue.pluginId, plugins.id))
				.where(
					and(
						eq(pluginPipelineQueue.pluginId, input.pluginId),
						eq(plugins.status, "approved"),
						sql`${pluginPipelineQueue.status} IN ('queued', 'processing')`,
					),
				)
				.orderBy(desc(pluginPipelineQueue.createdAt))
				.limit(1);

			return queueItem[0] || null;
		}),

	processQueue: protectedProcedure
		.input(z.object({ limit: z.number().default(5) }))
		.mutation(async ({ ctx, input }) => {
			if (!isAdminSessionUser(ctx.session.user)) {
				throw new Error("Unauthorized");
			}

			const queueItems = await ctx.db
				.select()
				.from(pluginPipelineQueue)
				.where(eq(pluginPipelineQueue.status, "queued"))
				.orderBy(
					desc(pluginPipelineQueue.priority),
					pluginPipelineQueue.createdAt,
				)
				.limit(input.limit);

			const results: {
				pluginId: number;
				status: string;
				error?: string;
			}[] = [];

			for (const item of queueItems) {
				try {
					const result = await processQueueItem(ctx, item.id);
					if (result) results.push(result);
				} catch (error) {
					results.push({
						pluginId: item.pluginId,
						status: "failed",
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			return results;
		}),

	improveText: protectedProcedure
		.input(
			z.object({
				text: z
					.string()
					.min(1, "Текст не может быть пустым")
					.max(20_000, "Текст слишком длинный"),
				textType: z.enum(["description", "changelog"]),
				pluginName: z.string().max(256).optional(),
				locale: z.enum(["en", "ru"]).default("ru"),
			}),
		)
		.mutation(async ({ input }) => {
			if (!input.text.trim()) {
				throw new Error("Текст не может быть пустым");
			}

			const aiChecker = new PluginAIChecker();
			try {
				const result = await aiChecker.improveText(
					input.text,
					input.textType,
					input.pluginName,
					input.locale,
				);
				return result;
			} catch {
				throw new Error("AI request failed");
			} finally {
				aiChecker.cleanup();
			}
		}),

	getSubscriptions: protectedProcedure
		.input(z.object({ pluginId: z.number() }))
		.query(async ({ ctx, input }) => {
			const subs = await ctx.db
				.select({
					subscriptionType: userPluginSubscriptions.subscriptionType,
					isActive: userPluginSubscriptions.isActive,
				})
				.from(userPluginSubscriptions)
				.where(
					and(
						eq(userPluginSubscriptions.userId, ctx.session.user.id),
						eq(userPluginSubscriptions.pluginId, input.pluginId),
					),
				);

			return {
				updates:
					subs.find(
						(s: { subscriptionType: string; isActive: boolean }) =>
							s.subscriptionType === "updates",
					)?.isActive ?? false,
				reviews:
					subs.find(
						(s: { subscriptionType: string; isActive: boolean }) =>
							s.subscriptionType === "reviews",
					)?.isActive ?? false,
				security_alerts:
					subs.find(
						(s: { subscriptionType: string; isActive: boolean }) =>
							s.subscriptionType === "security_alerts",
					)?.isActive ?? false,
			};
		}),

	subscribe: protectedProcedure
		.input(
			z.object({
				pluginId: z.number(),
				subscriptionType: z.enum(["updates", "reviews", "security_alerts"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.db
				.select({ id: userPluginSubscriptions.id })
				.from(userPluginSubscriptions)
				.where(
					and(
						eq(userPluginSubscriptions.userId, ctx.session.user.id),
						eq(userPluginSubscriptions.pluginId, input.pluginId),
						eq(
							userPluginSubscriptions.subscriptionType,
							input.subscriptionType,
						),
					),
				)
				.limit(1);

			if (existing[0]) {
				const [subscription] = await ctx.db
					.update(userPluginSubscriptions)
					.set({
						isActive: true,
						telegramChatId: ctx.session.user.telegramId ?? undefined,
					})
					.where(eq(userPluginSubscriptions.id, existing[0].id))
					.returning();
				return subscription;
			}

			const [subscription] = await ctx.db
				.insert(userPluginSubscriptions)
				.values({
					userId: ctx.session.user.id,
					pluginId: input.pluginId,
					subscriptionType: input.subscriptionType,
					telegramChatId: ctx.session.user.telegramId,
				})
				.returning();

			return subscription;
		}),

	unsubscribe: protectedProcedure
		.input(
			z.object({
				pluginId: z.number(),
				subscriptionType: z.enum(["updates", "reviews", "security_alerts"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(userPluginSubscriptions)
				.set({ isActive: false })
				.where(
					and(
						eq(userPluginSubscriptions.userId, ctx.session.user.id),
						eq(userPluginSubscriptions.pluginId, input.pluginId),
						eq(
							userPluginSubscriptions.subscriptionType,
							input.subscriptionType,
						),
					),
				);

			return { success: true };
		}),

	getNotificationSettings: protectedProcedure.query(async ({ ctx }) => {
		const settings = await ctx.db
			.select()
			.from(userNotificationSettings)
			.where(eq(userNotificationSettings.userId, ctx.session.user.id))
			.limit(1);

		if (!settings[0]) {
			const [newSettings] = await ctx.db
				.insert(userNotificationSettings)
				.values({
					userId: ctx.session.user.id,
					telegramChatId: ctx.session.user.telegramId,
				})
				.returning();

			return newSettings;
		}

		return settings[0];
	}),

	updateNotificationSettings: protectedProcedure
		.input(
			z.object({
				enablePluginUpdates: z.boolean().optional(),
				enableSecurityAlerts: z.boolean().optional(),
				enableReviewNotifications: z.boolean().optional(),
				enableTelegramNotifications: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const now = Math.floor(Date.now() / 1000);
			const [settings] = await ctx.db
				.insert(userNotificationSettings)
				.values({
					userId: ctx.session.user.id,
					telegramChatId: ctx.session.user.telegramId,
					...input,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: userNotificationSettings.userId,
					set: {
						...input,
						updatedAt: now,
					},
				})
				.returning();

			return settings;
		}),
});

export const DEFAULT_AI_COLLECTION_THEMES = [
	"Полезные инструменты",
	"Удивить друзей",
	"Для работы и учебы",
	"Кастомизация интерфейса",
	"Развлечения и мемы",
	"Продуктивность",
	"Безопасность и приватность",
] as const;

export async function generateAndSaveAICollections(
	database: typeof import("~/server/db").db,
	themes: readonly string[],
	locale: AILocale = "ru",
) {
	const allPlugins = await database
		.select({
			id: plugins.id,
			name: plugins.name,
			shortDescription: plugins.shortDescription,
			category: plugins.category,
			tags: plugins.tags,
			rating: plugins.rating,
			downloadCount: plugins.downloadCount,
		})
		.from(plugins)
		.where(eq(plugins.status, "approved"));

	if (allPlugins.length === 0) {
		return [];
	}

	const aiChecker = new PluginAIChecker();
	const results: {
		theme: string;
		status: string;
		collection?: typeof aiPluginCollections.$inferSelect;
		error?: string;
	}[] = [];

	for (const theme of themes) {
		try {
			const collection = await aiChecker.generateAICollection(
				allPlugins,
				theme,
				locale,
			);

			const [savedCollection] = await database
				.insert(aiPluginCollections)
				.values({
					name: collection.collectionName,
					description: collection.collectionDescription,
					pluginIds: collection.pluginIds,
				})
				.returning();

			results.push({
				theme,
				status: "success",
				collection: savedCollection,
			});
		} catch {
			results.push({
				theme,
				status: "failed",
				error: "Generation failed",
			});
		}
	}

	aiChecker.cleanup();
	return results;
}

export const aiCollectionsRouter = createTRPCRouter({
	generateAndSaveAICollections: protectedProcedure
		.input(
			z.object({
				themes: z.array(z.string()).default([...DEFAULT_AI_COLLECTION_THEMES]),
				locale: z.enum(["en", "ru"]).default("ru"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!isAdminSessionUser(ctx.session.user)) {
				throw new Error("Unauthorized");
			}
			return generateAndSaveAICollections(ctx.db, input.themes, input.locale);
		}),

	getAICollections: publicProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(20).default(5),
			}),
		)
		.query(async ({ ctx, input }) => {
			const collections = await ctx.db
				.select()
				.from(aiPluginCollections)
				.orderBy(desc(aiPluginCollections.generatedAt))
				.limit(input.limit);

			if (collections.length === 0) {
				return [];
			}

			const result = await Promise.all(
				collections.map(
					async (collection: typeof aiPluginCollections.$inferSelect) => {
						const pluginsInCollection = await ctx.db
							.select()
							.from(plugins)
							.where(
								and(
									inArray(plugins.id, collection.pluginIds),
									eq(plugins.status, "approved"),
								),
							);

						return {
							...collection,
							plugins: pluginsInCollection,
						};
					},
				),
			);

			return result;
		}),
});
