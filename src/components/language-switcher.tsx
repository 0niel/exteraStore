"use client";

import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
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
				<Button
					variant="ghost"
					size="sm"
					disabled={isPending}
					aria-label={`Language: ${languageNames[clientLocale]}`}
				>
					<Globe className="h-4 w-4" />
					<span className="hidden sm:inline">
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
				<div className="size-11 animate-pulse rounded-lg bg-muted" />
				<div className="size-11 animate-pulse rounded-lg bg-muted" />
			</div>
		);
	}

	return (
		<div className="flex items-center gap-1">
			{locales.map((locale) => (
				<button
					type="button"
					key={locale}
					onClick={() => handleLocaleChange(locale)}
					disabled={isPending}
					className={`flex size-11 touch-manipulation items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 ${
						clientLocale === locale
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground"
					}`}
					title={languageNames[locale]}
					aria-label={languageNames[locale]}
					aria-pressed={clientLocale === locale}
				>
					<span className="text-base">{languageFlags[locale]}</span>
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
			<div className="flex w-full items-center justify-between">
				<span className="text-gray-600 text-sm dark:text-gray-400">
					Switching...
				</span>
				<div className="h-6 w-12 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{locales.map((locale) => (
				<button
					type="button"
					key={locale}
					onClick={() => handleLocaleChange(locale)}
					disabled={isPending}
					className={`flex min-h-11 w-full touch-manipulation items-center justify-between rounded-lg p-3 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 ${
						clientLocale === locale
							? "border border-red-200 bg-red-50 text-red-600 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400"
							: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
					}`}
					aria-pressed={clientLocale === locale}
				>
					<div className="flex items-center space-x-3">
						<span className="text-lg">{languageFlags[locale]}</span>
						<span className="font-medium text-sm">{languageNames[locale]}</span>
					</div>
					{clientLocale === locale && (
						<div className="h-2 w-2 rounded-full bg-red-500" />
					)}
				</button>
			))}
		</div>
	);
}
