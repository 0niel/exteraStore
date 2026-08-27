import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { AiCollections } from "~/components/home/ai-collections";
import { DeveloperCTA } from "~/components/home/developer-cta";
import { FeaturedPlugins } from "~/components/home/featured-plugins";
import { HeroSection } from "~/components/home/hero-section";
import { TrendingPlugins } from "~/components/home/trending-plugins";
import { StructuredData } from "~/components/structured-data";
import { absoluteUrl, OPEN_GRAPH_IMAGE, SITE_DESCRIPTION } from "~/lib/site";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale();
	const title =
		locale === "ru"
			? "exteraStore — плагины для Telegram"
			: "exteraStore — Telegram plugins";
	const description =
		locale === "ru"
			? SITE_DESCRIPTION
			: "An independent catalog for exteraGram plugins and exteraless-compatible extensions.";
	return {
		title,
		description,
		alternates: { canonical: "/" },
		openGraph: {
			url: absoluteUrl("/"),
			title,
			description,
			images: [OPEN_GRAPH_IMAGE],
		},
	};
}

export default async function Home() {
	const locale = await getLocale();
	const description =
		locale === "ru"
			? SITE_DESCRIPTION
			: "An independent catalog for exteraGram plugins and exteraless-compatible extensions.";
	const collectionData = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name:
			locale === "ru"
				? "exteraStore — каталог плагинов для Telegram"
				: "exteraStore — Telegram plugin catalog",
		description,
		url: absoluteUrl("/"),
		isPartOf: { "@id": `${absoluteUrl("/")}#website` },
	};

	return (
		<div className="w-full max-w-full overflow-x-hidden bg-background">
			<StructuredData data={collectionData} />
			<HeroSection />
			<FeaturedPlugins />
			<AiCollections />
			<TrendingPlugins />
			<DeveloperCTA />
		</div>
	);
}
