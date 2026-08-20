"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { env } from "~/env";

interface SmartCaptchaProps {
	onSuccess: (token: string) => void;
	onError?: () => void;
}

declare global {
	interface Window {
		smartCaptcha?: {
			render: (
				container: HTMLElement,
				params: {
					sitekey: string;
					hl?: string;
					callback?: (token: string) => void;
					"error-callback"?: () => void;
					"expired-callback"?: () => void;
				},
			) => number;
			reset: (widgetId: number) => void;
			destroy: (widgetId: number) => void;
		};
	}
}

export function SmartCaptcha({ onSuccess, onError }: SmartCaptchaProps) {
	const t = useTranslations("Auth");
	const containerRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<number | null>(null);
	const onSuccessRef = useRef(onSuccess);
	const onErrorRef = useRef(onError);
	const reduceMotionRef = useRef(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [reduceMotion, setReduceMotion] = useState(false);

	onSuccessRef.current = onSuccess;
	onErrorRef.current = onError;
	reduceMotionRef.current = reduceMotion;

	useEffect(() => {
		const sitekey = env.NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY;
		if (!sitekey) {
			onSuccessRef.current("captcha-disabled");
			return;
		}

		let disposed = false;
		const timers = new Set<ReturnType<typeof setTimeout>>();

		const handleSuccess = (token: string) => {
			if (disposed) return;
			setIsSuccess(true);
			setShowSuccess(true);
			onSuccessRef.current(token);
		};

		const handleInvalidToken = () => {
			if (disposed) return;
			setIsSuccess(false);
			setShowSuccess(false);
			onErrorRef.current?.();
		};

		const loadCaptcha = () => {
			if (
				!disposed &&
				containerRef.current &&
				window.smartCaptcha &&
				widgetIdRef.current === null
			) {
				try {
					widgetIdRef.current = window.smartCaptcha.render(
						containerRef.current,
						{
							sitekey,
							hl: document.documentElement.lang === "ru" ? "ru" : "en",
							callback: handleSuccess,
							"error-callback": handleInvalidToken,
							"expired-callback": handleInvalidToken,
						},
					);
				} catch {
					widgetIdRef.current = null;
					handleInvalidToken();
				}
			}
		};

		const handleLoadError = () => onErrorRef.current?.();
		const scriptSrc = "https://smartcaptcha.yandexcloud.net/captcha.js";
		let script = document.querySelector<HTMLScriptElement>(
			`script[src="${scriptSrc}"]`,
		);

		if (window.smartCaptcha) {
			loadCaptcha();
		} else {
			if (!script) {
				script = document.createElement("script");
				script.src = scriptSrc;
				script.async = true;
				script.defer = true;
				document.head.appendChild(script);
			}
			script.addEventListener("load", loadCaptcha);
			script.addEventListener("error", handleLoadError);
		}

		return () => {
			disposed = true;
			for (const timer of timers) clearTimeout(timer);
			script?.removeEventListener("load", loadCaptcha);
			script?.removeEventListener("error", handleLoadError);
			if (widgetIdRef.current !== null && window.smartCaptcha) {
				const widgetId = widgetIdRef.current;
				widgetIdRef.current = null;
				try {
					window.smartCaptcha.destroy(widgetId);
				} catch {}
			}
		};
	}, []);

	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setReduceMotion(mq.matches);
		update();
		if (mq.addEventListener) {
			mq.addEventListener("change", update);
			return () => mq.removeEventListener("change", update);
		}
		mq.addListener(update);
		return () => mq.removeListener(update);
	}, []);

	if (!env.NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY) {
		return null;
	}

	return (
		<div
			className={`${
				reduceMotion ? "" : "transition-[height] duration-300 ease-out"
			} overflow-hidden`}
			style={{ height: isSuccess ? "44px" : "100px" }}
		>
			<div
				className={`${isSuccess ? "pointer-events-none hidden" : ""} overflow-hidden rounded-xl border dark:border-0 dark:[filter:invert(0.88)_hue-rotate(180deg)_saturate(1.3)]`}
			>
				<div ref={containerRef} className="h-[100px]" />
			</div>

			{showSuccess && (
				<output
					aria-live="polite"
					className={`${
						reduceMotion
							? ""
							: "fade-in-0 slide-in-from-top-1 animate-in duration-300"
					} flex min-h-11 items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 font-medium text-sm text-success`}
				>
					<CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
					<span>{t("captcha_passed")}</span>
				</output>
			)}
		</div>
	);
}
