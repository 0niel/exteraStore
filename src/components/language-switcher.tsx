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
import { cn } from "~/lib/utils";

const languageNames: Record<Locale, string> = {
	en: "English",
	ru: "Русский",
};

const languageFlags: Record<Locale, string> = {
	en: "🇺🇸",
	ru: "🇷🇺",
};

function useLocaleSwitch() {
	const router = useRouter();
	const currentLocale = useLocale() as Locale;
	const [isPending, startTransition] = useTransition();
	const [clientLocale, setClientLocale] = useState<Locale>(currentLocale);

	useEffect(() => {
		setClientLocale(getCurrentLocale());
	}, []);

	function switchLocale(locale: Locale) {
		startTransition(() => {
			setLocaleCookie(locale);
			setClientLocale(locale);
			router.refresh();
		});
	}

	return { clientLocale, isPending, switchLocale };
}

export function LanguageSwitcher() {
	const { clientLocale, isPending, switchLocale } = useLocaleSwitch();

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
						onClick={() => switchLocale(locale)}
						className={cn(clientLocale === locale && "bg-accent")}
					>
						{languageNames[locale]}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function CompactLanguageSwitcher() {
	const { clientLocale, isPending, switchLocale } = useLocaleSwitch();

	return (
		<div className="flex items-center gap-1">
			{locales.map((locale) => (
				<button
					type="button"
					key={locale}
					onClick={() => switchLocale(locale)}
					disabled={isPending}
					className={cn(
						"flex size-11 touch-manipulation items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
						clientLocale === locale
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
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
	const { clientLocale, isPending, switchLocale } = useLocaleSwitch();

	return (
		<div className="space-y-3">
			{locales.map((locale) => (
				<button
					type="button"
					key={locale}
					onClick={() => switchLocale(locale)}
					disabled={isPending}
					className={cn(
						"flex min-h-11 w-full touch-manipulation items-center justify-between rounded-lg p-3 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
						clientLocale === locale
							? "border border-primary/30 bg-primary/10 text-primary"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
					aria-pressed={clientLocale === locale}
				>
					<div className="flex items-center space-x-3">
						<span className="text-lg">{languageFlags[locale]}</span>
						<span className="font-medium text-sm">{languageNames[locale]}</span>
					</div>
					{clientLocale === locale && (
						<div className="h-2 w-2 rounded-full bg-primary" />
					)}
				</button>
			))}
		</div>
	);
}
