"use client";

import { useEffect, useState } from "react";

interface TelegramWebAppUser {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	language_code?: string;
	is_bot?: boolean;
	photo_url?: string;
}

interface TelegramWebApp {
	initData?: string;
	initDataUnsafe?: {
		user?: TelegramWebAppUser;
		query_id?: string;
		auth_date?: number;
		hash?: string;
	};
	isExpanded?: boolean;
	viewportHeight?: number;
	colorScheme?: "light" | "dark";
	ready: () => void;
	expand: () => void;
	close: () => void;
	onEvent?: (
		event: "themeChanged" | "viewportChanged",
		callback: () => void,
	) => void;
	offEvent?: (
		event: "themeChanged" | "viewportChanged",
		callback: () => void,
	) => void;
	setHeaderColor?: (color: string) => void;
	setBackgroundColor?: (color: string) => void;
	isVersionAtLeast?: (version: string) => boolean;
	themeParams?: {
		bg_color?: string;
		secondary_bg_color?: string;
		text_color?: string;
		hint_color?: string;
		link_color?: string;
		button_color?: string;
		button_text_color?: string;
	};
}

declare global {
	interface Window {
		Telegram?: { WebApp?: TelegramWebApp };
	}
}

type TelegramStatus = "loading" | "ready" | "unavailable";

function applyTelegramTheme(webApp: TelegramWebApp) {
	const root = document.documentElement;
	const theme = webApp.themeParams;
	root.dataset.telegramMiniApp = "true";

	if (webApp.colorScheme) {
		root.dataset.telegramColorScheme = webApp.colorScheme;
	}
	if (theme?.bg_color) {
		root.style.setProperty("--tg-theme-bg-color", theme.bg_color);
	}
	if (theme?.secondary_bg_color) {
		root.style.setProperty(
			"--tg-theme-secondary-bg-color",
			theme.secondary_bg_color,
		);
	}
	if (theme?.text_color) {
		root.style.setProperty("--tg-theme-text-color", theme.text_color);
	}

	if (webApp.isVersionAtLeast?.("6.1") !== false) {
		try {
			webApp.setHeaderColor?.(theme?.bg_color ?? "bg_color");
			webApp.setBackgroundColor?.(theme?.bg_color ?? "bg_color");
		} catch {}
	}
}

export function useTelegramWebApp() {
	const [status, setStatus] = useState<TelegramStatus>("loading");
	const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

	useEffect(() => {
		let connected: TelegramWebApp | null = null;
		let pollId: number | undefined;
		let timeoutId: number | undefined;
		const script = document.querySelector<HTMLScriptElement>(
			'script[src="https://telegram.org/js/telegram-web-app.js"]',
		);

		const stopWaiting = () => {
			if (pollId !== undefined) window.clearInterval(pollId);
			if (timeoutId !== undefined) window.clearTimeout(timeoutId);
		};

		const syncTheme = () => {
			if (connected) applyTelegramTheme(connected);
		};

		const connect = () => {
			if (connected) return true;
			const candidate = window.Telegram?.WebApp;
			if (!candidate) return false;

			connected = candidate;
			stopWaiting();
			if (candidate.initData) {
				applyTelegramTheme(candidate);
				try {
					candidate.ready();
				} catch {}
				try {
					candidate.expand();
				} catch {}
				candidate.onEvent?.("themeChanged", syncTheme);
			}
			setWebApp(candidate);
			setStatus("ready");
			return true;
		};

		const handleScriptLoad = () => {
			connect();
		};
		const handleScriptError = () => {
			stopWaiting();
			setStatus("unavailable");
		};

		if (!connect()) {
			script?.addEventListener("load", handleScriptLoad);
			script?.addEventListener("error", handleScriptError);
			pollId = window.setInterval(connect, 100);
			timeoutId = window.setTimeout(() => {
				stopWaiting();
				setStatus("unavailable");
			}, 5000);
		}

		return () => {
			stopWaiting();
			script?.removeEventListener("load", handleScriptLoad);
			script?.removeEventListener("error", handleScriptError);
			connected?.offEvent?.("themeChanged", syncTheme);
		};
	}, []);

	const user = webApp?.initDataUnsafe?.user ?? null;
	const initData = webApp?.initData ?? "";

	return {
		status,
		webApp,
		user,
		initData,
		isTelegramWebApp: status === "ready" && Boolean(initData && user),
	};
}
