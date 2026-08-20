"use client";

import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTelegramWebApp } from "~/hooks/use-telegram-web-app";

export function TelegramWebAppAuth() {
	const { isTelegramWebApp, webApp, user } = useTelegramWebApp();
	const { data: session } = useSession();
	const t = useTranslations("Auth");
	const [authAttempted, setAuthAttempted] = useState(false);

	useEffect(() => {
		if (
			!isTelegramWebApp ||
			!webApp ||
			!user ||
			authAttempted ||
			session?.user
		) {
			return;
		}

		const authenticateWithTelegram = async () => {
			try {
				setAuthAttempted(true);

				const initDataUnsafe = webApp.initDataUnsafe;

				const credentials = {
					id: user.id.toString(),
					first_name: user.first_name,
					last_name: user.last_name || "",
					username: user.username || "",
					photo_url: user.photo_url || "",
					auth_date: initDataUnsafe.auth_date?.toString() || "",
					hash: initDataUnsafe.hash,
				};

				const result = await signIn("telegram", {
					...credentials,
					redirect: false,
					callbackUrl: window.location.pathname,
				});

				if (result?.ok) {
					toast.success(t("webapp_welcome"));
				} else if (result?.error) {
					console.error("Auth error:", result.error);
					toast.error("Ошибка входа через Telegram Web App");
				}
			} catch (error) {
				console.error("Telegram WebApp auth error:", error);
				toast.error("Не удалось войти через Telegram Web App");
			}
		};

		const timer = setTimeout(() => {
			authenticateWithTelegram();
		}, 800);

		return () => clearTimeout(timer);
	}, [isTelegramWebApp, webApp, user, authAttempted, session, t]);

	return null;
}
