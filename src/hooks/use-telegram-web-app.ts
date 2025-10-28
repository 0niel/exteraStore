"use client";

import { useEffect, useState } from "react";

interface TelegramWebApp {
	initData: string;
	initDataUnsafe: {
		user?: {
			id: number;
			first_name: string;
			last_name?: string;
			username?: string;
			language_code?: string;
			is_bot?: boolean;
			photo_url?: string;
		};
		query_id?: string;
		auth_date?: number;
		hash: string;
	};
	isExpanded: boolean;
	viewportHeight: number;
	ready: () => void;
	expand: () => void;
	close: () => void;
	MainButton: {
		text: string;
		color: string;
		textColor: string;
		isVisible: boolean;
		isActive: boolean;
		isProgressVisible: boolean;
		show: () => void;
		hide: () => void;
		onClick: (callback: () => void) => void;
		offClick: (callback: () => void) => void;
	};
	BackButton: {
		isVisible: boolean;
		show: () => void;
		hide: () => void;
		onClick: (callback: () => void) => void;
		offClick: (callback: () => void) => void;
	};
	themeParams: {
		bg_color?: string;
		text_color?: string;
		hint_color?: string;
		link_color?: string;
		button_color?: string;
		button_text_color?: string;
	};
}

declare global {
	interface Window {
		Telegram?: {
			WebApp: TelegramWebApp;
		};
	}
}

export function useTelegramWebApp() {
	const [isReady, setIsReady] = useState(false);
	const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
	const [user, setUser] = useState<TelegramWebApp["initDataUnsafe"]["user"] | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const checkTelegram = () => {
			if (window.Telegram?.WebApp) {
				const tg = window.Telegram.WebApp;
				setWebApp(tg);
				setUser(tg.initDataUnsafe.user || null);
				
				tg.ready();
				tg.expand();
				
				setIsReady(true);
			}
		};

		if (window.Telegram?.WebApp) {
			checkTelegram();
		} else {
			const script = document.querySelector('script[src="https://telegram.org/js/telegram-web-app.js"]');
			if (script) {
				script.addEventListener("load", checkTelegram);
			} else {
				setTimeout(checkTelegram, 100);
			}
		}
	}, []);

	return {
		isReady,
		webApp,
		user,
		initData: webApp?.initData || "",
		isTelegramWebApp: isReady && !!user,
	};
}

