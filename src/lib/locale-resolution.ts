import { type Locale, locales } from "~/lib/i18n-config";

const DEFAULT_LOCALE: Locale = "en";

export function isSupportedLocale(value: string | undefined): value is Locale {
	return Boolean(value && locales.includes(value as Locale));
}

export function resolveLocaleFromAcceptLanguage(
	acceptLanguage: string | null,
): Locale {
	if (!acceptLanguage) {
		return DEFAULT_LOCALE;
	}

	const candidates = acceptLanguage
		.split(",")
		.map((entry) => {
			const [language = "", qualityValue = "1"] = entry.trim().split(";q=");
			const quality = Number.parseFloat(qualityValue);
			return {
				locale: language.toLowerCase().split("-")[0],
				quality: Number.isFinite(quality) ? quality : 0,
			};
		})
		.sort((left, right) => right.quality - left.quality);

	for (const candidate of candidates) {
		if (isSupportedLocale(candidate.locale)) {
			return candidate.locale;
		}
	}

	return DEFAULT_LOCALE;
}
