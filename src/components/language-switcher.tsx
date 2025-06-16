"use client";

import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { type Locale, locales } from "~/lib/i18n-config";
import { getCurrentLocale, setLocaleCookie } from "~/lib/locale";

const languageNames: Record<Locale, string> = {
	en: "English",
	ru: "Русский",
};

export function LanguageSwitcher() {
	const router = useRouter();
	const currentLocale = useLocale() as Locale;
	const [isPending, startTransition] = useTransition();
	const [clientLocale, setClientLocale] = useState<Locale>(currentLocale);

	useEffect(() => {
		setClientLocale(getCurrentLocale());
	}, []);

	function handleLocaleChange(locale: Locale) {
		startTransition(() => {
			setLocaleCookie(locale);
			setClientLocale(locale);

			router.refresh();
		});
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" disabled={isPending}>
					<Globe className="h-4 w-4" />
					<span className="ml-2 hidden sm:inline">
						{languageNames[clientLocale]}
					</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{locales.map((locale) => (
					<DropdownMenuItem
						key={locale}
						onClick={() => handleLocaleChange(locale)}
						className={clientLocale === locale ? "bg-accent" : ""}
					>
						{languageNames[locale]}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
