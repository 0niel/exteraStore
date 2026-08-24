import { parse, validate } from "@tma.js/init-data-node";

const MAX_INIT_DATA_LENGTH = 16_384;
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

export interface TelegramMiniAppUser {
	id: string;
	firstName: string;
	lastName?: string;
	username?: string;
	photoUrl?: string;
}

export function validateTelegramMiniAppInitData(
	initData: string,
	botToken: string,
): TelegramMiniAppUser {
	if (!initData || initData.length > MAX_INIT_DATA_LENGTH) {
		throw new Error("Invalid Telegram Mini App payload");
	}

	validate(initData, botToken, { expiresIn: MAX_AUTH_AGE_SECONDS });
	const parsed = parse(initData);
	const user = parsed.user;

	if (!user || user.is_bot || !Number.isSafeInteger(user.id)) {
		throw new Error("Telegram Mini App user is missing");
	}

	return {
		id: String(user.id),
		firstName: user.first_name,
		lastName: user.last_name,
		username: user.username,
		photoUrl: user.photo_url,
	};
}
