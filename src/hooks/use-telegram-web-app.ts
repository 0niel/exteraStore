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
	viewportStableHeight?: number;
	isVerticalSwipesEnabled?: boolean;
	colorScheme?: "light" | "dark";
	ready: () => void;
	expand: () => void;
	close: () => void;
	openTelegramLink?: (url: string) => void;
	BackButton?: {
		isVisible?: boolean;
		show: () => void;
		hide: () => void;
		onClick: (callback: () => void) => void;
		offClick: (callback: () => void) => void;
	};
	HapticFeedback?: {
		impactOccurred?: (style: "light" | "medium" | "heavy") => void;
		notificationOccurred?: (type: "error" | "success" | "warning") => void;
		selectionChanged?: () => void;
	};
	disableVerticalSwipes?: () => void;
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
		TelegramWebviewProxy?: { postEvent: (type: string, data: string) => void };
	}
}

type TelegramStatus = "loading" | "ready" | "unavailable";

let telegramConnectionPromise: Promise<TelegramWebApp | null> | null = null;

function isTelegramLaunch() {
	if (
		/(?:^|[&#?])tgWebApp(?:Data|Version|Platform)=/.test(location.hash) ||
		window.TelegramWebviewProxy
	) {
		return true;
	}

	const external = window.external as typeof window.external & {
		notify?: unknown;
	};
	if (typeof external?.notify === "function") {
		return true;
	}

	try {
		const stored = sessionStorage.getItem("__telegram__initParams");
		const params = stored
			? (JSON.parse(stored) as { tgWebAppData?: unknown })
			: null;
		if (typeof params?.tgWebAppData === "string" && params.tgWebAppData) {
			return true;
		}
	} catch {}

	return document.referrer.startsWith("https://web.telegram.org/");
}

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

function applyTelegramViewport(webApp: TelegramWebApp) {
	const height = webApp.viewportHeight;
	const stableHeight = webApp.viewportStableHeight ?? height;
	const root = document.documentElement;

	if (typeof height === "number" && height > 0) {
		root.style.setProperty("--app-viewport-height", `${height}px`);
	}
	if (typeof stableHeight === "number" && stableHeight > 0) {
		root.style.setProperty("--app-viewport-stable-height", `${stableHeight}px`);
	}
}

function connectTelegramWebApp() {
	if (telegramConnectionPromise) return telegramConnectionPromise;

	telegramConnectionPromise = new Promise<TelegramWebApp | null>((resolve) => {
		let pollId: number | undefined;
		let timeoutId: number | undefined;
		let settled = false;
		let script = document.querySelector<HTMLScriptElement>(
			'script[src="https://telegram.org/js/telegram-web-app.js"]',
		);

		const stopWaiting = () => {
			if (pollId !== undefined) window.clearInterval(pollId);
			if (timeoutId !== undefined) window.clearTimeout(timeoutId);
		};

		const finish = (webApp: TelegramWebApp | null) => {
			if (settled) return;
			settled = true;
			stopWaiting();
			resolve(webApp);
		};

		const connect = () => {
			if (settled) return false;
			const candidate = window.Telegram?.WebApp;
			if (!candidate) return false;

			const syncTheme = () => applyTelegramTheme(candidate);
			const syncViewport = () => applyTelegramViewport(candidate);
			applyTelegramTheme(candidate);
			applyTelegramViewport(candidate);
			try {
				candidate.ready();
			} catch {}
			try {
				candidate.expand();
			} catch {}
			try {
				candidate.disableVerticalSwipes?.();
			} catch {}
			candidate.onEvent?.("themeChanged", syncTheme);
			candidate.onEvent?.("viewportChanged", syncViewport);
			finish(candidate);
			return true;
		};

		if (connect()) return;
		if (!script && !isTelegramLaunch()) {
			finish(null);
			return;
		}

		const handleScriptLoad = () => connect();
		const handleScriptError = () => finish(null);

		if (!script) {
			script = document.createElement("script");
			script.src = "https://telegram.org/js/telegram-web-app.js";
			script.async = true;
			script.fetchPriority = "high";
			script.addEventListener("load", handleScriptLoad, { once: true });
			script.addEventListener("error", handleScriptError, { once: true });
			document.head.append(script);
		} else {
			script.addEventListener("load", handleScriptLoad, { once: true });
			script.addEventListener("error", handleScriptError, { once: true });
		}
		pollId = window.setInterval(connect, 100);
		timeoutId = window.setTimeout(() => finish(null), 5000);
	});

	return telegramConnectionPromise;
}

export function useTelegramWebApp() {
	const [status, setStatus] = useState<TelegramStatus>("loading");
	const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

	useEffect(() => {
		let active = true;
		void connectTelegramWebApp().then((connected) => {
			if (!active) return;
			setWebApp(connected);
			setStatus(connected ? "ready" : "unavailable");
		});

		return () => {
			active = false;
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
