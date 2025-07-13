import "~/styles/globals.css";

import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import { cookies, headers } from "next/headers";
import { type Locale, locales } from "~/lib/i18n-config";

import { Navigation } from "~/components/navigation";
import { Toaster } from "~/components/ui/sonner";
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
		<html lang={locale} className={`${inter.variable}`}>
			<head>
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
				/>
			</head>
			<body className="min-h-screen overflow-x-hidden bg-background font-sans antialiased">
				<NextIntlClientProvider messages={messages}>
					<SessionProvider session={session}>
						<TRPCReactProvider>
							<ThemeProvider
								attribute="class"
								defaultTheme="system"
								enableSystem
								disableTransitionOnChange
							>
								<Navigation />
								<main className="w-full max-w-full overflow-x-hidden">
									{children}
								</main>
								<Toaster />
							</ThemeProvider>
						</TRPCReactProvider>
					</SessionProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
