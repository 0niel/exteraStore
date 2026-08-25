"use client";

import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { TelegramIcon } from "~/components/icons/telegram-icon";
import { Button } from "~/components/ui/button";

type TelegramAuthData = {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	photo_url?: string;
	auth_date: number;
	hash: string;
};

declare global {
	interface Window {
		TelegramAuthLogin?: {
			onAuthCallback: (data: TelegramAuthData) => void;
		};
	}
}

export function TelegramLoginButton({ botUsername }: { botUsername?: string }) {
	const t = useTranslations("Auth");
	const locale = useLocale();
	const containerRef = useRef<HTMLDivElement>(null);
	const handleAuth = useCallback(
		async (data: TelegramAuthData) => {
			const result = await signIn("telegram", {
				...data,
				redirect: false,
			});

			if (result?.error) {
				toast.error(t("telegramAuthFailed"));
				return;
			}

			if (result?.ok) {
				window.location.href = "/";
			}
		},
		[t],
	);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || !botUsername) return;
		const labelFrame = () => {
			container
				.querySelector("iframe")
				?.setAttribute("title", t("telegram_login_frame"));
		};
		const observer = new MutationObserver(labelFrame);
		observer.observe(container, { childList: true, subtree: true });
		window.TelegramAuthLogin = { onAuthCallback: handleAuth };
		const script = document.createElement("script");
		script.async = true;
		script.src = "https://telegram.org/js/telegram-widget.js?22";
		script.dataset.telegramLogin = botUsername;
		script.dataset.size = "large";
		script.dataset.radius = "10";
		script.dataset.requestAccess = "write";
		script.dataset.userpic = "false";
		script.dataset.lang = locale;
		script.dataset.onauth = "TelegramAuthLogin.onAuthCallback(user)";
		container.replaceChildren(script);

		return () => {
			observer.disconnect();
			container.replaceChildren();
			delete window.TelegramAuthLogin;
		};
	}, [botUsername, handleAuth, locale, t]);

	if (!botUsername) {
		return (
			<Button
				disabled
				className="h-12 w-full cursor-not-allowed bg-[#0088cc] font-medium text-white opacity-50"
				size="lg"
			>
				<TelegramIcon className="mr-3 h-5 w-5" />
				{t("not_configured")}
			</Button>
		);
	}

	return (
		<div
			ref={containerRef}
			className="flex min-h-12 w-full items-center justify-center overflow-hidden rounded-xl [&>iframe]:max-w-full"
		/>
	);
}
