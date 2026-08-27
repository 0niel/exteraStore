import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { env } from "~/env";
import { getCategoryEmoji } from "~/lib/category-icon";
import { createValidDate, escapeHtml } from "~/lib/utils";
import { db } from "~/server/db";
import {
	type plugins as Plugin,
	pluginCategories,
	pluginDownloads,
	plugins,
	pluginTranslations,
	pluginVersions,
	userPluginSubscriptions,
	users,
} from "~/server/db/schema";
import {
	localizeCategoryRows,
	localizePluginRows,
} from "~/server/lib/content-localization";
import { getPluginInstallPlan } from "~/server/lib/plugin-dependencies";
import { checkDownloadRateLimit, hashIp } from "~/server/lib/rate-limiter";
import {
	botText,
	formatTelegramDate,
	pluginCountLabel,
	resolveTelegramBotLocale,
	type TelegramBotLocale,
} from "~/server/lib/telegram-bot-i18n";
import {
	answerTelegramCallback,
	editTelegramMessage,
	sendTelegramDocument,
	sendTelegramMessage,
	type TelegramMessageOptions,
	type TelegramReplyMarkup,
} from "~/server/lib/telegram-client";

export interface TelegramCallbackQuery {
	id: string;
	data: string;
	from: { id: number | string; language_code?: string };
	message: { message_id: number; chat: { id: number | string } };
}

export interface TelegramUpdate {
	update_id: number;
	message?: {
		chat: { id: number | string };
		from: { id: number | string; language_code?: string };
		text?: string;
	};
	callback_query?: TelegramCallbackQuery;
}

function pluginRating(
	plugin: typeof Plugin.$inferSelect,
	locale: TelegramBotLocale,
) {
	return plugin.ratingCount > 0
		? `⭐ ${plugin.rating.toFixed(1)} (${plugin.ratingCount})`
		: botText(locale, "⭐ Нет оценок", "⭐ No ratings yet");
}

export async function processTelegramUpdate(
	update: TelegramUpdate,
): Promise<void> {
	if (update.callback_query) {
		const callbackQuery = update.callback_query;
		const chatId = callbackQuery.message.chat.id.toString();
		const userId = callbackQuery.from.id.toString();
		const locale = resolveTelegramBotLocale(callbackQuery.from.language_code);

		await handleCallbackQuery(callbackQuery, userId, chatId, locale);
		return;
	}

	if (!update.message) {
		return;
	}

	const message = update.message;
	const chatId = message.chat.id.toString();
	const text = message.text || "";
	const userId = message.from.id.toString();
	const locale = resolveTelegramBotLocale(message.from.language_code);

	if (text.startsWith("/start")) {
		const params = text.split(" ")[1];

		if (params?.startsWith("plugin_")) {
			await handlePluginDownload(chatId, params, userId, locale);
		} else {
			await showMainMenu(chatId, userId, locale);
		}
	} else if (text.startsWith("/menu")) {
		await showMainMenu(chatId, userId, locale);
	} else if (text.startsWith("/search")) {
		const query = text.substring(8).trim();
		if (query) {
			await handleSearch(chatId, query, 0, locale);
		} else {
			await sendMessage(
				chatId,
				botText(
					locale,
					"🔍 Введите запрос для поиска. Например: <code>/search тема</code>",
					"🔍 Enter a search query. Example: <code>/search theme</code>",
				),
			);
		}
	} else if (text.startsWith("/download")) {
		const pluginSlug = text.split(" ")[1];
		if (pluginSlug) {
			await handlePluginDownload(
				chatId,
				`plugin_${pluginSlug}`,
				userId,
				locale,
			);
		} else {
			await sendMessage(
				chatId,
				botText(
					locale,
					"❌ Укажите название плагина. Например: <code>/download my-plugin</code>",
					"❌ Enter a plugin name. Example: <code>/download my-plugin</code>",
				),
			);
		}
	} else if (text.startsWith("/profile")) {
		await showUserProfile(chatId, userId, locale);
	} else if (text.startsWith("/help")) {
		await showHelp(chatId, locale);
	} else if (text.startsWith("/categories")) {
		await showCategories(chatId, 0, locale);
	} else if (text.startsWith("/language")) {
		await sendMessage(
			chatId,
			botText(
				locale,
				"🌐 Язык определяется автоматически по настройкам Telegram. Сейчас выбран русский.",
				"🌐 Language is detected automatically from Telegram settings. English is currently selected.",
			),
		);
	} else {
		if (text.length > 2 && !text.startsWith("/")) {
			await handleSearch(chatId, text, 0, locale);
		} else {
			await showMainMenu(chatId, userId, locale);
		}
	}
}

async function sendMessage(
	chatId: string,
	text: string,
	options?: TelegramMessageOptions,
) {
	if (!env.TELEGRAM_BOT_TOKEN) return;
	await sendTelegramMessage(chatId, text, { parse_mode: "HTML", ...options });
}

async function sendMessageWithKeyboard(
	chatId: string,
	text: string,
	keyboard: TelegramReplyMarkup,
	options?: TelegramMessageOptions,
) {
	if (!env.TELEGRAM_BOT_TOKEN) return;
	await sendTelegramMessage(chatId, text, {
		parse_mode: "HTML",
		reply_markup: keyboard,
		...options,
	});
}

async function editMessage(
	chatId: string,
	messageId: number,
	text: string,
	keyboard?: TelegramReplyMarkup,
) {
	if (!env.TELEGRAM_BOT_TOKEN) return;
	await editTelegramMessage(chatId, messageId, text, {
		parse_mode: "HTML",
		reply_markup: keyboard,
	});
}

async function answerCallbackQuery(
	queryId: string,
	text: string,
	showAlert = false,
) {
	if (!env.TELEGRAM_BOT_TOKEN) return;
	await answerTelegramCallback(queryId, text, showAlert);
}

async function sendDocument(
	chatId: string,
	document: Buffer,
	filename: string,
	caption?: string,
) {
	if (!env.TELEGRAM_BOT_TOKEN) return;
	await sendTelegramDocument(chatId, document, filename, caption);
}

async function handlePluginDownload(
	chatId: string,
	params: string,
	userId: string,
	locale: TelegramBotLocale,
) {
	try {
		const parts = params.split("_");
		if (parts.length < 2) {
			await sendMessage(
				chatId,
				botText(
					locale,
					"❌ Неверная ссылка на плагин.",
					"❌ Invalid plugin link.",
				),
			);
			return;
		}

		const lastPart = parts[parts.length - 1];
		const hasVersion = parts.length > 2 && /^v\d/.test(lastPart ?? "");

		const pluginIdentifier = hasVersion
			? parts.slice(1, -1).join("_")
			: parts.slice(1).join("_");
		const version = hasVersion && lastPart ? lastPart.substring(1) : undefined;

		const isNumericId = /^\d+$/.test(pluginIdentifier);

		let plugin: (typeof plugins.$inferSelect)[];
		if (isNumericId) {
			plugin = await db
				.select()
				.from(plugins)
				.where(
					and(
						eq(plugins.id, Number.parseInt(pluginIdentifier, 10)),
						eq(plugins.status, "approved"),
					),
				)
				.limit(1);
		} else {
			plugin = await db
				.select()
				.from(plugins)
				.where(
					and(
						eq(plugins.slug, pluginIdentifier),
						eq(plugins.status, "approved"),
					),
				)
				.limit(1);
		}

		if (!plugin[0]) {
			await sendMessage(
				chatId,
				botText(locale, "❌ Плагин не найден.", "❌ Plugin not found."),
			);
			return;
		}

		const telegramUser = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.telegramId, userId))
			.limit(1);
		const internalUserId = telegramUser[0]?.id;
		const rateLimitIp = internalUserId ? null : `telegram:${userId}`;
		const installPlan = await getPluginInstallPlan(db, plugin[0].id, locale);
		const packages = await Promise.all(
			installPlan.map(async (planPlugin) => {
				const requestedVersion = planPlugin.isRequestedPlugin
					? version
					: undefined;
				const versionRows = requestedVersion
					? await db
							.select()
							.from(pluginVersions)
							.where(
								and(
									eq(pluginVersions.pluginId, planPlugin.id),
									eq(pluginVersions.version, requestedVersion),
								),
							)
							.limit(1)
					: await db
							.select()
							.from(pluginVersions)
							.where(
								and(
									eq(pluginVersions.pluginId, planPlugin.id),
									eq(pluginVersions.isStable, true),
								),
							)
							.orderBy(desc(pluginVersions.createdAt))
							.limit(1);
				if (!versionRows[0]) {
					throw new Error(
						botText(
							locale,
							`Версия для ${planPlugin.name} не найдена`,
							`No version found for ${planPlugin.name}`,
						),
					);
				}
				return { plugin: planPlugin, version: versionRows[0] };
			}),
		);

		for (const item of packages) {
			const rateLimit = await checkDownloadRateLimit(
				db,
				item.plugin.id,
				internalUserId,
				rateLimitIp,
			);
			if (rateLimit.limited) {
				await sendMessage(
					chatId,
					botText(
						locale,
						`❌ ${escapeHtml(item.plugin.name)}: лимит скачиваний исчерпан. Попробуйте позже.`,
						`❌ ${escapeHtml(item.plugin.name)}: download limit reached. Please try again later.`,
					),
				);
				return;
			}
		}

		if (packages.length > 1) {
			const orderedNames = packages
				.map(
					(item, index) =>
						`${index + 1}. <b>${escapeHtml(item.plugin.name)}</b>${item.plugin.isRequestedPlugin ? botText(locale, " — основной плагин", " — main plugin") : botText(locale, " — зависимость", " — dependency")}`,
				)
				.join("\n");
			await sendMessage(
				chatId,
				botText(
					locale,
					`📦 <b>Нужно установить несколько плагинов: ${packages.length}</b>\n\nУстанавливайте файлы в этом порядке:\n\n${orderedNames}\n\nСейчас отправлю их по очереди.`,
					`📦 <b>Several plugins are required: ${packages.length}</b>\n\nInstall the files in this order:\n\n${orderedNames}\n\nI will send them one by one now.`,
				),
			);
		}

		for (const [index, item] of packages.entries()) {
			const safeName = escapeHtml(item.plugin.name);
			const safeDesc = escapeHtml(
				item.plugin.shortDescription ||
					item.plugin.description.substring(0, 100),
			);
			const safeAuthor = escapeHtml(item.plugin.author);
			const role = item.plugin.isRequestedPlugin
				? botText(locale, "Основной плагин", "Main plugin")
				: botText(locale, "Обязательная зависимость", "Required dependency");
			const platform = item.plugin.exteralessCompatible
				? botText(
						locale,
						"exteraGram или exteraless",
						"exteraGram or exteraless",
					)
				: "exteraGram";
			const caption = botText(
				locale,
				`📦 <b>${index + 1}/${packages.length} · ${role}</b>\n\n🔌 <b>${safeName}</b> v${item.version.version}\n📝 ${safeDesc}\n👤 Автор: ${safeAuthor}\n📱 Клиент: ${platform}\n\nУстановите этот файл перед переходом к следующему.`,
				`📦 <b>${index + 1}/${packages.length} · ${role}</b>\n\n🔌 <b>${safeName}</b> v${item.version.version}\n📝 ${safeDesc}\n👤 Author: ${safeAuthor}\n📱 Client: ${platform}\n\nInstall this file before continuing to the next one.`,
			);
			const fileName = `${item.plugin.slug}-v${item.version.version}.plugin`;
			await sendDocument(
				chatId,
				Buffer.from(item.version.fileContent, "utf-8"),
				fileName,
				caption,
			);
			await recordTelegramDownload(
				item.plugin.id,
				item.version,
				internalUserId,
				userId,
			);
			await ensureUpdateSubscription(item.plugin.id, internalUserId, chatId);
		}

		const requestedPlugin = packages.find(
			(item) => item.plugin.isRequestedPlugin,
		)?.plugin;
		await sendMessage(
			chatId,
			packages.length > 1
				? botText(
						locale,
						`✅ Все файлы отправлены. Установите их по порядку от 1 до ${packages.length}.`,
						`✅ All files have been sent. Install them in order from 1 to ${packages.length}.`,
					)
				: requestedPlugin?.exteralessCompatible
					? botText(
							locale,
							"✅ Файл отправлен. Откройте его в exteraGram или exteraless для установки.",
							"✅ File sent. Open it in exteraGram or exteraless to install.",
						)
					: botText(
							locale,
							"✅ Файл отправлен. Откройте его в exteraGram для установки.",
							"✅ File sent. Open it in exteraGram to install.",
						),
		);
	} catch (error) {
		console.error("Plugin download error:", error);
		await sendMessage(
			chatId,
			botText(
				locale,
				"❌ Произошла ошибка при скачивании плагина. Попробуйте позже.",
				"❌ The plugin could not be downloaded. Please try again later.",
			),
		);
	}
}

async function recordTelegramDownload(
	pluginId: number,
	pluginVersion: typeof pluginVersions.$inferSelect,
	internalUserId: string | undefined,
	telegramUserId: string,
) {
	const downloadIdentity = internalUserId
		? {
				condition: eq(pluginDownloads.userId, internalUserId),
				ipHash: null,
			}
		: (() => {
				const ipHash = hashIp(`telegram:${telegramUserId}`);
				if (!ipHash) throw new Error("Download identity is unavailable");
				return {
					condition: eq(pluginDownloads.ipHash, ipHash),
					ipHash,
				};
			})();
	const existingPluginDownload = await db
		.select({ id: pluginDownloads.id })
		.from(pluginDownloads)
		.where(
			and(eq(pluginDownloads.pluginId, pluginId), downloadIdentity.condition),
		)
		.limit(1);
	const existingVersionDownload = await db
		.select({ id: pluginDownloads.id })
		.from(pluginDownloads)
		.where(
			and(
				eq(pluginDownloads.versionId, pluginVersion.id),
				downloadIdentity.condition,
			),
		)
		.limit(1);

	await db.insert(pluginDownloads).values({
		pluginId,
		versionId: pluginVersion.id,
		userId: internalUserId,
		ipHash: downloadIdentity.ipHash,
		userAgent: `Telegram Bot User ${telegramUserId}`,
	});

	await Promise.all([
		!existingPluginDownload[0]
			? db
					.update(plugins)
					.set({ downloadCount: sql`${plugins.downloadCount} + 1` })
					.where(eq(plugins.id, pluginId))
			: Promise.resolve(),
		!existingVersionDownload[0]
			? db
					.update(pluginVersions)
					.set({
						downloadCount: sql`${pluginVersions.downloadCount} + 1`,
					})
					.where(eq(pluginVersions.id, pluginVersion.id))
			: Promise.resolve(),
	]);
}

async function ensureUpdateSubscription(
	pluginId: number,
	internalUserId: string | undefined,
	chatId: string,
) {
	if (!internalUserId) return;
	try {
		const existingSubscription = await db
			.select()
			.from(userPluginSubscriptions)
			.where(
				and(
					eq(userPluginSubscriptions.userId, internalUserId),
					eq(userPluginSubscriptions.pluginId, pluginId),
					eq(userPluginSubscriptions.subscriptionType, "updates"),
				),
			)
			.limit(1);

		if (!existingSubscription[0]) {
			await db.insert(userPluginSubscriptions).values({
				userId: internalUserId,
				pluginId,
				subscriptionType: "updates",
				telegramChatId: chatId,
				isActive: true,
			});
		} else if (!existingSubscription[0].isActive) {
			await db
				.update(userPluginSubscriptions)
				.set({ isActive: true, telegramChatId: chatId })
				.where(eq(userPluginSubscriptions.id, existingSubscription[0].id));
		}
	} catch (error) {
		console.error("Error handling user subscription:", error);
	}
}

async function showMainMenu(
	chatId: string,
	_userId: string,
	locale: TelegramBotLocale,
	messageId?: number,
) {
	const keyboard = {
		inline_keyboard: [
			[
				{
					text: botText(locale, "🔍 Поиск плагинов", "🔍 Search plugins"),
					callback_data: "search_menu",
				},
				{
					text: botText(locale, "📂 Категории", "📂 Categories"),
					callback_data: "categories_0",
				},
			],
			[
				{
					text: botText(locale, "⭐ Популярные", "⭐ Popular"),
					callback_data: "popular_0",
				},
				{
					text: botText(locale, "🆕 Новые", "🆕 New"),
					callback_data: "recent_0",
				},
			],
			[
				{
					text: botText(locale, "👤 Мой профиль", "👤 My profile"),
					callback_data: "profile",
				},
				{
					text: botText(locale, "❓ Помощь", "❓ Help"),
					callback_data: "help",
				},
			],
		],
	};

	const pluginsCount = await getPluginsCount();
	const usersCount = await getActiveUsersCount();
	const message = botText(
		locale,
		`
🔌 <b>exteraStore</b>

Добро пожаловать в каталог плагинов для exteraGram и совместимых расширений exteraless!

📊 <b>Статистика:</b>
• Всего плагинов: ${pluginsCount}
• Активных пользователей: ${usersCount}

Выберите действие:`,
		`
🔌 <b>exteraStore</b>

Welcome to the plugin catalog for exteraGram and compatible exteraless extensions!

📊 <b>Statistics:</b>
• Total plugins: ${pluginsCount}
• Active users: ${usersCount}

Choose an action:`,
	);

	if (messageId) {
		await editMessage(chatId, messageId, message, keyboard);
	} else {
		await sendMessageWithKeyboard(chatId, message, keyboard);
	}
}

async function handleCallbackQuery(
	callbackQuery: TelegramCallbackQuery,
	userId: string,
	chatId: string,
	locale: TelegramBotLocale,
) {
	const { data, id: queryId } = callbackQuery;

	if (data.startsWith("unsubscribe_")) {
		await handleUnsubscribe(data, userId, chatId, queryId, locale);
		return;
	}

	try {
		await answerCallbackQuery(
			queryId,
			botText(locale, "✅ Обрабатываю...", "✅ Processing..."),
		);
	} catch (error) {
		console.error(
			"[handleCallbackQuery] Error answering callback query:",
			error,
		);
	}

	const [action, ...params] = data.split("_");

	switch (action) {
		case "search":
			if (params[0] === "menu") {
				await editMessage(
					chatId,
					callbackQuery.message.message_id,
					botText(
						locale,
						`
🔍 <b>Поиск плагинов</b>

Введите название плагина, описание или ключевые слова для поиска.

Примеры запросов:
• <code>theme</code> - поиск тем
• <code>notification</code> - поиск плагинов уведомлений
• <code>chat</code> - поиск плагинов для чата

Или просто отправьте сообщение с запросом.`,
						`
🔍 <b>Plugin search</b>

Enter a plugin name, description, or keywords.

Example queries:
• <code>theme</code> — themes
• <code>notification</code> — notification plugins
• <code>chat</code> — chat plugins

You can also send your query as a regular message.`,
					),
					{
						inline_keyboard: [
							[
								{
									text: botText(locale, "🔙 Назад", "🔙 Back"),
									callback_data: "main_menu",
								},
							],
						],
					},
				);
			} else {
				const page = Number.parseInt(params.at(-1) || "0", 10) || 0;
				const query = Buffer.from(
					params.slice(0, -1).join("_"),
					"base64url",
				).toString("utf8");
				if (query) {
					await handleSearch(
						chatId,
						query,
						page,
						locale,
						callbackQuery.message.message_id,
					);
				}
			}
			break;

		case "categories": {
			const page = Number.parseInt(params[0] || "0", 10) || 0;
			await showCategories(
				chatId,
				page,
				locale,
				callbackQuery.message.message_id,
			);
			break;
		}

		case "popular": {
			const popularPage = Number.parseInt(params[0] || "0", 10) || 0;
			await showPopularPlugins(
				chatId,
				popularPage,
				locale,
				callbackQuery.message.message_id,
			);
			break;
		}

		case "recent": {
			const recentPage = Number.parseInt(params[0] || "0", 10) || 0;
			await showRecentPlugins(
				chatId,
				recentPage,
				locale,
				callbackQuery.message.message_id,
			);
			break;
		}

		case "profile":
			await showUserProfile(
				chatId,
				userId,
				locale,
				callbackQuery.message.message_id,
			);
			break;

		case "help":
			await showHelp(chatId, locale, callbackQuery.message.message_id);
			break;

		case "main":
			if (params[0] === "menu") {
				await showMainMenu(
					chatId,
					userId,
					locale,
					callbackQuery.message.message_id,
				);
			}
			break;

		case "plugin": {
			const pluginToken = params[0];
			let pluginId = Number.parseInt(pluginToken || "0", 10);
			if ((!pluginId || Number.isNaN(pluginId)) && pluginToken) {
				try {
					const found = await db
						.select({ id: plugins.id })
						.from(plugins)
						.where(
							and(
								eq(plugins.slug, pluginToken),
								eq(plugins.status, "approved"),
							),
						)
						.limit(1);
					pluginId = found[0]?.id ?? 0;
				} catch {
					pluginId = 0;
				}
			}

			if (pluginId && !Number.isNaN(pluginId)) {
				await showPluginDetails(
					chatId,
					pluginId,
					locale,
					callbackQuery.message.message_id,
				);
			} else {
				await answerCallbackQuery(
					queryId,
					botText(locale, "❌ Плагин не найден", "❌ Plugin not found"),
					true,
				);
			}
			break;
		}

		case "download": {
			const downloadPluginId = Number.parseInt(params[0] || "0", 10);
			if (downloadPluginId) {
				await handlePluginDownload(
					chatId,
					`plugin_${downloadPluginId}`,
					userId,
					locale,
				);
			}
			break;
		}

		case "category": {
			const categoryName = params[0];
			const categoryPage = Number.parseInt(params[1] || "0", 10) || 0;
			if (categoryName) {
				await showPluginsByCategory(
					chatId,
					categoryName,
					categoryPage,
					locale,
					callbackQuery.message.message_id,
				);
			}
			break;
		}

		default:
			await showMainMenu(
				chatId,
				userId,
				locale,
				callbackQuery.message.message_id,
			);
			break;
	}
}

async function handleUnsubscribe(
	data: string,
	userId: string,
	_chatId: string,
	queryId: string,
	locale: TelegramBotLocale,
) {
	try {
		const parts = data.split("_");
		const pluginId = Number(parts[1]);
		const subscriberUserId = parts[2];

		if (!subscriberUserId) {
			await answerCallbackQuery(
				queryId,
				botText(locale, "❌ Неверный запрос", "❌ Invalid request"),
			);
			return;
		}

		const user = await db
			.select()
			.from(users)
			.where(eq(users.telegramId, userId))
			.limit(1);

		if (!user[0] || user[0].id !== subscriberUserId) {
			await answerCallbackQuery(
				queryId,
				botText(locale, "❌ Нет доступа", "❌ Unauthorized"),
			);
			return;
		}

		await db
			.update(userPluginSubscriptions)
			.set({ isActive: false })
			.where(
				and(
					eq(userPluginSubscriptions.userId, subscriberUserId),
					eq(userPluginSubscriptions.pluginId, pluginId),
					eq(userPluginSubscriptions.subscriptionType, "updates"),
				),
			);

		const plugin = await db
			.select({
				name: sql<string>`coalesce(${pluginTranslations.name}, ${plugins.name})`,
			})
			.from(plugins)
			.leftJoin(
				pluginTranslations,
				and(
					eq(pluginTranslations.pluginId, plugins.id),
					eq(pluginTranslations.locale, locale),
				),
			)
			.where(eq(plugins.id, pluginId))
			.limit(1);

		await answerCallbackQuery(
			queryId,
			botText(
				locale,
				`✅ Вы отписались от обновлений ${plugin[0]?.name || "плагина"}`,
				`✅ Unsubscribed from ${plugin[0]?.name || "plugin"} updates`,
			),
		);
	} catch (error) {
		console.error("Unsubscribe error:", error);
		await answerCallbackQuery(
			queryId,
			botText(locale, "❌ Ошибка при отписке", "❌ Error during unsubscribe"),
		);
	}
}

async function handleSearch(
	chatId: string,
	query: string,
	page: number,
	locale: TelegramBotLocale,
	messageId?: number,
) {
	try {
		const limit = 5;
		const offset = page * limit;
		const safeQuery = escapeHtml(query);

		const searchRows = await db
			.select({ plugin: plugins })
			.from(plugins)
			.leftJoin(
				pluginTranslations,
				and(
					eq(pluginTranslations.pluginId, plugins.id),
					eq(pluginTranslations.locale, locale),
				),
			)
			.where(
				and(
					eq(plugins.status, "approved"),
					or(
						ilike(plugins.name, `%${query}%`),
						ilike(plugins.description, `%${query}%`),
						ilike(plugins.shortDescription, `%${query}%`),
						ilike(plugins.tags, `%${query}%`),
						ilike(pluginTranslations.name, `%${query}%`),
						ilike(pluginTranslations.description, `%${query}%`),
						ilike(pluginTranslations.shortDescription, `%${query}%`),
						ilike(pluginTranslations.tags, `%${query}%`),
					),
				),
			)
			.limit(limit + 1)
			.offset(offset);
		const searchResults = await localizePluginRows(
			db,
			searchRows.map((row) => row.plugin),
			locale,
		);

		const hasMore = searchResults.length > limit;
		const results = hasMore ? searchResults.slice(0, limit) : searchResults;

		if (results.length === 0) {
			const message = botText(
				locale,
				`🔍 <b>Поиск: "${safeQuery}"</b>\n\n❌ Плагины не найдены.\n\nПопробуйте изменить запрос.`,
				`🔍 <b>Search: "${safeQuery}"</b>\n\n❌ No plugins found.\n\nTry a different query.`,
			);
			const keyboard = {
				inline_keyboard: [
					[
						{
							text: botText(locale, "🔙 Главное меню", "🔙 Main menu"),
							callback_data: "main_menu",
						},
					],
				],
			};

			if (messageId) {
				await editMessage(chatId, messageId, message, keyboard);
			} else {
				await sendMessageWithKeyboard(chatId, message, keyboard);
			}
			return;
		}

		let message = botText(
			locale,
			`🔍 <b>Поиск: "${safeQuery}"</b>\n\n📦 Найдено ${results.length} ${pluginCountLabel(results.length, locale)}:\n\n`,
			`🔍 <b>Search: "${safeQuery}"</b>\n\n📦 Found ${results.length} ${pluginCountLabel(results.length, locale)}:\n\n`,
		);

		results.forEach((plugin: typeof Plugin.$inferSelect, index: number) => {
			const safeName = escapeHtml(plugin.name);
			const safeDesc = escapeHtml(
				plugin.shortDescription || plugin.description.substring(0, 50),
			);
			message += `${index + 1 + offset}. <b>${safeName}</b>\n`;
			message += `   📝 ${safeDesc}...\n`;
			message += `   ${pluginRating(plugin, locale)} • ⬇️ ${plugin.downloadCount}\n\n`;
		});

		const keyboard = {
			inline_keyboard: [] as Array<
				Array<{ text: string; callback_data: string }>
			>,
		};

		results.forEach((plugin: typeof Plugin.$inferSelect) => {
			keyboard.inline_keyboard.push([
				{ text: `📦 ${plugin.name}`, callback_data: `plugin_${plugin.id}` },
				{
					text: botText(locale, "⬇️ Скачать", "⬇️ Download"),
					callback_data: `download_${plugin.id}`,
				},
			]);
		});

		const paginationRow: Array<{ text: string; callback_data: string }> = [];
		const queryKey = Buffer.from(
			Array.from(query).slice(0, 14).join(""),
		).toString("base64url");
		if (page > 0) {
			paginationRow.push({
				text: botText(locale, "⬅️ Назад", "⬅️ Back"),
				callback_data: `search_${queryKey}_${page - 1}`,
			});
		}
		if (hasMore) {
			paginationRow.push({
				text: botText(locale, "Далее ➡️", "Next ➡️"),
				callback_data: `search_${queryKey}_${page + 1}`,
			});
		}
		if (paginationRow.length > 0) {
			keyboard.inline_keyboard.push(paginationRow);
		}

		keyboard.inline_keyboard.push([
			{
				text: botText(locale, "🔙 Главное меню", "🔙 Main menu"),
				callback_data: "main_menu",
			},
		]);

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("Search error:", error);
		await sendMessage(
			chatId,
			botText(
				locale,
				"❌ Ошибка при поиске. Попробуйте позже.",
				"❌ Search failed. Please try again later.",
			),
		);
	}
}

async function showCategories(
	chatId: string,
	page: number,
	locale: TelegramBotLocale,
	messageId?: number,
) {
	try {
		const limit = 8;
		const offset = page * limit;

		const categories = await db
			.select()
			.from(pluginCategories)
			.orderBy(pluginCategories.name)
			.limit(limit + 1)
			.offset(offset);

		const hasMore = categories.length > limit;
		const pageCategories = await localizeCategoryRows(
			db,
			hasMore ? categories.slice(0, limit) : categories,
			locale,
		);

		const totalCount = await db
			.select({ count: sql<number>`count(*)` })
			.from(pluginCategories);

		let message = botText(
			locale,
			"📂 <b>Категории плагинов</b>\n\n",
			"📂 <b>Plugin categories</b>\n\n",
		);
		message += botText(
			locale,
			`Всего категорий: ${totalCount[0]?.count || 0}\n\n`,
			`Total categories: ${totalCount[0]?.count || 0}\n\n`,
		);

		const keyboard = {
			inline_keyboard: [] as Array<
				Array<{ text: string; callback_data: string }>
			>,
		};

		for (let i = 0; i < pageCategories.length; i += 2) {
			const row: Array<{ text: string; callback_data: string }> = [];
			const category1 = pageCategories[i];
			if (!category1) break;
			row.push({
				text: `${getCategoryEmoji(category1.icon, category1.slug)} ${category1.name}`,
				callback_data: `category_${category1.slug}_0`,
			});

			const category2 = pageCategories[i + 1];
			if (category2) {
				row.push({
					text: `${getCategoryEmoji(category2.icon, category2.slug)} ${category2.name}`,
					callback_data: `category_${category2.slug}_0`,
				});
			}
			keyboard.inline_keyboard.push(row);
		}

		const paginationRow: Array<{ text: string; callback_data: string }> = [];
		if (page > 0) {
			paginationRow.push({
				text: botText(locale, "⬅️ Назад", "⬅️ Back"),
				callback_data: `categories_${page - 1}`,
			});
		}
		if (hasMore) {
			paginationRow.push({
				text: botText(locale, "Далее ➡️", "Next ➡️"),
				callback_data: `categories_${page + 1}`,
			});
		}
		if (paginationRow.length > 0) {
			keyboard.inline_keyboard.push(paginationRow);
		}

		keyboard.inline_keyboard.push([
			{
				text: botText(locale, "🔙 Главное меню", "🔙 Main menu"),
				callback_data: "main_menu",
			},
		]);

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("Categories error:", error);
		await sendMessage(
			chatId,
			botText(
				locale,
				"❌ Ошибка при загрузке категорий.",
				"❌ Could not load categories.",
			),
		);
	}
}

async function showPluginsByCategory(
	chatId: string,
	categorySlug: string,
	page: number,
	locale: TelegramBotLocale,
	messageId?: number,
) {
	try {
		const limit = 5;
		const offset = page * limit;

		const categoryInfo = await db
			.select()
			.from(pluginCategories)
			.where(eq(pluginCategories.slug, categorySlug))
			.limit(1);

		if (!categoryInfo[0]) {
			await sendMessage(
				chatId,
				botText(locale, "❌ Категория не найдена.", "❌ Category not found."),
			);
			return;
		}

		const [category] = await localizeCategoryRows(db, categoryInfo, locale);
		if (!category) return;

		const categoryPlugins = await db
			.select()
			.from(plugins)
			.where(
				and(eq(plugins.category, categorySlug), eq(plugins.status, "approved")),
			)
			.limit(limit + 1)
			.offset(offset);

		const hasMore = categoryPlugins.length > limit;
		const results = await localizePluginRows(
			db,
			hasMore ? categoryPlugins.slice(0, limit) : categoryPlugins,
			locale,
		);

		let message = `${getCategoryEmoji(category.icon, category.slug)} <b>${botText(locale, "Категория", "Category")}: ${escapeHtml(category.name)}</b>\n\n`;

		if (category.description) {
			message += `${escapeHtml(category.description)}\n\n`;
		}

		if (results.length === 0) {
			message += botText(
				locale,
				"❌ В этой категории пока нет плагинов.",
				"❌ There are no plugins in this category yet.",
			);
		} else {
			message += botText(
				locale,
				`📦 Найдено ${results.length} ${pluginCountLabel(results.length, locale)}:\n\n`,
				`📦 Found ${results.length} ${pluginCountLabel(results.length, locale)}:\n\n`,
			);

			results.forEach((plugin: typeof Plugin.$inferSelect, index: number) => {
				const safeName = escapeHtml(plugin.name);
				const safeDescription = escapeHtml(
					plugin.shortDescription || plugin.description.substring(0, 50),
				);
				message += `${index + 1 + offset}. <b>${safeName}</b>\n`;
				message += `   📝 ${safeDescription}...\n`;
				message += `   ${pluginRating(plugin, locale)} • ⬇️ ${plugin.downloadCount}\n\n`;
			});
		}

		const keyboard = {
			inline_keyboard: [] as Array<
				Array<{ text: string; callback_data: string }>
			>,
		};

		if (results.length > 0) {
			results.forEach((plugin: typeof Plugin.$inferSelect) => {
				keyboard.inline_keyboard.push([
					{ text: `📦 ${plugin.name}`, callback_data: `plugin_${plugin.id}` },
					{
						text: botText(locale, "⬇️ Скачать", "⬇️ Download"),
						callback_data: `download_${plugin.id}`,
					},
				]);
			});

			const paginationRow: Array<{ text: string; callback_data: string }> = [];
			if (page > 0) {
				paginationRow.push({
					text: botText(locale, "⬅️ Назад", "⬅️ Back"),
					callback_data: `category_${categorySlug}_${page - 1}`,
				});
			}
			if (hasMore) {
				paginationRow.push({
					text: botText(locale, "Далее ➡️", "Next ➡️"),
					callback_data: `category_${categorySlug}_${page + 1}`,
				});
			}
			if (paginationRow.length > 0) {
				keyboard.inline_keyboard.push(paginationRow);
			}
		}

		keyboard.inline_keyboard.push([
			{
				text: botText(locale, "🔙 Категории", "🔙 Categories"),
				callback_data: "categories_0",
			},
			{
				text: botText(locale, "🏠 Главное меню", "🏠 Main menu"),
				callback_data: "main_menu",
			},
		]);

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("Category plugins error:", error);
		await sendMessage(
			chatId,
			botText(
				locale,
				"❌ Ошибка при загрузке плагинов категории.",
				"❌ Could not load category plugins.",
			),
		);
	}
}

async function showPopularPlugins(
	chatId: string,
	page: number,
	locale: TelegramBotLocale,
	messageId?: number,
) {
	try {
		const limit = 5;
		const offset = page * limit;

		const popularPlugins = await db
			.select()
			.from(plugins)
			.where(eq(plugins.status, "approved"))
			.orderBy(desc(plugins.downloadCount), desc(plugins.rating))
			.limit(limit + 1)
			.offset(offset);

		const hasMore = popularPlugins.length > limit;
		const results = await localizePluginRows(
			db,
			hasMore ? popularPlugins.slice(0, limit) : popularPlugins,
			locale,
		);

		let message = botText(
			locale,
			"⭐ <b>Популярные плагины</b>\n\n",
			"⭐ <b>Popular plugins</b>\n\n",
		);
		message += botText(
			locale,
			`📦 Топ ${results.length}:\n\n`,
			`📦 Top ${results.length}:\n\n`,
		);

		results.forEach((plugin: typeof Plugin.$inferSelect, index: number) => {
			const safeName = escapeHtml(plugin.name);
			const safeDesc = escapeHtml(
				plugin.shortDescription || plugin.description.substring(0, 50),
			);
			message += `${index + 1 + offset}. <b>${safeName}</b>\n`;
			message += `   📝 ${safeDesc}...\n`;
			message += `   ${pluginRating(plugin, locale)} • ⬇️ ${plugin.downloadCount}\n\n`;
		});

		const keyboard = {
			inline_keyboard: [] as Array<
				Array<{ text: string; callback_data: string }>
			>,
		};

		results.forEach((plugin: typeof Plugin.$inferSelect) => {
			keyboard.inline_keyboard.push([
				{ text: `📦 ${plugin.name}`, callback_data: `plugin_${plugin.id}` },
				{
					text: botText(locale, "⬇️ Скачать", "⬇️ Download"),
					callback_data: `download_${plugin.id}`,
				},
			]);
		});

		const paginationRow: Array<{ text: string; callback_data: string }> = [];
		if (page > 0) {
			paginationRow.push({
				text: botText(locale, "⬅️ Назад", "⬅️ Back"),
				callback_data: `popular_${page - 1}`,
			});
		}
		if (hasMore) {
			paginationRow.push({
				text: botText(locale, "Далее ➡️", "Next ➡️"),
				callback_data: `popular_${page + 1}`,
			});
		}
		if (paginationRow.length > 0) {
			keyboard.inline_keyboard.push(paginationRow);
		}

		keyboard.inline_keyboard.push([
			{
				text: botText(locale, "🔙 Главное меню", "🔙 Main menu"),
				callback_data: "main_menu",
			},
		]);

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("Popular plugins error:", error);
		await sendMessage(
			chatId,
			botText(
				locale,
				"❌ Ошибка при загрузке популярных плагинов.",
				"❌ Could not load popular plugins.",
			),
		);
	}
}

async function showRecentPlugins(
	chatId: string,
	page: number,
	locale: TelegramBotLocale,
	messageId?: number,
) {
	try {
		const limit = 5;
		const offset = page * limit;

		const recentPlugins = await db
			.select()
			.from(plugins)
			.where(eq(plugins.status, "approved"))
			.orderBy(desc(plugins.createdAt))
			.limit(limit + 1)
			.offset(offset);

		const hasMore = recentPlugins.length > limit;
		const results = await localizePluginRows(
			db,
			hasMore ? recentPlugins.slice(0, limit) : recentPlugins,
			locale,
		);

		let message = botText(
			locale,
			"🆕 <b>Новые плагины</b>\n\n",
			"🆕 <b>New plugins</b>\n\n",
		);
		message += botText(
			locale,
			`📦 Последние ${results.length}:\n\n`,
			`📦 Latest ${results.length}:\n\n`,
		);

		results.forEach((plugin: typeof Plugin.$inferSelect, index: number) => {
			const createdDate = formatTelegramDate(
				createValidDate(plugin.createdAt),
				locale,
			);
			const safeName = escapeHtml(plugin.name);
			const safeDesc = escapeHtml(
				plugin.shortDescription || plugin.description.substring(0, 50),
			);
			message += `${index + 1 + offset}. <b>${safeName}</b>\n`;
			message += `   📝 ${safeDesc}...\n`;
			message += `   📅 ${createdDate} • ${pluginRating(plugin, locale)} • ⬇️ ${plugin.downloadCount}\n\n`;
		});

		const keyboard = {
			inline_keyboard: [] as Array<
				Array<{ text: string; callback_data: string }>
			>,
		};

		results.forEach((plugin: typeof Plugin.$inferSelect) => {
			keyboard.inline_keyboard.push([
				{ text: `📦 ${plugin.name}`, callback_data: `plugin_${plugin.id}` },
				{
					text: botText(locale, "⬇️ Скачать", "⬇️ Download"),
					callback_data: `download_${plugin.id}`,
				},
			]);
		});

		const paginationRow: Array<{ text: string; callback_data: string }> = [];
		if (page > 0) {
			paginationRow.push({
				text: botText(locale, "⬅️ Назад", "⬅️ Back"),
				callback_data: `recent_${page - 1}`,
			});
		}
		if (hasMore) {
			paginationRow.push({
				text: botText(locale, "Далее ➡️", "Next ➡️"),
				callback_data: `recent_${page + 1}`,
			});
		}
		if (paginationRow.length > 0) {
			keyboard.inline_keyboard.push(paginationRow);
		}

		keyboard.inline_keyboard.push([
			{
				text: botText(locale, "🔙 Главное меню", "🔙 Main menu"),
				callback_data: "main_menu",
			},
		]);

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("Recent plugins error:", error);
		await sendMessage(
			chatId,
			botText(
				locale,
				"❌ Ошибка при загрузке новых плагинов.",
				"❌ Could not load new plugins.",
			),
		);
	}
}

async function showUserProfile(
	chatId: string,
	userId: string,
	locale: TelegramBotLocale,
	messageId?: number,
) {
	try {
		const user = await db
			.select()
			.from(users)
			.where(eq(users.telegramId, userId))
			.limit(1);

		const downloadResult = user[0]
			? await db
					.select({ count: sql<number>`count(*)` })
					.from(pluginDownloads)
					.where(eq(pluginDownloads.userId, user[0].id))
			: [];
		const downloadCount = Number(downloadResult[0]?.count ?? 0);

		let message = botText(
			locale,
			"👤 <b>Ваш профиль</b>\n\n",
			"👤 <b>Your profile</b>\n\n",
		);

		if (user[0]) {
			message += `📧 Email: ${user[0].email || botText(locale, "Не указан", "Not provided")}\n`;
			message += `${botText(locale, "📅 Регистрация", "📅 Joined")}: ${formatTelegramDate(createValidDate(user[0].createdAt), locale)}\n`;
		} else {
			message += `🆔 Telegram ID: ${userId}\n`;
			message += botText(
				locale,
				"📅 Первое использование: сегодня\n",
				"📅 First use: today\n",
			);
		}

		message += botText(
			locale,
			`⬇️ Скачано плагинов: ${downloadCount}\n\n`,
			`⬇️ Plugin downloads: ${downloadCount}\n\n`,
		);

		message += botText(
			locale,
			"🔗 <b>Полезные ссылки:</b>\n",
			"🔗 <b>Useful links:</b>\n",
		);
		message += botText(
			locale,
			"• Каталог: https://exterastore.app\n",
			"• Catalog: https://exterastore.app\n",
		);
		message += "• exteraless: https://github.com/exteraless/exteraless\n";
		message += botText(
			locale,
			"• Документация: https://plugins.exteragram.app/\n",
			"• Documentation: https://plugins.exteragram.app/\n",
		);

		const keyboard = {
			inline_keyboard: [
				[
					{
						text: botText(locale, "🔙 Главное меню", "🔙 Main menu"),
						callback_data: "main_menu",
					},
				],
			],
		};

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("User profile error:", error);
		await sendMessage(
			chatId,
			botText(
				locale,
				"❌ Ошибка при загрузке профиля.",
				"❌ Could not load your profile.",
			),
		);
	}
}

async function showPluginDetails(
	chatId: string,
	pluginId: number,
	locale: TelegramBotLocale,
	messageId?: number,
) {
	try {
		const plugin = await db
			.select()
			.from(plugins)
			.where(and(eq(plugins.id, pluginId), eq(plugins.status, "approved")))
			.limit(1);

		if (!plugin[0]) {
			await sendMessage(
				chatId,
				botText(locale, "❌ Плагин не найден.", "❌ Plugin not found."),
			);
			return;
		}

		const [p] = await localizePluginRows(db, plugin, locale);
		if (!p) return;
		const safeName = escapeHtml(p.name);
		const safeDesc = escapeHtml(p.description);
		const safeAuthor = escapeHtml(p.author);
		const safeTags = escapeHtml(p.tags || "");

		let message = `📦 <b>${safeName}</b>\n\n`;
		message += botText(
			locale,
			`📝 <b>Описание:</b>\n${safeDesc}\n\n`,
			`📝 <b>Description:</b>\n${safeDesc}\n\n`,
		);
		message += botText(
			locale,
			`👤 <b>Автор:</b> ${safeAuthor}\n`,
			`👤 <b>Author:</b> ${safeAuthor}\n`,
		);
		message += botText(
			locale,
			`📊 <b>Рейтинг:</b> ${pluginRating(p, locale)}\n`,
			`📊 <b>Rating:</b> ${pluginRating(p, locale)}\n`,
		);
		message += botText(
			locale,
			`⬇️ <b>Скачиваний:</b> ${p.downloadCount}\n`,
			`⬇️ <b>Downloads:</b> ${p.downloadCount}\n`,
		);
		message += botText(
			locale,
			`📅 <b>Обновлен:</b> ${formatTelegramDate(createValidDate(p.updatedAt || p.createdAt), locale)}\n`,
			`📅 <b>Updated:</b> ${formatTelegramDate(createValidDate(p.updatedAt || p.createdAt), locale)}\n`,
		);

		if (p.tags) {
			message += botText(
				locale,
				`🏷️ <b>Теги:</b> ${safeTags}\n`,
				`🏷️ <b>Tags:</b> ${safeTags}\n`,
			);
		}

		message += p.exteralessCompatible
			? botText(
					locale,
					"✅ <b>exteraless:</b> совместим\n",
					"✅ <b>exteraless:</b> compatible\n",
				)
			: p.exteralessCompatible === false
				? botText(
						locale,
						"⛔ <b>exteraless:</b> не совместим\n",
						"⛔ <b>exteraless:</b> incompatible\n",
					)
				: botText(
						locale,
						"❔ <b>exteraless:</b> совместимость не указана\n",
						"❔ <b>exteraless:</b> compatibility not specified\n",
					);

		if (p.price > 0) {
			message += botText(
				locale,
				`💰 <b>Цена:</b> $${p.price}\n`,
				`💰 <b>Price:</b> $${p.price}\n`,
			);
		} else {
			message += botText(
				locale,
				"💰 <b>Цена:</b> Бесплатно\n",
				"💰 <b>Price:</b> Free\n",
			);
		}

		const keyboard = {
			inline_keyboard: [
				[
					{
						text: botText(locale, "⬇️ Скачать плагин", "⬇️ Download plugin"),
						callback_data: `download_${pluginId}`,
					},
				],
				[
					{
						text: botText(locale, "🔙 Назад", "🔙 Back"),
						callback_data: "main_menu",
					},
				],
			],
		};

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("Plugin details error:", error);
		await sendMessage(
			chatId,
			botText(
				locale,
				"❌ Ошибка при загрузке информации о плагине.",
				"❌ Could not load plugin details.",
			),
		);
	}
}

async function showHelp(
	chatId: string,
	locale: TelegramBotLocale,
	messageId?: number,
) {
	const message = botText(
		locale,
		`
📖 <b>Справка по боту exteraStore</b>

<b>🔍 Поиск плагинов:</b>
• Используйте кнопку "Поиск" в главном меню
• Или отправьте команду: <code>/search запрос</code>
• Или просто напишите название плагина

<b>📂 Категории:</b>
• Просматривайте плагины по категориям
• Используйте пагинацию для навигации

<b>⭐ Популярные и новые:</b>
• Смотрите самые скачиваемые плагины
• Узнавайте о новых релизах

<b>👤 Профиль:</b>
• Просматривайте статистику скачиваний
• Управляйте настройками

<b>📥 Скачивание:</b>
• Нажмите кнопку "Скачать" у любого плагина
• Файл .plugin будет отправлен в чат
• Установите его в exteraGram или exteraless, если плагин отмечен совместимым

<b>🌐 Язык:</b>
• Бот автоматически отвечает на языке Telegram
• Команда <code>/language</code> показывает активный язык

<b>🔗 Полезные ссылки:</b>
• Разработчик: https://github.com/0niel
• exteraless: https://github.com/exteraless/exteraless
• Документация: https://plugins.exteragram.app`,
		`
📖 <b>exteraStore bot help</b>

<b>🔍 Plugin search:</b>
• Use the Search button in the main menu
• Or send <code>/search query</code>
• Or simply type a plugin name

<b>📂 Categories:</b>
• Browse plugins by category
• Use pagination to navigate

<b>⭐ Popular and new:</b>
• Explore the most downloaded plugins
• Discover recent releases

<b>👤 Profile:</b>
• View your download statistics
• Open useful project links

<b>📥 Download:</b>
• Tap Download on any plugin
• The .plugin file will be sent to this chat
• Install it in exteraGram or exteraless when marked compatible

<b>🌐 Language:</b>
• The bot follows your Telegram language automatically
• Use <code>/language</code> to view the active language

<b>🔗 Useful links:</b>
• Developer: https://github.com/0niel
• exteraless: https://github.com/exteraless/exteraless
• Documentation: https://plugins.exteragram.app`,
	);

	const keyboard = {
		inline_keyboard: [
			[
				{
					text: botText(locale, "🔙 Главное меню", "🔙 Main menu"),
					callback_data: "main_menu",
				},
			],
		],
	};

	if (messageId) {
		await editMessage(chatId, messageId, message, keyboard);
	} else {
		await sendMessageWithKeyboard(chatId, message, keyboard);
	}
}

async function getPluginsCount(): Promise<number> {
	try {
		const result = await db
			.select({ count: sql<number>`count(*)` })
			.from(plugins)
			.where(eq(plugins.status, "approved"));
		return result[0]?.count || 0;
	} catch {
		return 0;
	}
}

async function getActiveUsersCount(): Promise<number> {
	try {
		const result = await db
			.select({ count: sql<number>`count(DISTINCT telegram_id)` })
			.from(users)
			.where(sql`${users.telegramId} IS NOT NULL`);
		return result[0]?.count || 0;
	} catch {
		return 0;
	}
}
