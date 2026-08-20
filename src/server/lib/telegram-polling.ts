import { env } from "~/env";
import {
	processTelegramUpdate,
	type TelegramUpdate,
} from "~/server/lib/telegram-bot";
import { telegramRequest } from "~/server/lib/telegram-client";

const POLL_TIMEOUT_SECONDS = 30;
const POLL_REQUEST_TIMEOUT_MS = 40_000;
const BACKOFF_MIN_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

const globalState = globalThis as typeof globalThis & {
	__telegramPollingStarted?: boolean;
};

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollLoop() {
	let offset: number | undefined;
	let backoffMs = BACKOFF_MIN_MS;

	for (;;) {
		try {
			const updates = await telegramRequest<TelegramUpdate[]>(
				"getUpdates",
				{
					timeout: POLL_TIMEOUT_SECONDS,
					allowed_updates: ["message", "callback_query"],
					...(offset !== undefined ? { offset } : {}),
				},
				{ timeoutMs: POLL_REQUEST_TIMEOUT_MS },
			);
			backoffMs = BACKOFF_MIN_MS;

			for (const update of updates) {
				offset = update.update_id + 1;
				try {
					await processTelegramUpdate(update);
				} catch (error) {
					console.error("telegram polling: failed to process update", error);
				}
			}
		} catch (error) {
			console.error("telegram polling: getUpdates failed", error);
			await wait(backoffMs);
			backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
		}
	}
}

export function startTelegramPolling() {
	if (!env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_POLLING !== "true") {
		console.log("telegram polling disabled");
		return;
	}

	if (globalState.__telegramPollingStarted) {
		return;
	}
	globalState.__telegramPollingStarted = true;

	void (async () => {
		try {
			await telegramRequest("deleteWebhook", { drop_pending_updates: false });
		} catch (error) {
			console.error("telegram polling: deleteWebhook failed", error);
		}
		console.log("telegram polling started");
		await pollLoop();
	})();
}
