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
import { StructuredData } from "~/components/structured-data";
import { TelegramMotionProvider } from "~/components/telegram-motion-provider";
import { TelegramNavigationBridge } from "~/components/telegram-navigation-bridge";
import { TelegramWebAppAuth } from "~/components/telegram-web-app-auth";
import { Toaster } from "~/components/ui/sonner";
import { type Locale, locales } from "~/lib/i18n-config";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "~/lib/site";
import { auth } from "~/server/auth";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: "exteraStore — плагины для Telegram",
		template: "%s · exteraStore",
	},
	description: SITE_DESCRIPTION,
	applicationName: SITE_NAME,
	creator: "exteraStore community",
	publisher: "exteraStore community",
	category: "technology",
	referrer: "strict-origin-when-cross-origin",
	formatDetection: {
		telephone: false,
		address: false,
		email: false,
	},
	manifest: "/manifest.webmanifest",
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
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-image-preview": "large",
			"max-snippet": -1,
			"max-video-preview": -1,
		},
	},
	openGraph: {
		title: "exteraStore — плагины для Telegram",
		description: SITE_DESCRIPTION,
		type: "website",
		siteName: SITE_NAME,
		locale: "ru_RU",
		alternateLocale: "en_US",
	},
	twitter: {
		card: "summary_large_image",
		title: "exteraStore — плагины для Telegram",
		description: SITE_DESCRIPTION,
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
	userScalable: true,
	interactiveWidget: "resizes-content",
	colorScheme: "light dark",
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
	const websiteData = {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "Organization",
				"@id": `${SITE_URL}/#organization`,
				name: SITE_NAME,
				url: SITE_URL,
				logo: `${SITE_URL}/favicon.svg`,
				description: SITE_DESCRIPTION,
				sameAs: [
					"https://github.com/0niel/exteraStore",
					"https://t.me/exteraForum",
				],
			},
			{
				"@type": "WebSite",
				"@id": `${SITE_URL}/#website`,
				url: SITE_URL,
				name: SITE_NAME,
				description: SITE_DESCRIPTION,
				publisher: { "@id": `${SITE_URL}/#organization` },
				potentialAction: {
					"@type": "SearchAction",
					target: `${SITE_URL}/plugins?search={search_term_string}`,
					"query-input": "required name=search_term_string",
				},
			},
		],
	};
	return (
		<html
			lang={locale}
			className={`${GeistSans.variable} ${GeistMono.variable}`}
			suppressHydrationWarning
		>
			<body className="overflow-x-hidden bg-background font-sans antialiased">
				<StructuredData data={websiteData} />
				<Script id="telegram-mini-app-bootstrap" strategy="beforeInteractive">
					{`try{const s=sessionStorage.getItem("__telegram__initParams");const p=s?JSON.parse(s):null;if(/(?:^|[&#?])tgWebApp(?:Data|Version|Platform)=/.test(location.hash)||window.TelegramWebviewProxy||p?.tgWebAppData||document.referrer.startsWith("https://web.telegram.org/")){document.documentElement.dataset.telegramMiniApp="true";window.TelegramWebviewProxy?.postEvent("web_app_setup_swipe_behavior",JSON.stringify({allow_vertical_swipe:false}))}}catch{}`}
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
									<TelegramNavigationBridge />
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
