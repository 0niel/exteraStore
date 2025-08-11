"use client";

import { ArrowRight, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { PluginCard } from "../plugin-card";
import { type plugins } from "~/server/db/schema";

type Plugin = typeof plugins.$inferSelect;

export function TrendingPlugins() {
	const t = useTranslations("Home");
	const { data: plugins, isLoading } = api.plugins.getTrending.useQuery({
		limit: 3,
	});

	return (
		<section className="bg-background py-16 sm:py-24">
			<div className="container mx-auto px-4">
				<div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
					<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-medium text-primary text-sm">
						<TrendingUp className="h-4 w-4" />
						{t("trendingPlugins")}
					</div>
					<h2 className="mb-4 font-bold text-4xl tracking-tight sm:text-5xl md:text-6xl">
						Взлетают сейчас
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
						Плагины, которые набирают популярность в этом месяце.
					</p>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-48 w-full" />
						))}
					</div>
				) : plugins && plugins.length > 0 ? (
					<>
						<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{plugins.map((plugin: Plugin) => (
								<PluginCard key={plugin.id} plugin={plugin} />
							))}
						</div>
						<div className="mt-12 text-center">
							<Link href="/plugins?sortBy=downloads">
								<Button size="lg" className="group h-12 px-8 text-base">
									{t("viewAll")}
									<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Button>
							</Link>
						</div>
					</>
				) : null}
			</div>
		</section>
	);
}