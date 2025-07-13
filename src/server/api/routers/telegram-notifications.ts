import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	notifications,
	pluginVersions,
	plugins,
	userNotificationSettings,
	userPluginSubscriptions,
	users,
} from "~/server/db/schema";

const ADMINS = (env.INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

class TelegramBot {
	private static readonly BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
	private static readonly API_URL =
		`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

	static async sendMessage(
		chatId: string,
		text: string,
		options?: {
			parse_mode?: "HTML" | "Markdown";
			reply_markup?: any;
		},
	) {
		if (!TelegramBot.BOT_TOKEN) {
			throw new Error("Telegram bot token not configured");
		}

		try {
			const response = await fetch(`${TelegramBot.API_URL}/sendMessage`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					chat_id: chatId,
					text,
					...options,
				}),
			});

			if (!response.ok) {
				throw new Error(`Telegram API error: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error("Failed to send Telegram message:", error);
			throw error;
		}
	}

	static async sendDocument(
		chatId: string,
		document: Buffer,
		filename: string,
		caption?: string,
	) {
		if (!TelegramBot.BOT_TOKEN) {
			throw new Error("Telegram bot token not configured");
		}

		try {
			const formData = new FormData();
			formData.append("chat_id", chatId);
			formData.append("document", new Blob([document]), filename);
			if (caption) {
				formData.append("caption", caption);
			}

			const response = await fetch(`${TelegramBot.API_URL}/sendDocument`, {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`Telegram API error: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error("Failed to send Telegram document:", error);
			throw error;
		}
	}

	static createDeepLink(pluginSlug: string, version?: string): string {
		const botUsername = process.env.TELEGRAM_BOT_USERNAME;
		if (!botUsername) {
			throw new Error("Telegram bot username not configured");
		}

		const params = version
			? `plugin_${pluginSlug}_v${version}`
			: `plugin_${pluginSlug}`;
		return `https://t.me/${botUsername}?start=${params}`;
	}
}

export const telegramNotificationsRouter = createTRPCRouter({
	sendPlugin: publicProcedure
		.input(
			z.object({
				pluginSlug: z.string(),
				version: z.string().optional(),
				chatId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select()
				.from(plugins)
				.where(eq(plugins.slug, input.pluginSlug))
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}

			let version;
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
				throw new Error("Version not found");
			}

			const fileName = `${input.pluginSlug}-v${version[0].version}.plugin`;
			const fileContent = Buffer.from(version[0].fileContent, "utf-8");

			await ctx.db
				.update(plugins)
				.set({
					downloadCount: plugin[0].downloadCount + 1,
				})
				.where(eq(plugins.id, plugin[0].id));

			await ctx.db
				.update(pluginVersions)
				.set({
					downloadCount: version[0].downloadCount + 1,
				})
				.where(eq(pluginVersions.id, version[0].id));

			const updatedPlugin = await ctx.db
				.select()
				.from(plugins)
				.where(eq(plugins.id, plugin[0].id))
				.limit(1);

			const caption =
				`🔌 <b>${updatedPlugin[0]?.name}</b> v${version[0].version}\n\n` +
				`📝 ${updatedPlugin[0]?.shortDescription || updatedPlugin[0]?.description.substring(0, 100)}...\n\n` +
				`👤 Author: ${updatedPlugin[0]?.author}\n📊 Rating: ${updatedPlugin[0]?.rating.toFixed(1)}/5 (${updatedPlugin[0]?.ratingCount} reviews)\n⬇️ Downloads: ${updatedPlugin[0]?.downloadCount}\n\nInstall this plugin in exteraGram!`;

			await TelegramBot.sendDocument(
				input.chatId,
				fileContent,
				fileName,
				caption,
			);

			return { success: true };
		}),

	createDeepLink: publicProcedure
		.input(
			z.object({
				pluginSlug: z.string(),
				version: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ id: plugins.id })
				.from(plugins)
				.where(eq(plugins.slug, input.pluginSlug))
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}

			const deepLink = TelegramBot.createDeepLink(
				input.pluginSlug,
				input.version,
			);

			await ctx.db
				.update(plugins)
				.set({
					telegramBotDeeplink: deepLink,
				})
				.where(eq(plugins.id, plugin[0].id));

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
				throw new Error("Unauthorized");
			}

			const subscribers = await ctx.db
				.select({
					userId: userPluginSubscriptions.userId,
					telegramChatId: userPluginSubscriptions.telegramChatId,
					user: {
						telegramId: users.telegramId,
						name: users.name,
					},
				})
				.from(userPluginSubscriptions)
				.leftJoin(users, eq(userPluginSubscriptions.userId, users.id))
				.where(
					and(
						eq(userPluginSubscriptions.pluginId, input.pluginId),
						eq(userPluginSubscriptions.subscriptionType, "updates"),
						eq(userPluginSubscriptions.isActive, true),
					),
				);

			const results = [];

			for (const subscriber of subscribers) {
				try {
					const settings = await ctx.db
						.select()
						.from(userNotificationSettings)
						.where(eq(userNotificationSettings.userId, subscriber.userId))
						.limit(1);

					if (settings[0] && !settings[0].enablePluginUpdates) {
						continue;
					}

					const chatId =
						subscriber.telegramChatId || subscriber.user?.telegramId;
					if (!chatId) {
						continue;
					}

					const message = `🔄 <b>Plugin update!</b>\n\n🔌 <b>${plugin[0].name}</b> updated to version <b>${input.newVersion}</b>\n\nDownload update using:\n/download_${plugin[0].slug}_v${input.newVersion}`;

					await TelegramBot.sendMessage(chatId, message, {
						parse_mode: "HTML",
						reply_markup: {
							inline_keyboard: [
								[
									{
										text: "⬇️ Download Update",
										url: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=plugin_${plugin[0].slug}_v${input.newVersion}`,
									},
								],
								[
									{
										text: "🔕 Unsubscribe",
										callback_data: `unsubscribe_${input.pluginId}_${subscriber.userId}`,
									},
								],
							],
						},
					});

					await ctx.db.insert(notifications).values({
						userId: subscriber.userId,
						pluginId: input.pluginId,
						type: "plugin_update",
						title: `Update ${plugin[0].name}`,
						message: `Plugin ${plugin[0].name} updated to version ${input.newVersion}`,
						data: JSON.stringify({ version: input.newVersion }),
						sentToTelegram: true,
					});

					results.push({ userId: subscriber.userId, status: "sent" });
				} catch (error) {
					console.error(`Failed to notify user ${subscriber.userId}:`, error);
					results.push({
						userId: subscriber.userId,
						status: "failed",
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			return {
				notified: results.filter((r) => r.status === "sent").length,
				failed: results.filter((r) => r.status === "failed").length,
				results,
			};
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
				notificationIds: z.array(z.number()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(notifications)
				.set({ isRead: true })
				.where(and(eq(notifications.userId, ctx.session.user.id)));

			return { success: true };
		}),

	handleBotCommand: publicProcedure
		.input(
			z.object({
				chatId: z.string(),
				command: z.string(),
				userId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				if (input.command.startsWith("setadmin")) {
					const parts = input.command.split(" ");
					const targetUsername = parts[1]?.replace("@", "").toLowerCase();
					if (!targetUsername) {
						await TelegramBot.sendMessage(input.chatId, "❌ Username required");
						return { success: false };
					}

					const requester = input.userId
						? await ctx.db
								.select({ role: users.role, username: users.telegramUsername })
								.from(users)
								.where(eq(users.telegramId, input.userId))
								.limit(1)
						: [];

					const requesterUsername = requester[0]?.username?.toLowerCase() ?? "";
					const requesterIsAdmin =
						requester[0]?.role === "admin" ||
						(requester[0]?.username &&
							ADMINS.includes(requester[0].username.toLowerCase()));

					if (!requesterIsAdmin) {
						await TelegramBot.sendMessage(input.chatId, "❌ Unauthorized");
						return { success: false };
					}

					await ctx.db
						.update(users)
						.set({ role: "admin" })
						.where(eq(users.telegramUsername, targetUsername));

					await TelegramBot.sendMessage(
						input.chatId,
						`✅ ${targetUsername} is now admin`,
					);
					return { success: true, action: "admin_set" };
				}

				if (input.command.startsWith("plugin_")) {
					const parts = input.command.split("_");
					const pluginSlug = parts.slice(1, -1).join("_");
					const versionPart = parts[parts.length - 1];
					const version = versionPart?.startsWith("v")
						? versionPart.substring(1)
						: undefined;

					const plugin = await ctx.db
						.select()
						.from(plugins)
						.where(eq(plugins.slug, pluginSlug))
						.limit(1);

					if (!plugin[0]) {
						throw new Error("Plugin not found");
					}

					let version_data;
					if (version) {
						version_data = await ctx.db
							.select()
							.from(pluginVersions)
							.where(
								and(
									eq(pluginVersions.pluginId, plugin[0].id),
									eq(pluginVersions.version, version),
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
						throw new Error("Version not found");
					}

					const fileName = `${pluginSlug}-v${version_data[0].version}.plugin`;
					const fileContent = Buffer.from(version_data[0].fileContent, "utf-8");

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

					const updatedPlugin = await ctx.db
						.select()
						.from(plugins)
						.where(eq(plugins.id, plugin[0].id))
						.limit(1);

					const caption =
						`🔌 <b>${updatedPlugin[0]?.name}</b> v${version_data[0].version}\n\n` +
						`📝 ${updatedPlugin[0]?.shortDescription || updatedPlugin[0]?.description.substring(0, 100)}...\n\n` +
						`👤 Author: ${updatedPlugin[0]?.author}\n📊 Rating: ${updatedPlugin[0]?.rating.toFixed(1)}/5 (${updatedPlugin[0]?.ratingCount} reviews)\n⬇️ Downloads: ${updatedPlugin[0]?.downloadCount}\n\nInstall this plugin in exteraGram!`;

					await TelegramBot.sendDocument(
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

				await TelegramBot.sendMessage(
					input.chatId,
					"❌ Error processing command. Please try again later.",
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
				message: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAdmin = ctx.session.user.role === "admin" || 
				ADMINS.includes(ctx.session.user.name?.toLowerCase() ?? "");

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
						await TelegramBot.sendMessage(user.telegramId, input.message);
						results.sent++;
					}
				} catch (error) {
					console.error(`Failed to send message to ${user.name}:`, error);
					results.failed++;
				}

				await new Promise(resolve => setTimeout(resolve, 100));
			}

			return results;
		}),

	sendPersonalMessage: protectedProcedure
		.input(
			z.object({
				username: z.string().min(1),
				message: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAdmin = ctx.session.user.role === "admin" || 
				ADMINS.includes(ctx.session.user.name?.toLowerCase() ?? "");

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

			await TelegramBot.sendMessage(user[0].telegramId, input.message);

			return { success: true, userFound: true };
		}),

	testMessage: protectedProcedure
		.input(
			z.object({
				chatId: z.string(),
				message: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAdmin = ctx.session.user.role === "admin" || 
				ADMINS.includes(ctx.session.user.name?.toLowerCase() ?? "");

			if (!isAdmin) {
				throw new Error("Unauthorized");
			}

			await TelegramBot.sendMessage(input.chatId, input.message);

			return { success: true };
		}),

	setWebhook: protectedProcedure
		.input(
			z.object({
				url: z.string().url(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAdmin = ctx.session.user.role === "admin" || 
				ADMINS.includes(ctx.session.user.name?.toLowerCase() ?? "");

			if (!isAdmin) {
				throw new Error("Unauthorized");
			}

			if (!process.env.TELEGRAM_BOT_TOKEN) {
				throw new Error("Telegram bot token not configured");
			}

			const response = await fetch(
				`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						url: input.url,
					}),
				},
			);

			if (!response.ok) {
				throw new Error(`Failed to set webhook: ${response.statusText}`);
			}

			const data = await response.json();
			return { success: true, data };
		}),
});
