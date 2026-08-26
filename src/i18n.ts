import { getRequestConfig } from "next-intl/server";
import { type Locale, locales } from "~/lib/i18n-config";
import { getServerLocale } from "~/server/locale";

export { type Locale, locales };

export default getRequestConfig(async () => {
	const locale = await getServerLocale();

	return {
		locale,
		messages: (await import(`./messages/${locale}.json`)).default,
	};
});
