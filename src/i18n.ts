import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { type Locale, locales } from "~/lib/i18n-config";

export { locales, type Locale };

async function getServerLocale(): Promise<Locale> {
	const cookieStore = await cookies();
	const localeCookie = cookieStore.get("locale")?.value as Locale;

	if (localeCookie && locales.includes(localeCookie)) {
		return localeCookie;
	}

	const headersList = await headers();
	const acceptLanguage = headersList.get("accept-language");

	if (acceptLanguage) {
		const preferredLocales = acceptLanguage
			.split(",")
			.map((lang) => {
				const [locale, q = "1"] = lang.trim().split(";q=");
				return { locale: locale?.split("-")[0], quality: Number.parseFloat(q) };
			})
			.sort((a, b) => b.quality - a.quality);

		for (const { locale } of preferredLocales) {
			if (locale && locales.includes(locale as Locale)) {
				return locale as Locale;
			}
		}
	}

	return "en";
}

export default getRequestConfig(async () => {
	const locale = await getServerLocale();

	return {
		locale,
		messages: (await import(`./messages/${locale}.json`)).default,
	};
});
