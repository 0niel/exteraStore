"use client";

import { DeveloperCTA } from "~/components/home/developer-cta";
import { FeaturedPlugins } from "~/components/home/featured-plugins";
import { HeroSection } from "~/components/home/hero-section";
import { PopularPlugins } from "~/components/home/popular-plugins";

export default function Home() {
	return (
		<main className="w-full max-w-full overflow-x-hidden bg-background">
			<HeroSection />
			<FeaturedPlugins />
			<PopularPlugins />
			<DeveloperCTA />
		</main>
	);
}
