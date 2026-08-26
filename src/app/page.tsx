import type { Metadata } from "next";
import { AiCollections } from "~/components/home/ai-collections";
import { DeveloperCTA } from "~/components/home/developer-cta";
import { FeaturedPlugins } from "~/components/home/featured-plugins";
import { HeroSection } from "~/components/home/hero-section";
import { TrendingPlugins } from "~/components/home/trending-plugins";
import { StructuredData } from "~/components/structured-data";
import { absoluteUrl, OPEN_GRAPH_IMAGE, SITE_DESCRIPTION } from "~/lib/site";

export const metadata: Metadata = {
	title: "exteraStore — плагины для Telegram",
	description: SITE_DESCRIPTION,
	alternates: { canonical: "/" },
	openGraph: {
		url: absoluteUrl("/"),
		title: "exteraStore — плагины для Telegram",
		description: SITE_DESCRIPTION,
		images: [OPEN_GRAPH_IMAGE],
	},
};

export default function Home() {
	const collectionData = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: "exteraStore — каталог плагинов для Telegram",
		description: SITE_DESCRIPTION,
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
