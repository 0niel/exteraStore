"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export function ThemeToggle() {
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const t = useTranslations("ThemeToggle");

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <Button variant="ghost" size="icon" className="h-8 w-8" />;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8">
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
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const t = useTranslations("ThemeToggle");

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<div className="flex items-center gap-1">
				<div className="h-6 w-6 bg-muted rounded animate-pulse" />
				<div className="h-6 w-6 bg-muted rounded animate-pulse" />
				<div className="h-6 w-6 bg-muted rounded animate-pulse" />
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
					key={key}
					onClick={() => setTheme(key)}
					className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
						theme === key 
							? 'bg-primary text-primary-foreground' 
							: 'hover:bg-muted text-muted-foreground hover:text-foreground'
					}`}
					title={label}
				>
					<Icon className="h-3 w-3" />
				</button>
			))}
		</div>
	);
}

export function FooterThemeToggle() {
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const t = useTranslations("ThemeToggle");

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<div className="flex items-center justify-between w-full">
				<span className="text-sm text-gray-600 dark:text-gray-400">{t("loading")}</span>
				<div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
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
					key={key}
					onClick={() => setTheme(key)}
					className={`
						w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200
						${theme === key 
							? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50' 
							: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
						}
					`}
				>
					<div className="flex items-center space-x-3">
						<Icon className="w-4 h-4" />
						<span className="text-sm font-medium">{label}</span>
					</div>
					{theme === key && (
						<div className="w-2 h-2 bg-red-500 rounded-full" />
					)}
				</button>
			))}
		</div>
	);
} 