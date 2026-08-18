import { env } from "~/env";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 10_000;

type TelegramResponse<T> = {
	ok: boolean;
	result?: T;
	description?: string;
	parameters?: {
		retry_after?: number;
	};
};

export type TelegramReplyMarkup = {
	inline_keyboard: Array<
		Array<{
			text: string;
			url?: string;
			callback_data?: string;
		}>
	>;
};

export type TelegramMessageOptions = {
	parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
	reply_markup?: TelegramReplyMarkup;
	disable_web_page_preview?: boolean;
};

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(
	response: Response,
	body: TelegramResponse<unknown> | undefined,
	attempt: number,
) {
	const retryAfter =
		body?.parameters?.retry_after ??
		Number.parseInt(response.headers.get("retry-after") ?? "", 10);

	if (Number.isFinite(retryAfter) && retryAfter > 0) {
		return Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS);
	}

	return Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

export async function telegramRequest<T>(
	method: string,
	payload: Record<string, unknown> | FormData,
): Promise<T> {
	if (!env.TELEGRAM_BOT_TOKEN) {
		throw new Error("Telegram bot token is not configured");
	}

	const baseUrl = env.TELEGRAM_API_BASE_URL.replace(/\/+$/, "");
	const url = `${baseUrl}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		try {
			const multipart = payload instanceof FormData;
			const response = await fetch(url, {
				method: "POST",
				headers: multipart ? undefined : { "Content-Type": "application/json" },
				body: multipart ? payload : JSON.stringify(payload),
				signal: controller.signal,
			});
			const body = (await response.json().catch(() => undefined)) as
				| TelegramResponse<T>
				| undefined;

			if (response.ok && body?.ok && body.result !== undefined) {
				return body.result;
			}

			if (
				attempt < MAX_RETRIES &&
				(response.status === 429 || response.status >= 500)
			) {
				await wait(getRetryDelay(response, body, attempt));
				continue;
			}

			throw new Error(
				`Telegram API request failed (${response.status}): ${body?.description ?? "Unknown error"}`,
			);
		} catch (error) {
			if (
				attempt < MAX_RETRIES &&
				(error instanceof TypeError ||
					(error instanceof Error && error.name === "AbortError"))
			) {
				await wait(Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS));
				continue;
			}

			throw error;
		} finally {
			clearTimeout(timeout);
		}
	}

	throw new Error("Telegram API request failed");
}

export function sendTelegramMessage(
	chatId: string | number,
	text: string,
	options: TelegramMessageOptions = {},
) {
	return telegramRequest("sendMessage", {
		chat_id: chatId,
		text,
		...options,
	});
}

export function editTelegramMessage(
	chatId: string | number,
	messageId: number,
	text: string,
	options: TelegramMessageOptions = {},
) {
	return telegramRequest("editMessageText", {
		chat_id: chatId,
		message_id: messageId,
		text,
		...options,
	});
}

export function answerTelegramCallback(
	callbackQueryId: string,
	text: string,
	showAlert = false,
) {
	return telegramRequest("answerCallbackQuery", {
		callback_query_id: callbackQueryId,
		text,
		show_alert: showAlert,
	});
}

export function sendTelegramDocument(
	chatId: string | number,
	document: Buffer,
	filename: string,
	caption?: string,
) {
	const formData = new FormData();
	formData.append("chat_id", String(chatId));
	formData.append("document", new Blob([new Uint8Array(document)]), filename);
	if (caption) {
		formData.append("caption", caption);
		formData.append("parse_mode", "HTML");
	}

	return telegramRequest("sendDocument", formData);
}

export function setTelegramWebhook(url: string) {
	if (!env.TELEGRAM_WEBHOOK_SECRET) {
		throw new Error("Telegram webhook secret is not configured");
	}

	return telegramRequest("setWebhook", {
		url,
		secret_token: env.TELEGRAM_WEBHOOK_SECRET,
	});
}
