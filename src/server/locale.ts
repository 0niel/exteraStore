import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Locale } from "~/lib/i18n-config";
import {
	isSupportedLocale,
	resolveLocaleFromAcceptLanguage,
} from "~/lib/locale-resolution";

export const getServerLocale = cache(async (): Promise<Locale> => {
	const cookieStore = await cookies();
	const cookieLocale = cookieStore.get("locale")?.value;

	if (isSupportedLocale(cookieLocale)) {
		return cookieLocale;
	}

	const headersList = await headers();
	return resolveLocaleFromAcceptLanguage(headersList.get("accept-language"));
});
