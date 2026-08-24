import "~/styles/globals.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/styles.css";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { Footer } from "~/components/footer";
import { MobileTabBar } from "~/components/mobile-tab-bar";
import { Navigation } from "~/components/navigation";
import { TelegramMotionProvider } from "~/components/telegram-motion-provider";
import { TelegramWebAppAuth } from "~/components/telegram-web-app-auth";
import { Toaster } from "~/components/ui/sonner";
import { type Locale, locales } from "~/lib/i18n-config";
import { auth } from "~/server/auth";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: {
		default: "exteraStore — плагины для Telegram",
		template: "%s · exteraStore",
	},
	description:
		"Независимый каталог плагинов для exteraGram и совместимых расширений exteraless: находите, проверяйте и публикуйте дополнения.",
	icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
	keywords: [
		"exteraStore",
		"exteraGram",
		"exteraless",
		"Telegram",
		"plugins",
		"Python",
		"Xposed",
		"modifications",
		"store",
	],
	authors: [{ name: "exteraStore community" }],
	openGraph: {
		title: "exteraStore",
		description: "Каталог плагинов для exteraGram и exteraless",
		type: "website",
		locale: "en_US",
		alternateLocale: "ru_RU",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
	userScalable: true,
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#f8f6f4" },
		{ media: "(prefers-color-scheme: dark)", color: "#0b0909" },
	],
};

async function getServerLocale(): Promise<Locale> {
	const cookieStore = await cookies();
	const localeCookie = cookieStore.get("locale")?.value as Locale;

	if (localeCookie && locales.includes(localeCookie)) {
		return localeCookie;
	}

	const headersList = await headers();
	const acceptLanguage = headersList.get("accept-language");

	if (acceptLanguage) {
		const preferredLocales = acceptLanguage
			.split(",")
			.map((lang) => {
				const [locale, q = "1"] = lang.trim().split(";q=");
				return { locale: locale?.split("-")[0], quality: Number.parseFloat(q) };
			})
			.sort((a, b) => b.quality - a.quality);

		for (const { locale } of preferredLocales) {
			if (locale && locales.includes(locale as Locale)) {
				return locale as Locale;
			}
		}
	}

	return "en";
}

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const session = await auth();
	const messages = await getMessages();
	const locale = await getServerLocale();
	const t = await getTranslations("Navigation");
	return (
		<html
			lang={locale}
			className={`${GeistSans.variable} ${GeistMono.variable}`}
			suppressHydrationWarning
		>
			<body className="overflow-x-hidden bg-background font-sans antialiased">
				<Script
					src="https://telegram.org/js/telegram-web-app.js"
					strategy="beforeInteractive"
				/>
				<Script id="telegram-mini-app-bootstrap" strategy="beforeInteractive">
					{`if(window.Telegram?.WebApp?.initData){document.documentElement.dataset.telegramMiniApp="true"}`}
				</Script>
				<a
					href="#main-content"
					className="fixed top-[max(.5rem,env(safe-area-inset-top))] left-2 z-100 -translate-y-24 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground shadow-lg transition-transform focus:translate-y-0"
				>
					{t("skip_to_content")}
				</a>
				<NextIntlClientProvider messages={messages}>
					<SessionProvider session={session}>
						<TRPCReactProvider>
							<ThemeProvider
								attribute="class"
								defaultTheme="system"
								enableSystem
								disableTransitionOnChange
							>
								<TelegramMotionProvider>
									<TelegramWebAppAuth />
									<div className="flex min-h-dvh flex-col overflow-x-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
										<Navigation />
										<main
											id="main-content"
											tabIndex={-1}
											className="w-full max-w-full flex-1 overflow-x-hidden focus:outline-none"
										>
											{children}
										</main>
										<Footer />
									</div>
									<MobileTabBar />
									<Toaster />
								</TelegramMotionProvider>
							</ThemeProvider>
						</TRPCReactProvider>
					</SessionProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
