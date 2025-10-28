"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useTelegramWebApp } from "~/hooks/use-telegram-web-app";
import { toast } from "sonner";

export function TelegramWebAppAuth() {
	const { isTelegramWebApp, webApp, user } = useTelegramWebApp();
	const { data: session } = useSession();
	const [authAttempted, setAuthAttempted] = useState(false);

	useEffect(() => {
		if (!isTelegramWebApp || !webApp || !user || authAttempted || session?.user) {
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
					toast.success("Добро пожаловать в exteraStore!");
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
	}, [isTelegramWebApp, webApp, user, authAttempted, session]);

	return null;
}

