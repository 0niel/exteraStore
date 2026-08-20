import { and, eq, inArray } from "drizzle-orm";
import { env } from "~/env.js";
import type { db as database } from "~/server/db";
import {
	plugins,
	userNotificationSettings,
	userPluginSubscriptions,
	users,
} from "~/server/db/schema";
import {
	sendTelegramMessage,
	type TelegramReplyMarkup,
} from "~/server/lib/telegram-client";

type Database = typeof database;

export type NotificationGateType = "updates" | "security" | "reviews";

export async function getAllowedNotificationUserIds(
	db: Database,
	userIds: string[],
	type: NotificationGateType,
): Promise<Set<string>> {
	const allowed = new Set(userIds);
	if (userIds.length === 0) {
		return allowed;
	}

	const settingsRows = await db
		.select({
			userId: userNotificationSettings.userId,
			enableTelegramNotifications:
				userNotificationSettings.enableTelegramNotifications,
			enablePluginUpdates: userNotificationSettings.enablePluginUpdates,
			enableSecurityAlerts: userNotificationSettings.enableSecurityAlerts,
			enableReviewNotifications:
				userNotificationSettings.enableReviewNotifications,
		})
		.from(userNotificationSettings)
		.where(inArray(userNotificationSettings.userId, userIds));

	for (const row of settingsRows) {
		const typeEnabled =
			type === "updates"
				? row.enablePluginUpdates
				: type === "security"
					? row.enableSecurityAlerts
					: row.enableReviewNotifications;

		if (!row.enableTelegramNotifications || !typeEnabled) {
			allowed.delete(row.userId);
		}
	}

	return allowed;
}

export type SubscriberNotifyResult = {
	subscriber: string;
	status: "sent" | "failed" | "skipped";
	reason?: string;
};

export async function notifyPluginUpdateSubscribers(
	db: Database,
	pluginId: number,
	newVersion: string,
): Promise<{
	notified: number;
	failed: number;
	results: SubscriberNotifyResult[];
}> {
	const plugin = await db
		.select({ name: plugins.name, slug: plugins.slug })
		.from(plugins)
		.where(eq(plugins.id, pluginId))
		.limit(1);

	if (!plugin[0]) {
		return { notified: 0, failed: 0, results: [] };
	}

	const subscribers = await db
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
				eq(userPluginSubscriptions.pluginId, pluginId),
				eq(userPluginSubscriptions.subscriptionType, "updates"),
				eq(userPluginSubscriptions.isActive, true),
			),
		);

	const allowedUserIds = await getAllowedNotificationUserIds(
		db,
		subscribers.map((s: { userId: string }) => s.userId),
		"updates",
	);

	const results: SubscriberNotifyResult[] = [];
	const baseUrl = env.NEXTAUTH_URL || "http://localhost:3000";
	const pluginUrl = `${baseUrl}/plugins/${plugin[0].slug}`;

	for (const subscriber of subscribers) {
		if (!allowedUserIds.has(subscriber.userId)) {
			results.push({
				subscriber: subscriber.user?.name ?? "Unknown",
				status: "skipped",
				reason: "Notifications disabled in settings",
			});
			continue;
		}

		try {
			const chatId = subscriber.telegramChatId ?? subscriber.user?.telegramId;
			if (chatId) {
				const message = `🎉 Обновление плагина!\n\n🔌 *${plugin[0].name}* v${newVersion} теперь доступен.\n\nНажмите, чтобы посмотреть детали.`;

				await sendTelegramMessage(chatId, message, {
					parse_mode: "Markdown",
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: "👀 Посмотреть",
									url: pluginUrl,
								},
							],
							[
								{
									text: "🔕 Отписаться",
									callback_data: `unsubscribe_${pluginId}_${subscriber.userId}`,
								},
							],
						],
					},
				});
				results.push({
					subscriber: subscriber.user?.name ?? "Unknown",
					status: "sent",
				});
			} else {
				results.push({
					subscriber: subscriber.user?.name ?? "Unknown",
					status: "failed",
					reason: "No chat ID",
				});
			}
		} catch (error) {
			console.error(
				`Failed to send notification to ${subscriber.user?.name}:`,
				error,
			);
			results.push({
				subscriber: subscriber.user?.name ?? "Unknown",
				status: "failed",
				reason: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	return {
		notified: results.filter((r) => r.status === "sent").length,
		failed: results.filter((r) => r.status === "failed").length,
		results,
	};
}

interface TelegramMessage {
	chat_id: number | string;
	text: string;
	parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
	reply_markup?: TelegramReplyMarkup;
}

export async function notifyReviewSubscribers(
	db: Database,
	params: {
		pluginId: number;
		reviewAuthorId: string;
		reviewerName: string;
		rating: number;
	},
): Promise<void> {
	const plugin = await db
		.select({ name: plugins.name, slug: plugins.slug })
		.from(plugins)
		.where(eq(plugins.id, params.pluginId))
		.limit(1);

	if (!plugin[0]) {
		return;
	}

	const subscribers = await db
		.select({
			userId: userPluginSubscriptions.userId,
			telegramChatId: userPluginSubscriptions.telegramChatId,
			userTelegramId: users.telegramId,
		})
		.from(userPluginSubscriptions)
		.leftJoin(users, eq(userPluginSubscriptions.userId, users.id))
		.where(
			and(
				eq(userPluginSubscriptions.pluginId, params.pluginId),
				eq(userPluginSubscriptions.subscriptionType, "reviews"),
				eq(userPluginSubscriptions.isActive, true),
			),
		);

	const recipients = subscribers.filter(
		(s: { userId: string }) => s.userId !== params.reviewAuthorId,
	);

	const allowedUserIds = await getAllowedNotificationUserIds(
		db,
		recipients.map((s: { userId: string }) => s.userId),
		"reviews",
	);

	const baseUrl = env.NEXTAUTH_URL || "http://localhost:3000";
	const pluginUrl = `${baseUrl}/plugins/${plugin[0].slug}`;
	const stars = "⭐".repeat(
		Math.max(1, Math.min(5, Math.round(params.rating))),
	);
	const text = `💬 Новый отзыв!\n\n🔌 Плагин: *${plugin[0].name}*\n👤 ${params.reviewerName}\n${stars} (${params.rating}/5)`;

	for (const subscriber of recipients) {
		if (!allowedUserIds.has(subscriber.userId)) {
			continue;
		}

		const chatId = subscriber.telegramChatId ?? subscriber.userTelegramId;
		if (!chatId) {
			continue;
		}

		try {
			await sendTelegramMessage(chatId, text, {
				parse_mode: "Markdown",
				reply_markup: {
					inline_keyboard: [[{ text: "👀 Посмотреть", url: pluginUrl }]],
				},
			});
		} catch {
			console.error("Failed to send review TG notification");
		}
	}
}

export async function sendNotificationMessage(
	message: TelegramMessage,
): Promise<boolean> {
	if (!env.TELEGRAM_BOT_TOKEN) {
		console.error("Telegram bot token not configured");
		return false;
	}

	try {
		const { chat_id, text, ...options } = message;
		await sendTelegramMessage(chat_id, text, options);
		return true;
	} catch {
		console.error("Error sending Telegram message");
		return false;
	}
}

export async function notifyPluginApproved(
	chatId: number | string,
	pluginName: string,
	pluginSlug: string,
	authorName: string,
): Promise<boolean> {
	const baseUrl = env.NEXTAUTH_URL || "http://localhost:3000";

	const message: TelegramMessage = {
		chat_id: chatId,
		text: `🎉 *Ваш плагин одобрен!*\n\n📦 Плагин: *${pluginName}*\n👨‍💻 Автор: ${authorName}\n\n✅ Ваш плагин прошел модерацию и теперь доступен в каталоге exteraStore!\n\n🌐 Пользователи могут найти и скачать ваш плагин прямо сейчас.`,
		parse_mode: "Markdown",
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: "📖 Посмотреть плагин",
						url: `${baseUrl}/plugins/${pluginSlug}`,
					},
				],
				[
					{
						text: "🌐 Каталог плагинов",
						url: `${baseUrl}/plugins`,
					},
					{
						text: "⚙️ Управление плагинами",
						url: `${baseUrl}/my-plugins`,
					},
				],
			],
		},
	};

	return sendNotificationMessage(message);
}

export async function notifyPluginRejected(
	chatId: number | string,
	pluginName: string,
	authorName: string,
	reason?: string,
): Promise<boolean> {
	const baseUrl = env.NEXTAUTH_URL || "http://localhost:3000";

	const reasonText = reason ? `\n\n📝 Причина: ${reason}` : "";

	const message: TelegramMessage = {
		chat_id: chatId,
		text: `❌ *Плагин отклонен*\n\n📦 Плагин: *${pluginName}*\n👨‍💻 Автор: ${authorName}${reasonText}\n\n🔄 Вы можете исправить замечания и загрузить плагин заново.\n\n💡 Обратитесь к администрации, если у вас есть вопросы.`,
		parse_mode: "Markdown",
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: "📤 Загрузить новый плагин",
						url: `${baseUrl}/upload`,
					},
				],
				[
					{
						text: "⚙️ Мои плагины",
						url: `${baseUrl}/my-plugins`,
					},
				],
			],
		},
	};

	return sendNotificationMessage(message);
}
