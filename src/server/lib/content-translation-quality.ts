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

export function isTargetLanguageValid(
	value: string,
	targetLocale: TranslationLanguage,
) {
	const normalized = compact(value);
	if (!normalized) return true;
	const stats = languageStats(normalized);
	if (stats.letters < 4 || !/\p{L}{4,}/u.test(normalized)) return true;
	if (targetLocale === "en") return stats.cyrillicRatio <= 0.08;
	if (stats.cyrillicRatio >= 0.15) return true;
	const tokens = normalized.split(/\s+/u);
	return tokens.every((token) => /\d/u.test(token) || token.length <= 3);
}

export function isTranslationLanguageValid(input: {
	source: string;
	translated: string;
	targetLocale: TranslationLanguage;
}) {
	const source = compact(input.source);
	const translated = compact(input.translated);
	if (!source) return true;
	if (!translated) return false;

	const sourceStats = languageStats(source);
	if (sourceStats.letters < 4 || !/\p{L}{4,}/u.test(source)) return true;
	if (input.targetLocale === "en" && sourceStats.cyrillicRatio >= 0.15) {
		return isTargetLanguageValid(translated, input.targetLocale);
	}
	if (input.targetLocale === "ru" && sourceStats.cyrillicRatio <= 0.08) {
		return isTargetLanguageValid(translated, input.targetLocale);
	}
	return isTargetLanguageValid(translated, input.targetLocale);
}

export function areTranslationFieldsValid(
	fields: Array<{
		source: string | null | undefined;
		translated: string | null | undefined;
	}>,
	targetLocale: TranslationLanguage,
) {
	return fields.every(({ source, translated }) =>
		isTranslationLanguageValid({
			source: source ?? "",
			translated: translated ?? "",
			targetLocale,
		}),
	);
}

export function areFieldsInTargetLanguage(
	values: Array<string | null | undefined>,
	targetLocale: TranslationLanguage,
) {
	return values.every((value) =>
		isTargetLanguageValid(value ?? "", targetLocale),
	);
}
