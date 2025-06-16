import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { type plugins as Plugin, pluginVersions, plugins, users } from "~/server/db/schema";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId: string, text: string, options?: any) {
	if (!BOT_TOKEN) return;

	try {
		await fetch(`${API_URL}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				text,
				parse_mode: "HTML",
				...options,
			}),
		});
	} catch (error) {
		console.error("Failed to send Telegram message:", error);
	}
}

async function sendMessageWithKeyboard(
	chatId: string,
	text: string,
	keyboard: any,
	options?: any,
) {
	if (!BOT_TOKEN) {
		console.error("[sendMessageWithKeyboard] BOT_TOKEN is not set");
		return;
	}

	try {
		console.log(
			`[sendMessageWithKeyboard] Sending message to chat ${chatId} with keyboard`,
		);
		const response = await fetch(`${API_URL}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				text,
				parse_mode: "HTML",
				reply_markup: keyboard,
				...options,
			}),
		});

		const responseText = await response.text();
		console.log(
			`[sendMessageWithKeyboard] Response status: ${response.status}, body: ${responseText}`,
		);

		if (!response.ok) {
			console.error(
				`[sendMessageWithKeyboard] Failed to send message: ${response.status} ${responseText}`,
			);
		}
	} catch (error) {
		console.error(
			"[sendMessageWithKeyboard] Failed to send Telegram message with keyboard:",
			error,
		);
	}
}

async function editMessage(
	chatId: string,
	messageId: number,
	text: string,
	keyboard?: any,
) {
	if (!BOT_TOKEN) {
		console.error("[editMessage] BOT_TOKEN is not set");
		return;
	}

	try {
		console.log(`[editMessage] Editing message ${messageId} in chat ${chatId}`);
		const response = await fetch(`${API_URL}/editMessageText`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				message_id: messageId,
				text,
				parse_mode: "HTML",
				reply_markup: keyboard,
			}),
		});

		const responseText = await response.text();
		console.log(
			`[editMessage] Response status: ${response.status}, body: ${responseText}`,
		);

		if (!response.ok) {
			console.error(
				`[editMessage] Failed to edit message: ${response.status} ${responseText}`,
			);
		}
	} catch (error) {
		console.error("[editMessage] Failed to edit Telegram message:", error);
	}
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
	if (!BOT_TOKEN) {
		console.error("[answerCallbackQuery] BOT_TOKEN is not set");
		return;
	}

	try {
		console.log(
			`[answerCallbackQuery] Answering callback query: ${callbackQueryId}`,
		);
		const response = await fetch(`${API_URL}/answerCallbackQuery`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				callback_query_id: callbackQueryId,
				text: text || "",
			}),
		});

		const responseText = await response.text();
		console.log(
			`[answerCallbackQuery] Response status: ${response.status}, body: ${responseText}`,
		);

		if (!response.ok) {
			console.error(
				`[answerCallbackQuery] Failed to answer callback query: ${response.status} ${responseText}`,
			);
		}
	} catch (error) {
		console.error(
			"[answerCallbackQuery] Failed to answer callback query:",
			error,
		);
	}
}

async function sendDocument(
	chatId: string,
	document: Buffer,
	filename: string,
	caption?: string,
) {
	if (!BOT_TOKEN) {
		console.error("[sendDocument] BOT_TOKEN is not set");
		return;
	}

	try {
		console.log(
			`[sendDocument] Creating FormData for file: ${filename}, size: ${document.length} bytes`,
		);
		const formData = new FormData();
		formData.append("chat_id", chatId);
		formData.append("document", new Blob([document]), filename);
		if (caption) {
			formData.append("caption", caption);
			formData.append("parse_mode", "HTML");
		}

		console.log(`[sendDocument] Sending request to ${API_URL}/sendDocument`);
		const response = await fetch(`${API_URL}/sendDocument`, {
			method: "POST",
			body: formData,
		});

		const responseText = await response.text();
		console.log(
			`[sendDocument] Response status: ${response.status}, body: ${responseText}`,
		);

		if (!response.ok) {
			console.error(
				`[sendDocument] Failed to send document: ${response.status} ${responseText}`,
			);
		}
	} catch (error) {
		console.error("[sendDocument] Failed to send Telegram document:", error);
	}
}

export async function POST(request: NextRequest) {
	try {
		console.log(
			"[Webhook] Received request from:",
			request.headers.get("user-agent"),
		);
		console.log(
			"[Webhook] Request headers:",
			Object.fromEntries(request.headers.entries()),
		);

		const body = await request.json();
		console.log("[Webhook] Request body:", JSON.stringify(body, null, 2));

		if (body.callback_query) {
			const callbackQuery = body.callback_query;
			const chatId = callbackQuery.message.chat.id.toString();
			const userId = callbackQuery.from.id.toString();
			const data = callbackQuery.data;
			const messageId = callbackQuery.message.message_id;

			console.log(
				`[Webhook] Processing callback query from user ${userId}: "${data}"`,
			);

			await handleCallbackQuery(
				chatId,
				userId,
				data,
				messageId,
				callbackQuery.id,
			);
			return NextResponse.json({ ok: true });
		}

		if (!body.message) {
			console.log("[Webhook] No message in body, returning ok");
			return NextResponse.json({ ok: true });
		}

		const message = body.message;
		const chatId = message.chat.id.toString();
		const text = message.text || "";
		const userId = message.from.id.toString();

		console.log(
			`[Webhook] Processing message from user ${userId} in chat ${chatId}: "${text}"`,
		);

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

		console.log(
			`[Webhook] Parsed plugin identifier: "${pluginIdentifier}", version: "${version}"`,
		);

		const isNumericId = /^\d+$/.test(pluginIdentifier);

		let plugin;
		if (isNumericId) {
			console.log(
				`[Webhook] Searching for plugin with ID: ${pluginIdentifier}`,
			);
			plugin = await db
				.select()
				.from(plugins)
				.where(eq(plugins.id, Number.parseInt(pluginIdentifier)))
				.limit(1);
		} else {
			console.log(
				`[Webhook] Searching for plugin with slug: "${pluginIdentifier}"`,
			);
			plugin = await db
				.select()
				.from(plugins)
				.where(eq(plugins.slug, pluginIdentifier))
				.limit(1);
		}

		if (!plugin[0]) {
			console.log(
				`[Webhook] Plugin not found with ${isNumericId ? "ID" : "slug"}: "${pluginIdentifier}"`,
			);
			await sendMessage(chatId, "❌ Плагин не найден.");
			return;
		}

		console.log(
			`[Webhook] Found plugin: ${plugin[0].name} (ID: ${plugin[0].id})`,
		);

		let pluginVersion;
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
			console.log(
				`[Webhook] No version found for plugin: ${plugin[0].name}, requested version: ${version || "latest stable"}`,
			);
			await sendMessage(chatId, "❌ Версия плагина не найдена.");
			return;
		}

		console.log(
			`[Webhook] Found version: ${pluginVersion[0].version} (ID: ${pluginVersion[0].id})`,
		);

		const fileName = `${plugin[0].slug}-v${pluginVersion[0].version}.plugin`;
		const fileContent = Buffer.from(pluginVersion[0].fileContent, "utf-8");

		console.log(
			`[Webhook] Preparing to send file: ${fileName}, size: ${fileContent.length} bytes`,
		);

		const caption = `🔌 <b>${plugin[0].name}</b> v${pluginVersion[0].version}\n\n📝 ${plugin[0].shortDescription || plugin[0].description.substring(0, 100)}...\n\n👤 Автор: ${plugin[0].author}\n📊 Рейтинг: ${plugin[0].rating.toFixed(1)}/5 (${plugin[0].ratingCount} отзывов)\n⬇️ Скачиваний: ${plugin[0].downloadCount}\n\nУстановите плагин в exteraGram!`;

		console.log(`[Webhook] Sending document to chat ${chatId}`);
		await sendDocument(chatId, fileContent, fileName, caption);
		console.log("[Webhook] Document sent successfully");

		await db
			.update(plugins)
			.set({
				downloadCount: plugin[0].downloadCount + 1,
			})
			.where(eq(plugins.id, plugin[0].id));

		await db
			.update(pluginVersions)
			.set({
				downloadCount: pluginVersion[0].downloadCount + 1,
			})
			.where(eq(pluginVersions.id, pluginVersion[0].id));

		try {
			const existingUser = await db
				.select()
				.from(users)
				.where(eq(users.telegramId, userId))
				.limit(1);

			if (!existingUser[0]) {
				console.log(`New Telegram user downloaded plugin: ${userId}`);
			}
		} catch (error) {
			console.error("Error handling user info:", error);
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
	userId: string,
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
	chatId: string,
	userId: string,
	data: string,
	messageId: number,
	callbackQueryId: string,
) {
	console.log(
		`[handleCallbackQuery] Processing callback: action="${data}", chatId=${chatId}, messageId=${messageId}`,
	);

	try {
		await answerCallbackQuery(callbackQueryId);
		console.log("[handleCallbackQuery] Callback query answered successfully");
	} catch (error) {
		console.error(
			"[handleCallbackQuery] Error answering callback query:",
			error,
		);
	}

	const [action, ...params] = data.split("_");
	console.log(
		`[handleCallbackQuery] Parsed action: "${action}", params:`,
		params,
	);

	switch (action) {
		case "search":
			if (params[0] === "menu") {
				await editMessage(
					chatId,
					messageId,
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
			const page = Number.parseInt(params[0] || "0") || 0;
			await showCategories(chatId, page, messageId);
			break;
		}

		case "popular": {
			const popularPage = Number.parseInt(params[0] || "0") || 0;
			await showPopularPlugins(chatId, popularPage, messageId);
			break;
		}

		case "recent": {
			const recentPage = Number.parseInt(params[0] || "0") || 0;
			await showRecentPlugins(chatId, recentPage, messageId);
			break;
		}

		case "profile":
			await showUserProfile(chatId, userId, messageId);
			break;

		case "help":
			await showHelp(chatId, messageId);
			break;

		case "main":
			if (params[0] === "menu") {
				await showMainMenu(chatId, userId, messageId);
			}
			break;

		case "plugin": {
			const pluginId = Number.parseInt(params[0] || "0");
			if (pluginId) {
				await showPluginDetails(chatId, pluginId, messageId);
			}
			break;
		}

		case "download": {
			const downloadPluginId = Number.parseInt(params[0] || "0");
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
			const categoryPage = Number.parseInt(params[1] || "0") || 0;
			if (categoryName) {
				await showPluginsByCategory(
					chatId,
					categoryName,
					categoryPage,
					messageId,
				);
			}
			break;
		}

		default:
			console.log(`[handleCallbackQuery] Unknown action: "${action}"`);
			await showMainMenu(chatId, userId, messageId);
			break;
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
				or(
					like(plugins.name, `%${query}%`),
					like(plugins.description, `%${query}%`),
					like(plugins.shortDescription, `%${query}%`),
					like(plugins.tags, `%${query}%`),
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
			message += `${index + 1 + offset}. <b>${plugin.name}</b>\n`;
			message += `   📝 ${plugin.shortDescription || plugin.description.substring(0, 50)}...\n`;
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
		const categoriesResult = await db
			.select({ tags: plugins.tags })
			.from(plugins)
			.where(sql`${plugins.tags} IS NOT NULL AND ${plugins.tags} != ''`);

		const categoriesSet = new Set<string>();
		categoriesResult.forEach((row: { tags: string | null }) => {
			if (row.tags) {
				row.tags.split(",").forEach((tag: string) => {
					const cleanTag = tag.trim();
					if (cleanTag) categoriesSet.add(cleanTag);
				});
			}
		});

		const categories = Array.from(categoriesSet).sort();
		const limit = 8;
		const offset = page * limit;
		const pageCategories = categories.slice(offset, offset + limit);
		const hasMore = categories.length > offset + limit;

		let message = "📂 <b>Категории плагинов</b>\n\n";
		message += `Всего категорий: ${categories.length}\n\n`;

		const keyboard = {
			inline_keyboard: [] as Array<
				Array<{ text: string; callback_data: string }>
			>,
		};

		for (let i = 0; i < pageCategories.length; i += 2) {
			const row: Array<{ text: string; callback_data: string }> = [];
			row.push({
				text: `📁 ${pageCategories[i]}`,
				callback_data: `category_${pageCategories[i]}_0`,
			});
			if (i + 1 < pageCategories.length) {
				row.push({
					text: `📁 ${pageCategories[i + 1]}`,
					callback_data: `category_${pageCategories[i + 1]}_0`,
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
	category: string,
	page: number,
	messageId?: number,
) {
	try {
		const limit = 5;
		const offset = page * limit;

		const categoryPlugins = await db
			.select()
			.from(plugins)
			.where(like(plugins.tags, `%${category}%`))
			.limit(limit + 1)
			.offset(offset);

		const hasMore = categoryPlugins.length > limit;
		const results = hasMore ? categoryPlugins.slice(0, limit) : categoryPlugins;

		let message = `📁 <b>Категория: ${category}</b>\n\n`;

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
					callback_data: `category_${category}_${page - 1}`,
				});
			}
			if (hasMore) {
				paginationRow.push({
					text: "Далее ➡️",
					callback_data: `category_${category}_${page + 1}`,
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
			.orderBy(desc(plugins.downloadCount), desc(plugins.rating))
			.limit(limit + 1)
			.offset(offset);

		const hasMore = popularPlugins.length > limit;
		const results = hasMore ? popularPlugins.slice(0, limit) : popularPlugins;

		let message = "⭐ <b>Популярные плагины</b>\n\n";
		message += `📦 Топ ${results.length} плагин${results.length === 1 ? "" : results.length < 5 ? "а" : "ов"}:\n\n`;

		results.forEach((plugin: typeof Plugin.$inferSelect, index: number) => {
			message += `${index + 1 + offset}. <b>${plugin.name}</b>\n`;
			message += `   📝 ${plugin.shortDescription || plugin.description.substring(0, 50)}...\n`;
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
			.orderBy(desc(plugins.createdAt))
			.limit(limit + 1)
			.offset(offset);

		const hasMore = recentPlugins.length > limit;
		const results = hasMore ? recentPlugins.slice(0, limit) : recentPlugins;

		let message = "🆕 <b>Новые плагины</b>\n\n";
		message += `📦 Последние ${results.length} плагин${results.length === 1 ? "" : results.length < 5 ? "а" : "ов"}:\n\n`;

		results.forEach((plugin: typeof Plugin.$inferSelect, index: number) => {
			const createdDate = new Date(plugin.createdAt).toLocaleDateString(
				"ru-RU",
			);
			message += `${index + 1 + offset}. <b>${plugin.name}</b>\n`;
			message += `   📝 ${plugin.shortDescription || plugin.description.substring(0, 50)}...\n`;
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
			message += `📅 Регистрация: ${new Date(user[0].createdAt).toLocaleDateString("ru-RU")}\n`;
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
			.where(eq(plugins.id, pluginId))
			.limit(1);

		if (!plugin[0]) {
			await sendMessage(chatId, "❌ Плагин не найден.");
			return;
		}

		const p = plugin[0];
		let message = `📦 <b>${p.name}</b>\n\n`;
		message += `📝 <b>Описание:</b>\n${p.description}\n\n`;
		message += `👤 <b>Автор:</b> ${p.author}\n`;
		message += `📊 <b>Рейтинг:</b> ⭐ ${p.rating.toFixed(1)}/5 (${p.ratingCount} отзывов)\n`;
		message += `⬇️ <b>Скачиваний:</b> ${p.downloadCount}\n`;
		message += `📅 <b>Обновлен:</b> ${new Date(p.updatedAt || p.createdAt).toLocaleDateString("ru-RU")}\n`;

		if (p.tags) {
			message += `🏷️ <b>Теги:</b> ${p.tags}\n`;
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
• Сайт: https:
• Документация: https:
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
			.from(plugins);
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
