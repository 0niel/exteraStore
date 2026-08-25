import crypto from "node:crypto";
import type { TelegramMiniAppUser } from "~/server/lib/telegram-mini-app-auth";

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

export type TelegramLoginData = {
	id: string;
	first_name: string;
	last_name?: string;
	username?: string;
	photo_url?: string;
	auth_date: string;
	hash: string;
};

export function validateTelegramLoginData(
	data: TelegramLoginData,
	botToken: string,
	now = Math.floor(Date.now() / 1_000),
): TelegramMiniAppUser {
	if (!botToken || !/^\d{1,20}$/.test(data.id)) {
		throw new Error("Invalid Telegram login data");
	}
	if (!/^\d{1,12}$/.test(data.auth_date) || !/^[a-f\d]{64}$/i.test(data.hash)) {
		throw new Error("Invalid Telegram login signature");
	}
	const authDate = Number(data.auth_date);
	if (
		!Number.isSafeInteger(authDate) ||
		authDate > now + MAX_CLOCK_SKEW_SECONDS ||
		now - authDate > MAX_AUTH_AGE_SECONDS
	) {
		throw new Error("Expired Telegram login data");
	}

	const values = Object.entries(data)
		.filter(([key, value]) => key !== "hash" && value !== undefined)
		.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
		.map(([key, value]) => `${key}=${value}`)
		.join("\n");
	const secret = crypto.createHash("sha256").update(botToken).digest();
	const expected = crypto.createHmac("sha256", secret).update(values).digest();
	const received = Buffer.from(data.hash, "hex");
	if (
		received.length !== expected.length ||
		!crypto.timingSafeEqual(received, expected)
	) {
		throw new Error("Invalid Telegram login signature");
	}

	return {
		id: data.id,
		firstName: data.first_name || "Telegram user",
		lastName: data.last_name,
		username: data.username,
		photoUrl: data.photo_url,
	};
}
