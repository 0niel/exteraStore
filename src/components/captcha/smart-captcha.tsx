"use client";

import { CheckCircle2 } from "lucide-react";
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
	const containerRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<number | null>(null);
	const onSuccessRef = useRef(onSuccess);
	const onErrorRef = useRef(onError);
	const reduceMotionRef = useRef(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [shouldHide, setShouldHide] = useState(false);
	const [reduceMotion, setReduceMotion] = useState(false);

	onSuccessRef.current = onSuccess;
	onErrorRef.current = onError;
	reduceMotionRef.current = reduceMotion;

	useEffect(() => {
		const sitekey = env.NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY;
		if (!sitekey) return;

		let disposed = false;
		const timers = new Set<ReturnType<typeof setTimeout>>();

		const handleSuccess = (token: string) => {
			if (disposed) return;
			setIsSuccess(true);
			setShowSuccess(true);
			const hideDelay = reduceMotionRef.current ? 0 : 1200;
			const fadeDelay = reduceMotionRef.current ? 0 : 1000;

			timers.add(
				setTimeout(() => {
					setShowSuccess(false);
				}, fadeDelay),
			);

			timers.add(
				setTimeout(() => {
					setShouldHide(true);
				}, hideDelay),
			);

			onSuccessRef.current(token);
		};

		const handleInvalidToken = () => {
			if (disposed) return;
			setIsSuccess(false);
			setShowSuccess(false);
			setShouldHide(false);
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
		<div className={shouldHide ? "hidden" : "space-y-2"}>
			<div
				ref={containerRef}
				className={`${
					reduceMotion ? "" : "transition-all duration-300 ease-out"
				} ${isSuccess ? "opacity-0" : "opacity-100"}`}
				style={{
					height: isSuccess ? 0 : "100px",
					overflow: "hidden",
				}}
			/>

			{showSuccess && (
				<output
					aria-live="polite"
					className={`${
						reduceMotion
							? ""
							: "fade-in-0 slide-in-from-top-1 animate-in duration-300"
					} inline-flex items-center gap-2 rounded-md border border-green-200/50 bg-green-50 px-2.5 py-1 font-medium text-green-700 text-xs shadow-sm dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300`}
				>
					<CheckCircle2
						className="h-4 w-4 text-green-600 dark:text-green-400"
						aria-hidden="true"
					/>
					<span>Проверка пройдена</span>
				</output>
			)}
		</div>
	);
}
