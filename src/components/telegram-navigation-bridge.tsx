"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTelegramWebApp } from "~/hooks/use-telegram-web-app";

export function TelegramNavigationBridge() {
	const pathname = usePathname();
	const router = useRouter();
	const { webApp, isTelegramWebApp } = useTelegramWebApp();

	useEffect(() => {
		const backButton = webApp?.BackButton;
		if (!isTelegramWebApp || !backButton) return;

		const goBack = () => {
			webApp.HapticFeedback?.impactOccurred?.("light");
			router.back();
		};

		if (pathname === "/") {
			backButton.hide();
			return;
		}

		backButton.show();
		backButton.onClick(goBack);
		return () => backButton.offClick(goBack);
	}, [isTelegramWebApp, pathname, router, webApp]);

	return null;
}
