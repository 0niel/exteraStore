export type TelegramBotLocale = "ru" | "en";

export function resolveTelegramBotLocale(languageCode?: string | null) {
	return languageCode?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function botText(
	locale: TelegramBotLocale,
	russian: string,
	english: string,
) {
	return locale === "ru" ? russian : english;
}

export function formatTelegramDate(value: Date, locale: TelegramBotLocale) {
	return value.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US");
}

export function pluginCountLabel(count: number, locale: TelegramBotLocale) {
	if (locale === "en") return count === 1 ? "plugin" : "plugins";
	const lastTwo = count % 100;
	const last = count % 10;
	if (lastTwo >= 11 && lastTwo <= 14) return "плагинов";
	if (last === 1) return "плагин";
	if (last >= 2 && last <= 4) return "плагина";
	return "плагинов";
}
