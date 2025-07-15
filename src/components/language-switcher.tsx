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

const languageFlags: Record<Locale, string> = {
	en: "🇺🇸",
	ru: "🇷🇺",
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

export function CompactLanguageSwitcher() {
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

	if (isPending) {
		return (
			<div className="flex items-center gap-1">
				<div className="h-6 w-6 bg-muted rounded animate-pulse" />
				<div className="h-6 w-6 bg-muted rounded animate-pulse" />
			</div>
		);
	}

	return (
		<div className="flex items-center gap-1">
			{locales.map((locale) => (
				<button
					key={locale}
					onClick={() => handleLocaleChange(locale)}
					disabled={isPending}
					className={`h-6 w-6 rounded flex items-center justify-center transition-colors disabled:opacity-50 ${
						clientLocale === locale 
							? 'bg-primary text-primary-foreground' 
							: 'hover:bg-muted text-muted-foreground hover:text-foreground'
					}`}
					title={languageNames[locale]}
				>
					<span className="text-xs">{languageFlags[locale]}</span>
				</button>
			))}
		</div>
	);
}

export function FooterLanguageSwitcher() {
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

	if (isPending) {
		return (
			<div className="flex items-center justify-between w-full">
				<span className="text-sm text-gray-600 dark:text-gray-400">Switching...</span>
				<div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{locales.map((locale) => (
				<button
					key={locale}
					onClick={() => handleLocaleChange(locale)}
					disabled={isPending}
					className={`
						w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 disabled:opacity-50
						${clientLocale === locale 
							? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50' 
							: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
						}
					`}
				>
					<div className="flex items-center space-x-3">
						<span className="text-lg">{languageFlags[locale]}</span>
						<span className="text-sm font-medium">{languageNames[locale]}</span>
					</div>
					{clientLocale === locale && (
						<div className="w-2 h-2 bg-red-500 rounded-full" />
					)}
				</button>
			))}
		</div>
	);
}
