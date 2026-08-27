export type TranslationLanguage = "ru" | "en";

const LETTER_PATTERN = /\p{L}/gu;
const CYRILLIC_PATTERN = /\p{Script=Cyrillic}/gu;

function compact(value: string) {
	return value
		.normalize("NFKC")
		.toLocaleLowerCase()
		.replace(/https?:\/\/\S+/gu, " ")
		.replace(/[@#][\p{L}\p{N}_-]+/gu, " ")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
}

function languageStats(value: string) {
	const letters = value.match(LETTER_PATTERN)?.length ?? 0;
	const cyrillic = value.match(CYRILLIC_PATTERN)?.length ?? 0;
	return {
		letters,
		cyrillicRatio: letters > 0 ? cyrillic / letters : 0,
	};
}

export function isTranslationLanguageValid(input: {
	source: string;
	translated: string;
	targetLocale: TranslationLanguage;
}) {
	const source = compact(input.source);
	const translated = compact(input.translated);
	if (!source || !translated) return true;

	const sourceStats = languageStats(source);
	if (sourceStats.letters < 4 || !/\p{L}{4,}/u.test(source)) return true;
	if (source === translated) return false;

	const translatedStats = languageStats(translated);
	if (input.targetLocale === "en" && sourceStats.cyrillicRatio >= 0.15) {
		return translatedStats.cyrillicRatio <= 0.08;
	}
	if (input.targetLocale === "ru" && sourceStats.cyrillicRatio <= 0.08) {
		return translatedStats.cyrillicRatio >= 0.15;
	}
	return true;
}
