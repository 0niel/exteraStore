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

export function resolveContentLocale(input: {
	explicit?: string | null;
	cookie?: string | null;
	acceptLanguage?: string | null;
}): Locale {
	const explicit = input.explicit?.toLowerCase();
	if (isSupportedLocale(explicit)) return explicit;

	const currentCookieLocale = input.cookie?.match(
		/(?:^|;\s*)locale=(ru|en)(?:;|$)/,
	)?.[1];
	const legacyCookieLocale = input.cookie?.match(
		/(?:^|;\s*)NEXT_LOCALE=(ru|en)(?:;|$)/,
	)?.[1];
	const cookieLocale = currentCookieLocale ?? legacyCookieLocale;
	if (isSupportedLocale(cookieLocale)) return cookieLocale;

	return resolveLocaleFromAcceptLanguage(input.acceptLanguage ?? null);
}
