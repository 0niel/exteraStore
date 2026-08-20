import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";
import { notifyPluginUpdateSubscribers } from "~/lib/telegram-notifications";
import { escapeHtml } from "~/lib/utils";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	notifications,
	pluginDownloads,
	plugins,
	pluginVersions,
	users,
} from "~/server/db/schema";
import { checkDownloadRateLimit, hashIp } from "~/server/lib/rate-limiter";
import {
	sendTelegramDocument,
	sendTelegramMessage,
	setTelegramWebhook,
} from "~/server/lib/telegram-client";

const ADMINS = (env.INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

function createDeepLink(pluginSlug: string, version?: string): string {
	const botUsername = env.TELEGRAM_BOT_USERNAME;
	if (!botUsername) {
		throw new Error("Telegram bot username not configured");
	}

	const params = version
		? `plugin_${pluginSlug}_v${version}`
		: `plugin_${pluginSlug}`;
	return `https://t.me/${botUsername}?start=${params}`;
}

export const telegramNotificationsRouter = createTRPCRouter({
	sendPlugin: protectedProcedure
		.input(
			z.object({
				pluginSlug: z.string(),
				version: z.string().optional(),
				chatId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const ip =
				ctx.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
				ctx.headers.get("x-real-ip");
			const userId = ctx.session.user.id;

			if (
				ctx.session.user.role !== "admin" &&
				input.chatId !== ctx.session.user.telegramId
			) {
				throw new Error("Недостаточно прав");
			}

			const plugin = await ctx.db
				.select()
				.from(plugins)
				.where(
					and(
						eq(plugins.slug, input.pluginSlug),
						eq(plugins.status, "approved"),
					),
				)
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Плагин не найден");
			}

			const rateLimit = await checkDownloadRateLimit(
				ctx.db,
				plugin[0].id,
				userId,
				ip,
			);
			if (rateLimit.limited) {
				throw new Error(rateLimit.reason);
			}

			let version: (typeof pluginVersions.$inferSelect)[];
			if (input.version) {
				version = await ctx.db
					.select()
					.from(pluginVersions)
					.where(
						and(
							eq(pluginVersions.pluginId, plugin[0].id),
							eq(pluginVersions.version, input.version),
						),
					)
					.limit(1);
			} else {
				version = await ctx.db
					.select()
					.from(pluginVersions)
					.where(
						and(
							eq(pluginVersions.pluginId, plugin[0].id),
							eq(pluginVersions.isStable, true),
						),
					)
					.orderBy(desc(pluginVersions.createdAt))
					.limit(1);
			}

			if (!version || !version[0]) {
				throw new Error("Версия не найдена");
			}

			const fileName = `${input.pluginSlug}-v${version[0].version}.plugin`;
			const fileContent = Buffer.from(version[0].fileContent, "utf-8");
			const caption = `Плагин ${escapeHtml(plugin[0].name)} версии ${escapeHtml(version[0].version)}`;

			await sendTelegramDocument(input.chatId, fileContent, fileName, caption);

			const existingDownload = await ctx.db
				.select({ id: pluginDownloads.id })
				.from(pluginDownloads)
				.where(
					and(
						eq(pluginDownloads.userId, userId),
						eq(pluginDownloads.versionId, version[0].id),
					),
				)
				.limit(1);

			await ctx.db.insert(pluginDownloads).values({
				pluginId: plugin[0].id,
				versionId: version[0].id,
				userId,
				ipHash: hashIp(ip),
				userAgent: ctx.headers.get("user-agent"),
			});

			if (!existingDownload[0]) {
				await ctx.db
					.update(plugins)
					.set({ downloadCount: sql`${plugins.downloadCount} + 1` })
					.where(eq(plugins.id, plugin[0].id));
				await ctx.db
					.update(pluginVersions)
					.set({
						downloadCount: sql`${pluginVersions.downloadCount} + 1`,
					})
					.where(eq(pluginVersions.id, version[0].id));
			}

			return { success: true };
		}),

	createDeepLink: publicProcedure
		.input(
			z.object({
				pluginSlug: z.string(),
				version: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ id: plugins.id })
				.from(plugins)
				.where(
					and(
						eq(plugins.slug, input.pluginSlug),
						eq(plugins.status, "approved"),
					),
				)
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Плагин не найден");
			}

			const deepLink = createDeepLink(input.pluginSlug, input.version);

			return { deepLink };
		}),

	notifySubscribers: protectedProcedure
		.input(
			z.object({
				pluginId: z.number(),
				newVersion: z.string(),
			}),
		)
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
				throw new Error("Недостаточно прав");
			}

			return notifyPluginUpdateSubscribers(
				ctx.db,
				input.pluginId,
				input.newVersion,
			);
		}),

	getNotifications: protectedProcedure
		.input(
			z.object({
				page: z.number().default(1),
				limit: z.number().default(20),
				unreadOnly: z.boolean().default(false),
			}),
		)
		.query(async ({ ctx, input }) => {
			const offset = (input.page - 1) * input.limit;

			const whereConditions = and(
				eq(notifications.userId, ctx.session.user.id),
				input.unreadOnly ? eq(notifications.isRead, false) : undefined,
			);

			const userNotifications = await ctx.db
				.select({
					id: notifications.id,
					type: notifications.type,
					title: notifications.title,
					message: notifications.message,
					data: notifications.data,
					isRead: notifications.isRead,
					createdAt: notifications.createdAt,
					plugin: {
						name: plugins.name,
						slug: plugins.slug,
					},
				})
				.from(notifications)
				.leftJoin(plugins, eq(notifications.pluginId, plugins.id))
				.where(whereConditions)
				.orderBy(desc(notifications.createdAt))
				.limit(input.limit)
				.offset(offset);

			return userNotifications;
		}),

	markAsRead: protectedProcedure
		.input(
			z.object({
				notificationIds: z.array(z.number()).min(1).max(100),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(notifications)
				.set({ isRead: true })
				.where(
					and(
						eq(notifications.userId, ctx.session.user.id),
						inArray(notifications.id, input.notificationIds),
					),
				);

			return { success: true };
		}),

	handleBotCommand: protectedProcedure
		.input(
			z.object({
				chatId: z.string(),
				command: z.string(),
				userId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				const isAdmin =
					ctx.session.user.role === "admin" ||
					ADMINS.includes(
						(ctx.session.user.telegramUsername ?? "").toLowerCase(),
					);
				if (!isAdmin) {
					throw new Error("Unauthorized");
				}

				if (input.command.startsWith("setadmin")) {
					const parts = input.command.split(" ");
					const targetUsername = parts[1]?.replace("@", "").toLowerCase();
					if (!targetUsername) {
						await sendTelegramMessage(
							input.chatId,
							"❌ Требуется имя пользователя",
						);
						return { success: false };
					}

					const requester = input.userId
						? await ctx.db
								.select({ role: users.role, username: users.telegramUsername })
								.from(users)
								.where(eq(users.telegramId, input.userId))
								.limit(1)
						: [];

					const requesterIsAdmin =
						requester[0]?.role === "admin" ||
						(requester[0]?.username &&
							ADMINS.includes(requester[0].username.toLowerCase()));

					if (!requesterIsAdmin) {
						await sendTelegramMessage(input.chatId, "❌ Недостаточно прав");
						return { success: false };
					}

					await ctx.db
						.update(users)
						.set({ role: "admin" })
						.where(eq(users.telegramUsername, targetUsername));

					await sendTelegramMessage(
						input.chatId,
						`✅ ${targetUsername} теперь администратор`,
					);
					return { success: true, action: "admin_set" };
				}

				if (input.command.startsWith("plugin_")) {
					const commandWithoutPrefix = input.command.substring(7);
					const versionMatch = commandWithoutPrefix.match(/_v(.+)$/);
					const pluginSlug = versionMatch
						? commandWithoutPrefix.substring(
								0,
								commandWithoutPrefix.lastIndexOf("_v"),
							)
						: commandWithoutPrefix;
					const versionStr = versionMatch ? versionMatch[1] : undefined;

					const plugin = await ctx.db
						.select()
						.from(plugins)
						.where(
							and(eq(plugins.slug, pluginSlug), eq(plugins.status, "approved")),
						)
						.limit(1);

					if (!plugin[0]) {
						throw new Error("Плагин не найден");
					}

					const rateLimit = await checkDownloadRateLimit(
						ctx.db,
						plugin[0].id,
						input.userId,
						null,
					);

					if (rateLimit.limited) {
						await sendTelegramMessage(input.chatId, `❌ ${rateLimit.reason}`);
						return { success: false };
					}

					let version_data: (typeof pluginVersions.$inferSelect)[];
					if (versionStr) {
						version_data = await ctx.db
							.select()
							.from(pluginVersions)
							.where(
								and(
									eq(pluginVersions.pluginId, plugin[0].id),
									eq(pluginVersions.version, versionStr),
								),
							)
							.limit(1);
					} else {
						version_data = await ctx.db
							.select()
							.from(pluginVersions)
							.where(
								and(
									eq(pluginVersions.pluginId, plugin[0].id),
									eq(pluginVersions.isStable, true),
								),
							)
							.orderBy(desc(pluginVersions.createdAt))
							.limit(1);
					}

					if (!version_data || !version_data[0]) {
						throw new Error("Версия не найдена");
					}

					const fileName = `${pluginSlug}-v${version_data[0].version}.plugin`;
					const fileContent = Buffer.from(version_data[0].fileContent, "utf-8");

					if (input.userId) {
						const user = await ctx.db
							.select({
								isBanned: users.isBanned,
								bannedReason: users.bannedReason,
							})
							.from(users)
							.where(eq(users.id, input.userId))
							.limit(1);

						if (user[0]?.isBanned) {
							await sendTelegramMessage(
								input.chatId,
								`❌ ${user[0].bannedReason || "Your account has been banned"}`,
							);
							return { success: false, action: "user_banned" };
						}
					}

					if (input.userId && version_data[0]) {
						const existingDownload = await ctx.db
							.select()
							.from(pluginDownloads)
							.where(
								and(
									eq(pluginDownloads.userId, input.userId),
									eq(pluginDownloads.versionId, version_data[0].id),
								),
							)
							.limit(1);

						if (!existingDownload[0]) {
							await ctx.db.insert(pluginDownloads).values({
								pluginId: plugin[0].id,
								versionId: version_data[0].id,
								userId: input.userId,
								ipHash: null,
								userAgent: `Telegram Bot User ${input.userId}`,
							});

							await ctx.db
								.update(plugins)
								.set({
									downloadCount: plugin[0].downloadCount + 1,
								})
								.where(eq(plugins.id, plugin[0].id));

							await ctx.db
								.update(pluginVersions)
								.set({
									downloadCount: version_data[0].downloadCount + 1,
								})
								.where(eq(pluginVersions.id, version_data[0].id));
						}
					}

					const updatedPlugin = await ctx.db
						.select()
						.from(plugins)
						.where(eq(plugins.id, plugin[0].id))
						.limit(1);

					const safeName = escapeHtml(updatedPlugin[0]?.name || "");
					const safeDesc = escapeHtml(
						updatedPlugin[0]?.shortDescription ||
							updatedPlugin[0]?.description.substring(0, 100) ||
							"",
					);
					const safeAuthor = escapeHtml(updatedPlugin[0]?.author || "");

					const caption =
						`🔌 <b>${safeName}</b> v${version_data[0].version}\n\n` +
						`📝 ${safeDesc}...\n\n` +
						`👤 Автор: ${safeAuthor}\n📊 Рейтинг: ${updatedPlugin[0]?.rating.toFixed(1)}/5 (${updatedPlugin[0]?.ratingCount} отзывов)\n⬇️ Скачиваний: ${updatedPlugin[0]?.downloadCount}\n\nУстановите этот плагин в exteraGram!`;

					await sendTelegramDocument(
						input.chatId,
						fileContent,
						fileName,
						caption,
					);

					return { success: true, action: "plugin_sent" };
				}

				return { success: true, action: "unknown_command" };
			} catch (error) {
				console.error("Bot command error:", error);

				await sendTelegramMessage(
					input.chatId,
					"❌ Ошибка при обработке команды. Попробуйте позже.",
				);

				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	broadcast: protectedProcedure
		.input(
			z.object({
				message: z.string().min(1).max(4096),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);

			if (!isAdmin) {
				throw new Error("Unauthorized");
			}

			const usersWithTelegram = await ctx.db
				.select({
					telegramId: users.telegramId,
					name: users.name,
				})
				.from(users)
				.where(sql`${users.telegramId} IS NOT NULL`);

			const results = { sent: 0, failed: 0 };

			for (const user of usersWithTelegram) {
				try {
					if (user.telegramId) {
						await sendTelegramMessage(user.telegramId, input.message);
						results.sent++;
					}
				} catch (error) {
					console.error(`Failed to send message to ${user.name}:`, error);
					results.failed++;
				}

				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			return results;
		}),

	sendPersonalMessage: protectedProcedure
		.input(
			z.object({
				username: z.string().min(1),
				message: z.string().min(1).max(4096),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);

			if (!isAdmin) {
				throw new Error("Unauthorized");
			}

			const user = await ctx.db
				.select({
					telegramId: users.telegramId,
					name: users.name,
				})
				.from(users)
				.where(eq(users.telegramUsername, input.username.replace("@", "")))
				.limit(1);

			if (!user[0] || !user[0].telegramId) {
				throw new Error("User not found or has no Telegram ID");
			}

			await sendTelegramMessage(user[0].telegramId, input.message);

			return { success: true, userFound: true };
		}),

	testMessage: protectedProcedure
		.input(
			z.object({
				chatId: z.string(),
				message: z.string().min(1).max(4096),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);

			if (!isAdmin) {
				throw new Error("Unauthorized");
			}

			await sendTelegramMessage(input.chatId, input.message);

			return { success: true };
		}),

	setWebhook: protectedProcedure
		.input(
			z.object({
				url: z.string().url(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);

			if (!isAdmin) {
				throw new Error("Unauthorized");
			}

			if (!env.TELEGRAM_BOT_TOKEN) {
				throw new Error("Telegram bot token not configured");
			}
			const data = await setTelegramWebhook(input.url);
			return { success: true, data };
		}),
});
