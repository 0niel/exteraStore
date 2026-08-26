"use client";

import { MotionConfig } from "framer-motion";
import { useTelegramWebApp } from "~/hooks/use-telegram-web-app";

export function TelegramMotionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { status, webApp } = useTelegramWebApp();
	const isTelegram = status === "ready" && Boolean(webApp);

	return (
		<MotionConfig
			reducedMotion={isTelegram ? "always" : "user"}
			skipAnimations={isTelegram}
		>
			{children}
		</MotionConfig>
	);
}
