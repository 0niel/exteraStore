import "~/styles/globals.css";

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies, headers } from "next/headers";
import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { Footer } from "~/components/footer";
import { Navigation } from "~/components/navigation";
import { TelegramWebAppAuth } from "~/components/telegram-web-app-auth";
import { Toaster } from "~/components/ui/sonner";
import { type Locale, locales } from "~/lib/i18n-config";
import { auth } from "~/server/auth";
import { TRPCReactProvider } from "~/trpc/react";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

export const metadata: Metadata = {
	title: "exteraStore - A revolutionary plugin store for Telegram",
	description:
		"Discover new Telegram features with exteraStore. Create, share, and install plugins for exteraGram — the most powerful Telegram client.",
	icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
	keywords: [
		"exteraStore",
		"exteraGram",
		"Telegram",
		"plugins",
		"Python",
		"Xposed",
		"modifications",
		"store",
	],
	authors: [{ name: "exteraStore Team" }],
	openGraph: {
		title: "exteraStore",
		description: "A revolutionary plugin store for Telegram",
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
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#171717" },
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

	return (
		<html lang={locale} className={inter.variable} suppressHydrationWarning>
			<head>
				<script src="https://telegram.org/js/telegram-web-app.js" async />
			</head>
			<body className="overflow-x-hidden bg-background font-sans antialiased">
				<a
					href="#main-content"
					className="fixed top-[max(.5rem,env(safe-area-inset-top))] left-2 z-100 -translate-y-24 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground shadow-lg transition-transform focus:translate-y-0"
				>
					Перейти к содержимому
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
								<TelegramWebAppAuth />
								<div className="flex min-h-dvh flex-col overflow-x-hidden">
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
								<Toaster />
							</ThemeProvider>
						</TRPCReactProvider>
					</SessionProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
