"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";

function detectTelegramMode() {
	return (
		typeof window !== "undefined" && Boolean(window.Telegram?.WebApp?.initData)
	);
}

export function TelegramMotionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isTelegram, setIsTelegram] = useState(false);

	useEffect(() => {
		const sync = () => {
			setIsTelegram(detectTelegramMode());
		};
		sync();
		const interval = window.setInterval(sync, 100);
		const timeout = window.setTimeout(
			() => window.clearInterval(interval),
			5000,
		);
		return () => {
			window.clearInterval(interval);
			window.clearTimeout(timeout);
		};
	}, []);

	return (
		<MotionConfig
			reducedMotion={isTelegram ? "always" : "user"}
			skipAnimations={isTelegram}
		>
			{children}
		</MotionConfig>
	);
}
