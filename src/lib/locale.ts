import { type Locale, locales } from "~/lib/i18n-config";

export function getLocaleFromCookie(): Locale | null {
	if (typeof document === "undefined") return null;

	const cookies = document.cookie?.split(";") ?? [];
	const localeCookie = cookies
		.find((cookie) => cookie.trim().startsWith("locale="))
		?.split("=")[1];

	if (localeCookie && locales.includes(localeCookie as Locale)) {
		return localeCookie as Locale;
	}

	return null;
}

export function getLocaleFromBrowser(): Locale {
	if (typeof navigator === "undefined") return "en";

	const browserLanguage = navigator.language.split("-")[0];

	if (locales.includes(browserLanguage as Locale)) {
		return browserLanguage as Locale;
	}

	return "en";
}

export function getCurrentLocale(): Locale {
	const cookieLocale = getLocaleFromCookie();
	if (cookieLocale) return cookieLocale;

	return getLocaleFromBrowser();
}

export function setLocaleCookie(locale: Locale) {
	if (typeof document === "undefined") return;

	if (typeof cookieStore !== "undefined") {
		void cookieStore.set({
			name: "locale",
			value: locale,
			path: "/",
			expires: Date.now() + 60 * 60 * 24 * 365 * 1000,
			sameSite: "lax",
		});
		return;
	}

	// biome-ignore lint/suspicious/noDocumentCookie: fallback for browsers without the Cookie Store API
	document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
