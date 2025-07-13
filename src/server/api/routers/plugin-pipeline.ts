import { and, count, desc, eq, like, sql } from "drizzle-orm";
import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	notifications,
	pluginPipelineChecks,
	pluginPipelineQueue,
	userNotificationSettings,
	userPluginSubscriptions,
} from "~/server/db/pipeline-schema";
import { pluginVersions, plugins } from "~/server/db/schema";
import { PluginAIChecker } from "./plugin-pipeline-ai";

// Функция для обработки одного элемента очереди
async function processQueueItem(ctx: any, queueItemId: number) {
	const queueItem = await ctx.db
		.select()
		.from(pluginPipelineQueue)
		.where(eq(pluginPipelineQueue.id, queueItemId))
		.limit(1);

	if (!queueItem[0] || queueItem[0].status !== "queued") {
		return;
	}

	const item = queueItem[0];

	try {
		await ctx.db
			.update(pluginPipelineQueue)
			.set({
				status: "processing",
				startedAt: Math.floor(Date.now() / 1000),
			})
			.where(eq(pluginPipelineQueue.id, item.id));

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

		for (const check of checks) {
			const startTime = Date.now();

			try {
				await ctx.db.insert(pluginPipelineChecks).values({
					pluginId: item.pluginId,
					checkType: check.type,
					status: "running",
					llmModel: "google/gemini-2.5-pro-exp-03-25",
					llmPrompt: `Version: ${latestVersion[0].version}`,
				});

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
					.where(
						and(
							eq(pluginPipelineChecks.pluginId, item.pluginId),
							eq(pluginPipelineChecks.checkType, check.type),
							eq(pluginPipelineChecks.status, "running"),
						),
					);
			} catch (error) {
				await ctx.db
					.update(pluginPipelineChecks)
					.set({
						status: "error",
						errorMessage:
							error instanceof Error ? error.message : "Unknown error",
						completedAt: Math.floor(Date.now() / 1000),
					})
					.where(
						and(
							eq(pluginPipelineChecks.pluginId, item.pluginId),
							eq(pluginPipelineChecks.checkType, check.type),
							eq(pluginPipelineChecks.status, "running"),
						),
					);
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

		const checkResults = await ctx.db
			.select()
			.from(pluginPipelineChecks)
			.where(
				and(
					eq(pluginPipelineChecks.pluginId, item.pluginId),
					sql`${pluginPipelineChecks.createdAt} > ${item.createdAt}`,
				),
			);

		const hasCriticalIssues = checkResults.some(
			(check: typeof pluginPipelineChecks.$inferSelect) =>
				check.status === "failed" && check.score !== null && check.score < 50,
		);

		if (hasCriticalIssues) {
			const subscribers = await ctx.db
				.select()
				.from(userPluginSubscriptions)
				.where(
					and(
						eq(userPluginSubscriptions.pluginId, item.pluginId),
						eq(userPluginSubscriptions.subscriptionType, "security_alerts"),
						eq(userPluginSubscriptions.isActive, true),
					),
				);

			for (const subscriber of subscribers) {
				await ctx.db.insert(notifications).values({
					userId: subscriber.userId,
					pluginId: item.pluginId,
					type: "security_alert",
					title: "Критические проблемы найдены",
					message: `В плагине ${plugin[0].name} обнаружены критические проблемы безопасности или производительности. Проверьте результаты проверки.`,
				});
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
		.input(z.object({ pluginSlug: z.string() }))
		.query(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ id: plugins.id })
				.from(plugins)
				.where(eq(plugins.slug, input.pluginSlug))
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}

			const checks = await ctx.db
				.select()
				.from(pluginPipelineChecks)
				.where(eq(pluginPipelineChecks.pluginId, plugin[0].id))
				.orderBy(desc(pluginPipelineChecks.createdAt));

			return checks;
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
					ctx.session.user.role !== "admin")
			) {
				throw new Error("Unauthorized");
			}

			// Получаем последнюю версию плагина
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

			// Проверяем, была ли уже проведена проверка для этой версии
			const versionTag = `%Version: ${latestVersion[0].version}%`;
			const existingChecks = await ctx.db
				.select()
				.from(pluginPipelineChecks)
				.where(
					and(
						eq(pluginPipelineChecks.pluginId, input.pluginId),
						like(pluginPipelineChecks.llmPrompt, versionTag),
					),
				)
				.limit(1);

			if (existingChecks.length > 0) {
				throw new Error("Checks already performed for the latest version");
			}

			// Проверяем, нет ли уже активной проверки в очереди
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

			if (activeQueue.length > 0) {
				throw new Error("Checks are already in progress for this plugin");
			}

			const [queueItem] = await ctx.db
				.insert(pluginPipelineQueue)
				.values({
					pluginId: input.pluginId,
					priority: 5,
					scheduledAt: Math.floor(Date.now() / 1000),
				})
				.returning();

			// Автоматически обрабатываем очередь в фоне
			processQueueItem(ctx, queueItem.id).catch((error) => {
				console.error("Error processing queue item in background:", error);
			});

			return queueItem;
		}),

	getQueueStatus: publicProcedure
		.query(async ({ ctx }) => {
			const queueItems = await ctx.db
				.select()
				.from(pluginPipelineQueue)
				.where(sql`${pluginPipelineQueue.status} IN ('queued', 'processing')`)
				.orderBy(desc(pluginPipelineQueue.createdAt));

			return {
				totalInQueue: queueItems.length,
				processing: queueItems.filter((item: any) => item.status === "processing").length,
				queued: queueItems.filter((item: any) => item.status === "queued").length,
			};
		}),

	getPluginQueueStatus: publicProcedure
		.input(z.object({ pluginSlug: z.string() }))
		.query(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ id: plugins.id })
				.from(plugins)
				.where(eq(plugins.slug, input.pluginSlug))
				.limit(1);

			if (!plugin[0]) {
				return null;
			}

			const queueItem = await ctx.db
				.select()
				.from(pluginPipelineQueue)
				.where(
					and(
						eq(pluginPipelineQueue.pluginId, plugin[0].id),
						sql`${pluginPipelineQueue.status} IN ('queued', 'processing')`
					)
				)
				.limit(1);

			return queueItem[0] || null;
		}),

	processQueue: protectedProcedure
		.input(z.object({ limit: z.number().default(5) }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
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

			const results = [];

			for (const item of queueItems) {
				try {
					await ctx.db
						.update(pluginPipelineQueue)
						.set({
							status: "processing",
							startedAt: Math.floor(Date.now() / 1000),
						})
						.where(eq(pluginPipelineQueue.id, item.id));

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

					for (const check of checks) {
						const startTime = Date.now();

						try {
							await ctx.db.insert(pluginPipelineChecks).values({
								pluginId: item.pluginId,
								checkType: check.type,
								status: "running",
								llmModel: "google/gemini-2.5-pro",
								llmPrompt: `Version: ${latestVersion[0].version}`,
							});

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
								.where(
									and(
										eq(pluginPipelineChecks.pluginId, item.pluginId),
										eq(pluginPipelineChecks.checkType, check.type),
										eq(pluginPipelineChecks.status, "running"),
									),
								);
						} catch (error) {
							await ctx.db
								.update(pluginPipelineChecks)
								.set({
									status: "error",
									errorMessage:
										error instanceof Error ? error.message : "Unknown error",
									completedAt: Math.floor(Date.now() / 1000),
								})
								.where(
									and(
										eq(pluginPipelineChecks.pluginId, item.pluginId),
										eq(pluginPipelineChecks.checkType, check.type),
										eq(pluginPipelineChecks.status, "running"),
									),
								);
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

					const checkResults = await ctx.db
						.select()
						.from(pluginPipelineChecks)
						.where(
							and(
								eq(pluginPipelineChecks.pluginId, item.pluginId),
								sql`${pluginPipelineChecks.createdAt} > ${item.createdAt}`,
							),
						);

					const hasCriticalIssues = checkResults.some(
						(check: typeof pluginPipelineChecks.$inferSelect) =>
							check.status === "failed" &&
							check.score !== null &&
							check.score < 50,
					);

					if (hasCriticalIssues) {
						const subscribers = await ctx.db
							.select()
							.from(userPluginSubscriptions)
							.where(
								and(
									eq(userPluginSubscriptions.pluginId, item.pluginId),
									eq(
										userPluginSubscriptions.subscriptionType,
										"security_alerts",
									),
									eq(userPluginSubscriptions.isActive, true),
								),
							);

						for (const subscriber of subscribers) {
							await ctx.db.insert(notifications).values({
								userId: subscriber.userId,
								pluginId: item.pluginId,
								type: "security_alert",
								title: "Критические проблемы найдены",
								message: `В плагине ${plugin[0].name} обнаружены критические проблемы безопасности или производительности. Проверьте результаты проверки.`,
							});
						}
					}

					results.push({ pluginId: item.pluginId, status: "completed" });
				} catch (error) {
					await ctx.db
						.update(pluginPipelineQueue)
						.set({
							status: "failed",
							errorMessage:
								error instanceof Error ? error.message : "Unknown error",
							retryCount: item.retryCount + 1,
							completedAt: Math.floor(Date.now() / 1000),
						})
						.where(eq(pluginPipelineQueue.id, item.id));

					results.push({
						pluginId: item.pluginId,
						status: "failed",
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			return results;
		}),

	subscribe: protectedProcedure
		.input(
			z.object({
				pluginId: z.number(),
				subscriptionType: z.enum(["updates", "reviews", "security_alerts"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [subscription] = await ctx.db
				.insert(userPluginSubscriptions)
				.values({
					userId: ctx.session.user.id,
					pluginId: input.pluginId,
					subscriptionType: input.subscriptionType,
					telegramChatId: ctx.session.user.telegramId,
				})
				.onConflictDoNothing()
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
			const [settings] = await ctx.db
				.update(userNotificationSettings)
				.set({
					...input,
					updatedAt: Math.floor(Date.now() / 1000),
				})
				.where(eq(userNotificationSettings.userId, ctx.session.user.id))
				.returning();

			return settings;
		}),


});
