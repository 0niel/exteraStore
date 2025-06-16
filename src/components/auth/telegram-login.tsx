"use client";

import { LoginButton } from "@telegram-auth/react";
import { signIn } from "next-auth/react";
import { useCallback } from "react";
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

export function TelegramLoginButton({ botUsername }: { botUsername?: string }) {
	const handleAuth = useCallback((data: TelegramAuthData) => {
		signIn("telegram", {
			id: data.id,
			first_name: data.first_name,
			last_name: data.last_name,
			username: data.username,
			photo_url: data.photo_url,
			auth_date: data.auth_date,
			hash: data.hash,
			callbackUrl: "/",
		});
	}, []);

	if (!botUsername) {
		return (
			<Button
				disabled
				className="h-12 w-full cursor-not-allowed bg-[#0088cc] font-medium text-white opacity-50"
				size="lg"
			>
				<TelegramIcon className="mr-3 h-5 w-5" />
				Войти через Telegram (не настроен)
			</Button>
		);
	}

	return (
		<LoginButton
			botUsername={botUsername}
			onAuthCallback={handleAuth}
			buttonSize="large"
			cornerRadius={5}
			showAvatar={false}
		/>
	);
}
