"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { type plugins } from "~/server/db/schema";
import { api } from "~/trpc/react";
import { PluginCard } from "../plugin-card";

type Plugin = typeof plugins.$inferSelect;

export function PopularPlugins() {
	const t = useTranslations("Home");
	const { data: plugins, isLoading } = api.plugins.getPopular.useQuery({
		limit: 6,
	});

	return (
		<section className="container mx-auto px-4 py-12 md:px-6 lg:py-16">
			<div className="mb-8 flex items-center justify-between">
				<h2 className="text-2xl font-bold tracking-tight md:text-3xl">
					{t("popularPlugins")}
				</h2>
				<Link href="/plugins?sortBy=downloads">
					<Button variant="outline">{t("viewAll")}</Button>
				</Link>
			</div>
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{isLoading
					? Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={i} className="h-48 w-full" />
						))
					: plugins?.map((plugin: Plugin) => (
							<PluginCard key={plugin.id} plugin={plugin} />
						))}
			</div>
		</section>
	);
}