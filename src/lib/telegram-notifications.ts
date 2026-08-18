import { env } from "~/env.js";
import {
	sendTelegramMessage,
	type TelegramReplyMarkup,
} from "~/server/lib/telegram-client";

interface TelegramMessage {
	chat_id: number | string;
	text: string;
	parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
	reply_markup?: TelegramReplyMarkup;
}

export class TelegramNotifications {
	static async sendMessage(message: TelegramMessage): Promise<boolean> {
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

	static async notifyPluginApproved(
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

		return TelegramNotifications.sendMessage(message);
	}

	static async notifyPluginRejected(
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

		return TelegramNotifications.sendMessage(message);
	}
}
