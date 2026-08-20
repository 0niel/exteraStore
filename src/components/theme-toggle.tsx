"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export function ThemeToggle() {
	const { setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const t = useTranslations("ThemeToggle");

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<Button variant="ghost" size="icon" disabled aria-label={t("loading")} />
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" aria-label={t("toggle_theme")}>
					{resolvedTheme === "dark" ? (
						<Moon className="h-4 w-4" />
					) : (
						<Sun className="h-4 w-4" />
					)}
					<span className="sr-only">{t("toggle_theme")}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => setTheme("light")}>
					<Sun className="mr-2 h-4 w-4" />
					{t("light")}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("dark")}>
					<Moon className="mr-2 h-4 w-4" />
					{t("dark")}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("system")}>
					<Monitor className="mr-2 h-4 w-4" />
					{t("system")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function CompactThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const t = useTranslations("ThemeToggle");

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<div className="flex items-center gap-1">
				<div className="size-11 animate-pulse rounded-lg bg-muted" />
				<div className="size-11 animate-pulse rounded-lg bg-muted" />
				<div className="size-11 animate-pulse rounded-lg bg-muted" />
			</div>
		);
	}

	const themes = [
		{ key: "light", icon: Sun, label: t("light") },
		{ key: "dark", icon: Moon, label: t("dark") },
		{ key: "system", icon: Monitor, label: t("system") },
	];

	return (
		<div className="flex items-center gap-1">
			{themes.map(({ key, icon: Icon, label }) => (
				<button
					type="button"
					key={key}
					onClick={() => setTheme(key)}
					className={`flex size-11 touch-manipulation items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
						theme === key
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground"
					}`}
					title={label}
					aria-label={label}
					aria-pressed={theme === key}
				>
					<Icon className="h-4 w-4" />
				</button>
			))}
		</div>
	);
}

export function FooterThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const t = useTranslations("ThemeToggle");

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<div className="flex w-full items-center justify-between">
				<span className="text-muted-foreground text-sm">{t("loading")}</span>
				<div className="h-6 w-12 animate-pulse rounded-full bg-muted" />
			</div>
		);
	}

	const themes = [
		{ key: "light", label: t("light"), icon: Sun },
		{ key: "dark", label: t("dark"), icon: Moon },
		{ key: "system", label: t("system"), icon: Monitor },
	];

	return (
		<div className="space-y-3">
			{themes.map(({ key, label, icon: Icon }) => (
				<button
					type="button"
					key={key}
					onClick={() => setTheme(key)}
					className={`flex min-h-11 w-full touch-manipulation items-center justify-between rounded-lg p-3 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
						theme === key
							? "border border-red-200 bg-red-50 text-red-600 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400"
							: "text-muted-foreground hover:bg-muted hover:text-foreground"
					}`}
					aria-pressed={theme === key}
				>
					<div className="flex items-center space-x-3">
						<Icon className="h-4 w-4" />
						<span className="font-medium text-sm">{label}</span>
					</div>
					{theme === key && <div className="h-2 w-2 rounded-full bg-red-500" />}
				</button>
			))}
		</div>
	);
}
