"use client";

import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTelegramWebApp } from "~/hooks/use-telegram-web-app";

export function TelegramWebAppAuth() {
	const { isTelegramWebApp, initData } = useTelegramWebApp();
	const { status, update } = useSession();
	const router = useRouter();
	const t = useTranslations("Auth");
	const attemptedInitData = useRef<string | null>(null);

	useEffect(() => {
		if (
			!isTelegramWebApp ||
			!initData ||
			status !== "unauthenticated" ||
			attemptedInitData.current === initData
		) {
			return;
		}

		attemptedInitData.current = initData;
		let cancelled = false;

		const authenticateWithTelegram = async () => {
			for (let attempt = 0; attempt < 2; attempt += 1) {
				try {
					const result = await signIn("telegram", {
						initData,
						redirect: false,
						callbackUrl: window.location.href,
					});

					if (cancelled) return;
					if (result?.ok) {
						await update();
						router.refresh();
						toast.success(t("webapp_welcome"));
						return;
					}
				} catch {
					if (cancelled) return;
				}

				if (attempt === 0) {
					await new Promise((resolve) => window.setTimeout(resolve, 500));
				}
			}

			if (!cancelled) {
				toast.error(t("webapp_failed"));
			}
		};

		void authenticateWithTelegram();

		return () => {
			cancelled = true;
		};
	}, [initData, isTelegramWebApp, router, status, t, update]);

	return null;
}
