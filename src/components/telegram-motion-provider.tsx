"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";

export function TelegramMotionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isTelegram, setIsTelegram] = useState(false);

	useEffect(() => {
		const sync = () => {
			setIsTelegram(Boolean(window.Telegram?.WebApp?.initData));
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
