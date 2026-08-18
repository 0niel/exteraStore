import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { createValidDate, escapeHtml } from "~/lib/utils";
import { db } from "~/server/db";
import {
	type plugins as Plugin,
	pluginCategories,
	pluginDownloads,
	plugins,
	pluginVersions,
	userPluginSubscriptions,
	users,
} from "~/server/db/schema";
import { checkDownloadRateLimit, hashIp } from "~/server/lib/rate-limiter";
import {
	answerTelegramCallback,
	editTelegramMessage,
	sendTelegramDocument,
	sendTelegramMessage,
	type TelegramMessageOptions,
	type TelegramReplyMarkup,
} from "~/server/lib/telegram-client";

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

export async function POST(request: NextRequest) {
	if (
		!env.TELEGRAM_WEBHOOK_SECRET ||
		request.headers.get("x-telegram-bot-api-secret-token") !==
			env.TELEGRAM_WEBHOOK_SECRET
	) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await request.json().catch(() => null);
		if (!body || typeof body !== "object") {
			return NextResponse.json({ error: "Invalid update" }, { status: 400 });
		}

		if (body.callback_query) {
			const callbackQuery = body.callback_query;
			const chatId = callbackQuery.message.chat.id.toString();
			const userId = callbackQuery.from.id.toString();

			await handleCallbackQuery(callbackQuery, userId, chatId);
			return NextResponse.json({ ok: true });
		}

		if (!body.message) {
			return NextResponse.json({ ok: true });
		}

		const message = body.message;
		const chatId = message.chat.id.toString();
		const text = message.text || "";
		const userId = message.from.id.toString();

		if (text.startsWith("/start")) {
			const params = text.split(" ")[1];

			if (params?.startsWith("plugin_")) {
				await handlePluginDownload(chatId, params, userId);
			} else {
				await showMainMenu(chatId, userId);
			}
		} else if (text.startsWith("/menu")) {
			await showMainMenu(chatId, userId);
		} else if (text.startsWith("/search")) {
			const query = text.substring(8).trim();
			if (query) {
				await handleSearch(chatId, query, 0);
			} else {
				await sendMessage(
					chatId,
					"🔍 Введите запрос для поиска. Например: <code>/search theme</code>",
				);
			}
		} else if (text.startsWith("/download")) {
			const pluginSlug = text.split(" ")[1];
			if (pluginSlug) {
				await handlePluginDownload(chatId, `plugin_${pluginSlug}`, userId);
			} else {
				await sendMessage(
					chatId,
					"❌ Укажите название плагина. Например: <code>/download my-plugin</code>",
				);
			}
		} else if (text.startsWith("/profile")) {
			await showUserProfile(chatId, userId);
		} else if (text.startsWith("/help")) {
			await showHelp(chatId);
		} else if (text.startsWith("/categories")) {
			await showCategories(chatId, 0);
		} else {
			if (text.length > 2 && !text.startsWith("/")) {
				await handleSearch(chatId, text, 0);
			} else {
				await showMainMenu(chatId, userId);
			}
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Webhook error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

async function handlePluginDownload(
	chatId: string,
	params: string,
	userId: string,
) {
	try {
		const parts = params.split("_");
		if (parts.length < 2) {
			await sendMessage(chatId, "❌ Неверная ссылка на плагин.");
			return;
		}

		const lastPart = parts[parts.length - 1];
		const hasVersion = lastPart?.startsWith("v");

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
			await sendMessage(chatId, "❌ Плагин не найден.");
			return;
		}

		const telegramUser = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.telegramId, userId))
			.limit(1);
		const internalUserId = telegramUser[0]?.id;
		const rateLimitIp = internalUserId ? null : `telegram:${userId}`;
		const rateLimit = await checkDownloadRateLimit(
			db,
			plugin[0].id,
			internalUserId,
			rateLimitIp,
		);

		if (rateLimit.limited) {
			await sendMessage(chatId, `❌ ${rateLimit.reason}`);
			return;
		}

		let pluginVersion: (typeof pluginVersions.$inferSelect)[];
		if (version) {
			pluginVersion = await db
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
			pluginVersion = await db
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

		if (!pluginVersion || !pluginVersion[0]) {
			await sendMessage(chatId, "❌ Версия плагина не найдена.");
			return;
		}

		const fileName = `${plugin[0].slug}-v${pluginVersion[0].version}.plugin`;
		const fileContent = Buffer.from(pluginVersion[0].fileContent, "utf-8");
		const safeName = escapeHtml(plugin[0].name);
		const safeDesc = escapeHtml(
			plugin[0].shortDescription || plugin[0].description.substring(0, 100),
		);
		const safeAuthor = escapeHtml(plugin[0].author);
		const caption = `🔌 <b>${safeName}</b> v${pluginVersion[0].version}\n\n📝 ${safeDesc}...\n\n👤 Автор: ${safeAuthor}\n📊 Рейтинг: ${plugin[0].rating.toFixed(1)}/5 (${plugin[0].ratingCount} отзывов)\n⬇️ Скачиваний: ${plugin[0].downloadCount}\n\nУстановите плагин в exteraGram!`;

		await sendDocument(chatId, fileContent, fileName, caption);

		const downloadIdentity = internalUserId
			? {
					condition: eq(pluginDownloads.userId, internalUserId),
					ipHash: null,
				}
			: (() => {
					const ipHash = hashIp(`telegram:${userId}`);
					if (!ipHash) {
						throw new Error("Download identity is unavailable");
					}
					return {
						condition: eq(pluginDownloads.ipHash, ipHash),
						ipHash,
					};
				})();
		const existingDownload = await db
			.select({ id: pluginDownloads.id })
			.from(pluginDownloads)
			.where(
				and(
					eq(pluginDownloads.versionId, pluginVersion[0].id),
					downloadIdentity.condition,
				),
			)
			.limit(1);

		await db.insert(pluginDownloads).values({
			pluginId: plugin[0].id,
			versionId: pluginVersion[0].id,
			userId: internalUserId,
			ipHash: downloadIdentity.ipHash,
			userAgent: `Telegram Bot User ${userId}`,
		});

		if (!existingDownload[0]) {
			await db
				.update(plugins)
				.set({ downloadCount: sql`${plugins.downloadCount} + 1` })
				.where(eq(plugins.id, plugin[0].id));
			await db
				.update(pluginVersions)
				.set({
					downloadCount: sql`${pluginVersions.downloadCount} + 1`,
				})
				.where(eq(pluginVersions.id, pluginVersion[0].id));
		}

		try {
			if (internalUserId) {
				const existingSubscription = await db
					.select()
					.from(userPluginSubscriptions)
					.where(
						and(
							eq(userPluginSubscriptions.userId, internalUserId),
							eq(userPluginSubscriptions.pluginId, plugin[0].id),
							eq(userPluginSubscriptions.subscriptionType, "updates"),
						),
					)
					.limit(1);

				if (!existingSubscription[0]) {
					await db.insert(userPluginSubscriptions).values({
						userId: internalUserId,
						pluginId: plugin[0].id,
						subscriptionType: "updates",
						telegramChatId: chatId,
						isActive: true,
					});
				}
			}
		} catch (error) {
			console.error("Error handling user subscription:", error);
		}
	} catch (error) {
		console.error("Plugin download error:", error);
		await sendMessage(
			chatId,
			"❌ Произошла ошибка при скачивании плагина. Попробуйте позже.",
		);
	}
}

async function showMainMenu(
	chatId: string,
	_userId: string,
	messageId?: number,
) {
	const keyboard = {
		inline_keyboard: [
			[
				{ text: "🔍 Поиск плагинов", callback_data: "search_menu" },
				{ text: "📂 Категории", callback_data: "categories_0" },
			],
			[
				{ text: "⭐ Популярные", callback_data: "popular_0" },
				{ text: "🆕 Новые", callback_data: "recent_0" },
			],
			[
				{ text: "👤 Мой профиль", callback_data: "profile" },
				{ text: "❓ Помощь", callback_data: "help" },
			],
		],
	};

	const message = `
🔌 <b>exteraGram Plugins Store</b>

Добро пожаловать в магазин плагинов для exteraGram!

📊 <b>Статистика:</b>
• Всего плагинов: ${await getPluginsCount()}
• Активных пользователей: ${await getActiveUsersCount()}

Выберите действие:
	`;

	if (messageId) {
		await editMessage(chatId, messageId, message, keyboard);
	} else {
		await sendMessageWithKeyboard(chatId, message, keyboard);
	}
}

async function handleCallbackQuery(
	callbackQuery: any,
	userId: string,
	chatId: string,
) {
	const { data, id: queryId } = callbackQuery;

	if (data.startsWith("unsubscribe_")) {
		await handleUnsubscribe(data, userId, chatId, queryId);
		return;
	}

	try {
		await answerCallbackQuery(queryId, "✅ Processing...");
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
					`
🔍 <b>Поиск плагинов</b>

Введите название плагина, описание или ключевые слова для поиска.

Примеры запросов:
• <code>theme</code> - поиск тем
• <code>notification</code> - поиск плагинов уведомлений
• <code>chat</code> - поиск плагинов для чата

Или просто отправьте сообщение с запросом.
				`,
					{
						inline_keyboard: [
							[{ text: "🔙 Назад", callback_data: "main_menu" }],
						],
					},
				);
			}
			break;

		case "categories": {
			const page = Number.parseInt(params[0] || "0", 10) || 0;
			await showCategories(chatId, page, callbackQuery.message.message_id);
			break;
		}

		case "popular": {
			const popularPage = Number.parseInt(params[0] || "0", 10) || 0;
			await showPopularPlugins(
				chatId,
				popularPage,
				callbackQuery.message.message_id,
			);
			break;
		}

		case "recent": {
			const recentPage = Number.parseInt(params[0] || "0", 10) || 0;
			await showRecentPlugins(
				chatId,
				recentPage,
				callbackQuery.message.message_id,
			);
			break;
		}

		case "profile":
			await showUserProfile(chatId, userId, callbackQuery.message.message_id);
			break;

		case "help":
			await showHelp(chatId, callbackQuery.message.message_id);
			break;

		case "main":
			if (params[0] === "menu") {
				await showMainMenu(chatId, userId, callbackQuery.message.message_id);
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
					callbackQuery.message.message_id,
				);
			} else {
				await answerCallbackQuery(queryId, "❌ Плагин не найден", true);
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
					callbackQuery.message.message_id,
				);
			}
			break;
		}

		default:
			await showMainMenu(chatId, userId, callbackQuery.message.message_id);
			break;
	}
}

async function handleUnsubscribe(
	data: string,
	userId: string,
	_chatId: string,
	queryId: string,
) {
	try {
		const parts = data.split("_");
		const pluginId = Number(parts[1]);
		const subscriberUserId = parts[2];

		if (!subscriberUserId) {
			await answerCallbackQuery(queryId, "❌ Invalid request");
			return;
		}

		const user = await db
			.select()
			.from(users)
			.where(eq(users.telegramId, userId))
			.limit(1);

		if (!user[0] || user[0].id !== subscriberUserId) {
			await answerCallbackQuery(queryId, "❌ Unauthorized");
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
			.select({ name: plugins.name })
			.from(plugins)
			.where(eq(plugins.id, pluginId))
			.limit(1);

		await answerCallbackQuery(
			queryId,
			`✅ Unsubscribed from ${plugin[0]?.name || "plugin"} updates`,
		);
	} catch (error) {
		console.error("Unsubscribe error:", error);
		await answerCallbackQuery(queryId, "❌ Error during unsubscribe");
	}
}

async function handleSearch(
	chatId: string,
	query: string,
	page: number,
	messageId?: number,
) {
	try {
		const limit = 5;
		const offset = page * limit;

		const searchResults = await db
			.select()
			.from(plugins)
			.where(
				and(
					eq(plugins.status, "approved"),
					or(
						like(plugins.name, `%${query}%`),
						like(plugins.description, `%${query}%`),
						like(plugins.shortDescription, `%${query}%`),
						like(plugins.tags, `%${query}%`),
					),
				),
			)
			.limit(limit + 1)
			.offset(offset);

		const hasMore = searchResults.length > limit;
		const results = hasMore ? searchResults.slice(0, limit) : searchResults;

		if (results.length === 0) {
			const message = `🔍 <b>Поиск: "${query}"</b>\n\n❌ Плагины не найдены.\n\nПопробуйте изменить запрос.`;
			const keyboard = {
				inline_keyboard: [
					[{ text: "🔙 Главное меню", callback_data: "main_menu" }],
				],
			};

			if (messageId) {
				await editMessage(chatId, messageId, message, keyboard);
			} else {
				await sendMessageWithKeyboard(chatId, message, keyboard);
			}
			return;
		}

		let message = `🔍 <b>Поиск: "${query}"</b>\n\n📦 Найдено ${results.length} плагин${results.length === 1 ? "" : results.length < 5 ? "а" : "ов"}:\n\n`;

		results.forEach((plugin: typeof Plugin.$inferSelect, index: number) => {
			const safeName = escapeHtml(plugin.name);
			const safeDesc = escapeHtml(
				plugin.shortDescription || plugin.description.substring(0, 50),
			);
			message += `${index + 1 + offset}. <b>${safeName}</b>\n`;
			message += `   📝 ${safeDesc}...\n`;
			message += `   ⭐ ${plugin.rating.toFixed(1)} (${plugin.ratingCount}) • ⬇️ ${plugin.downloadCount}\n\n`;
		});

		const keyboard = {
			inline_keyboard: [] as Array<
				Array<{ text: string; callback_data: string }>
			>,
		};

		results.forEach((plugin: typeof Plugin.$inferSelect) => {
			keyboard.inline_keyboard.push([
				{ text: `📦 ${plugin.name}`, callback_data: `plugin_${plugin.id}` },
				{ text: "⬇️ Скачать", callback_data: `download_${plugin.id}` },
			]);
		});

		const paginationRow: Array<{ text: string; callback_data: string }> = [];
		if (page > 0) {
			paginationRow.push({
				text: "⬅️ Назад",
				callback_data: `search_${query}_${page - 1}`,
			});
		}
		if (hasMore) {
			paginationRow.push({
				text: "Далее ➡️",
				callback_data: `search_${query}_${page + 1}`,
			});
		}
		if (paginationRow.length > 0) {
			keyboard.inline_keyboard.push(paginationRow);
		}

		keyboard.inline_keyboard.push([
			{ text: "🔙 Главное меню", callback_data: "main_menu" },
		]);

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("Search error:", error);
		await sendMessage(chatId, "❌ Ошибка при поиске. Попробуйте позже.");
	}
}

async function showCategories(
	chatId: string,
	page: number,
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
		const pageCategories = hasMore ? categories.slice(0, limit) : categories;

		const totalCount = await db
			.select({ count: sql<number>`count(*)` })
			.from(pluginCategories);

		let message = "📂 <b>Категории плагинов</b>\n\n";
		message += `Всего категорий: ${totalCount[0]?.count || 0}\n\n`;

		const keyboard = {
			inline_keyboard: [] as Array<
				Array<{ text: string; callback_data: string }>
			>,
		};

		for (let i = 0; i < pageCategories.length; i += 2) {
			const row: Array<{ text: string; callback_data: string }> = [];
			const category1 = pageCategories[i];
			row.push({
				text: `${category1.icon || "📁"} ${category1.name}`,
				callback_data: `category_${category1.slug}_0`,
			});

			if (i + 1 < pageCategories.length) {
				const category2 = pageCategories[i + 1];
				row.push({
					text: `${category2.icon || "📁"} ${category2.name}`,
					callback_data: `category_${category2.slug}_0`,
				});
			}
			keyboard.inline_keyboard.push(row);
		}

		const paginationRow: Array<{ text: string; callback_data: string }> = [];
		if (page > 0) {
			paginationRow.push({
				text: "⬅️ Назад",
				callback_data: `categories_${page - 1}`,
			});
		}
		if (hasMore) {
			paginationRow.push({
				text: "Далее ➡️",
				callback_data: `categories_${page + 1}`,
			});
		}
		if (paginationRow.length > 0) {
			keyboard.inline_keyboard.push(paginationRow);
		}

		keyboard.inline_keyboard.push([
			{ text: "🔙 Главное меню", callback_data: "main_menu" },
		]);

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("Categories error:", error);
		await sendMessage(chatId, "❌ Ошибка при загрузке категорий.");
	}
}

async function showPluginsByCategory(
	chatId: string,
	categorySlug: string,
	page: number,
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
			await sendMessage(chatId, "❌ Категория не найдена.");
			return;
		}

		const category = categoryInfo[0];

		const categoryPlugins = await db
			.select()
			.from(plugins)
			.where(
				and(eq(plugins.category, categorySlug), eq(plugins.status, "approved")),
			)
			.limit(limit + 1)
			.offset(offset);

		const hasMore = categoryPlugins.length > limit;
		const results = hasMore ? categoryPlugins.slice(0, limit) : categoryPlugins;

		let message = `${category.icon || "📁"} <b>Категория: ${category.name}</b>\n\n`;

		if (category.description) {
			message += `${category.description}\n\n`;
		}

		if (results.length === 0) {
			message += "❌ В этой категории пока нет плагинов.";
		} else {
			message += `📦 Найдено ${results.length} плагин${results.length === 1 ? "" : results.length < 5 ? "а" : "ов"}:\n\n`;

			results.forEach((plugin: typeof Plugin.$inferSelect, index: number) => {
				message += `${index + 1 + offset}. <b>${plugin.name}</b>\n`;
				message += `   📝 ${plugin.shortDescription || plugin.description.substring(0, 50)}...\n`;
				message += `   ⭐ ${plugin.rating.toFixed(1)} (${plugin.ratingCount}) • ⬇️ ${plugin.downloadCount}\n\n`;
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
					{ text: "⬇️ Скачать", callback_data: `download_${plugin.id}` },
				]);
			});

			const paginationRow: Array<{ text: string; callback_data: string }> = [];
			if (page > 0) {
				paginationRow.push({
					text: "⬅️ Назад",
					callback_data: `category_${categorySlug}_${page - 1}`,
				});
			}
			if (hasMore) {
				paginationRow.push({
					text: "Далее ➡️",
					callback_data: `category_${categorySlug}_${page + 1}`,
				});
			}
			if (paginationRow.length > 0) {
				keyboard.inline_keyboard.push(paginationRow);
			}
		}

		keyboard.inline_keyboard.push([
			{ text: "🔙 Категории", callback_data: "categories_0" },
			{ text: "🏠 Главное меню", callback_data: "main_menu" },
		]);

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("Category plugins error:", error);
		await sendMessage(chatId, "❌ Ошибка при загрузке плагинов категории.");
	}
}

async function showPopularPlugins(
	chatId: string,
	page: number,
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
		const results = hasMore ? popularPlugins.slice(0, limit) : popularPlugins;

		let message = "⭐ <b>Популярные плагины</b>\n\n";
		message += `📦 Топ ${results.length} плагин${results.length === 1 ? "" : results.length < 5 ? "а" : "ов"}:\n\n`;

		results.forEach((plugin: typeof Plugin.$inferSelect, index: number) => {
			const safeName = escapeHtml(plugin.name);
			const safeDesc = escapeHtml(
				plugin.shortDescription || plugin.description.substring(0, 50),
			);
			message += `${index + 1 + offset}. <b>${safeName}</b>\n`;
			message += `   📝 ${safeDesc}...\n`;
			message += `   ⭐ ${plugin.rating.toFixed(1)} (${plugin.ratingCount}) • ⬇️ ${plugin.downloadCount}\n\n`;
		});

		const keyboard = {
			inline_keyboard: [] as Array<
				Array<{ text: string; callback_data: string }>
			>,
		};

		results.forEach((plugin: typeof Plugin.$inferSelect) => {
			keyboard.inline_keyboard.push([
				{ text: `📦 ${plugin.name}`, callback_data: `plugin_${plugin.id}` },
				{ text: "⬇️ Скачать", callback_data: `download_${plugin.id}` },
			]);
		});

		const paginationRow: Array<{ text: string; callback_data: string }> = [];
		if (page > 0) {
			paginationRow.push({
				text: "⬅️ Назад",
				callback_data: `popular_${page - 1}`,
			});
		}
		if (hasMore) {
			paginationRow.push({
				text: "Далее ➡️",
				callback_data: `popular_${page + 1}`,
			});
		}
		if (paginationRow.length > 0) {
			keyboard.inline_keyboard.push(paginationRow);
		}

		keyboard.inline_keyboard.push([
			{ text: "🔙 Главное меню", callback_data: "main_menu" },
		]);

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("Popular plugins error:", error);
		await sendMessage(chatId, "❌ Ошибка при загрузке популярных плагинов.");
	}
}

async function showRecentPlugins(
	chatId: string,
	page: number,
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
		const results = hasMore ? recentPlugins.slice(0, limit) : recentPlugins;

		let message = "🆕 <b>Новые плагины</b>\n\n";
		message += `📦 Последние ${results.length} плагин${results.length === 1 ? "" : results.length < 5 ? "а" : "ов"}:\n\n`;

		results.forEach((plugin: typeof Plugin.$inferSelect, index: number) => {
			const createdDate = createValidDate(plugin.createdAt).toLocaleDateString(
				"ru-RU",
			);
			const safeName = escapeHtml(plugin.name);
			const safeDesc = escapeHtml(
				plugin.shortDescription || plugin.description.substring(0, 50),
			);
			message += `${index + 1 + offset}. <b>${safeName}</b>\n`;
			message += `   📝 ${safeDesc}...\n`;
			message += `   📅 ${createdDate} • ⭐ ${plugin.rating.toFixed(1)} • ⬇️ ${plugin.downloadCount}\n\n`;
		});

		const keyboard = {
			inline_keyboard: [] as Array<
				Array<{ text: string; callback_data: string }>
			>,
		};

		results.forEach((plugin: typeof Plugin.$inferSelect) => {
			keyboard.inline_keyboard.push([
				{ text: `📦 ${plugin.name}`, callback_data: `plugin_${plugin.id}` },
				{ text: "⬇️ Скачать", callback_data: `download_${plugin.id}` },
			]);
		});

		const paginationRow: Array<{ text: string; callback_data: string }> = [];
		if (page > 0) {
			paginationRow.push({
				text: "⬅️ Назад",
				callback_data: `recent_${page - 1}`,
			});
		}
		if (hasMore) {
			paginationRow.push({
				text: "Далее ➡️",
				callback_data: `recent_${page + 1}`,
			});
		}
		if (paginationRow.length > 0) {
			keyboard.inline_keyboard.push(paginationRow);
		}

		keyboard.inline_keyboard.push([
			{ text: "🔙 Главное меню", callback_data: "main_menu" },
		]);

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("Recent plugins error:", error);
		await sendMessage(chatId, "❌ Ошибка при загрузке новых плагинов.");
	}
}

async function showUserProfile(
	chatId: string,
	userId: string,
	messageId?: number,
) {
	try {
		const user = await db
			.select()
			.from(users)
			.where(eq(users.telegramId, userId))
			.limit(1);

		const downloadCount = 0;

		let message = "👤 <b>Ваш профиль</b>\n\n";

		if (user[0]) {
			message += `📧 Email: ${user[0].email || "Не указан"}\n`;
			message += `📅 Регистрация: ${createValidDate(user[0].createdAt).toLocaleDateString("ru-RU")}\n`;
		} else {
			message += `🆔 Telegram ID: ${userId}\n`;
			message += "📅 Первое использование: сегодня\n";
		}

		message += `⬇️ Скачано плагинов: ${downloadCount}\n\n`;

		message += "🔗 <b>Полезные ссылки:</b>\n";
		message += "• Сайт: https://exteragram.app\n";
		message += "• Документация: https://plugins.exteragram.app/\n";

		const keyboard = {
			inline_keyboard: [
				[{ text: "🔙 Главное меню", callback_data: "main_menu" }],
			],
		};

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("User profile error:", error);
		await sendMessage(chatId, "❌ Ошибка при загрузке профиля.");
	}
}

async function showPluginDetails(
	chatId: string,
	pluginId: number,
	messageId?: number,
) {
	try {
		const plugin = await db
			.select()
			.from(plugins)
			.where(and(eq(plugins.id, pluginId), eq(plugins.status, "approved")))
			.limit(1);

		if (!plugin[0]) {
			await sendMessage(chatId, "❌ Плагин не найден.");
			return;
		}

		const p = plugin[0];
		const safeName = escapeHtml(p.name);
		const safeDesc = escapeHtml(p.description);
		const safeAuthor = escapeHtml(p.author);
		const safeTags = escapeHtml(p.tags || "");

		let message = `📦 <b>${safeName}</b>\n\n`;
		message += `📝 <b>Описание:</b>\n${safeDesc}\n\n`;
		message += `👤 <b>Автор:</b> ${safeAuthor}\n`;
		message += `📊 <b>Рейтинг:</b> ⭐ ${p.rating.toFixed(1)}/5 (${p.ratingCount} отзывов)\n`;
		message += `⬇️ <b>Скачиваний:</b> ${p.downloadCount}\n`;
		message += `📅 <b>Обновлен:</b> ${createValidDate(p.updatedAt || p.createdAt).toLocaleDateString("ru-RU")}\n`;

		if (p.tags) {
			message += `🏷️ <b>Теги:</b> ${safeTags}\n`;
		}

		if (p.price > 0) {
			message += `💰 <b>Цена:</b> $${p.price}\n`;
		} else {
			message += "💰 <b>Цена:</b> Бесплатно\n";
		}

		const keyboard = {
			inline_keyboard: [
				[{ text: "⬇️ Скачать плагин", callback_data: `download_${pluginId}` }],
				[{ text: "🔙 Назад", callback_data: "main_menu" }],
			],
		};

		if (messageId) {
			await editMessage(chatId, messageId, message, keyboard);
		} else {
			await sendMessageWithKeyboard(chatId, message, keyboard);
		}
	} catch (error) {
		console.error("Plugin details error:", error);
		await sendMessage(chatId, "❌ Ошибка при загрузке информации о плагине.");
	}
}

async function showHelp(chatId: string, messageId?: number) {
	const message = `
📖 <b>Справка по боту exteraGram Plugins</b>

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
• Установите его в exteraGram

<b>🔗 Полезные ссылки:</b>
• Разработчик: https://github.com/0niel
• Документация: http://plugins.exteragram.app
	`;

	const keyboard = {
		inline_keyboard: [
			[{ text: "🔙 Главное меню", callback_data: "main_menu" }],
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

export async function GET() {
	return NextResponse.json({ status: "Telegram webhook is active" });
}
