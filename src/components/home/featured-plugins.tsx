"use client";

import { ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { PluginCard } from "~/components/plugin-card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { plugins as Plugin } from "~/server/db/schema";
import { api } from "~/trpc/react";

export function FeaturedPlugins() {
	const { data: featuredPlugins, isLoading } = api.plugins.getFeatured.useQuery(
		{ limit: 3 },
	);

	if (!isLoading && (!featuredPlugins || featuredPlugins.length === 0)) {
		return null;
	}

	return (
		<section className="py-12 sm:py-16" aria-labelledby="featured-title">
			<div className="container mx-auto px-4">
				<div className="mb-7 flex items-end justify-between gap-4">
					<div>
						<div className="mb-2 flex items-center gap-2 font-medium text-primary text-sm">
							<Star className="size-4 fill-current" />
							Выбор редакции
						</div>
						<h2
							id="featured-title"
							className="text-balance font-bold text-3xl tracking-tight sm:text-4xl"
						>
							Начните с проверенного
						</h2>
						<p className="mt-2 max-w-2xl text-muted-foreground">
							Отобранные плагины с высоким рейтингом и понятной пользой.
						</p>
					</div>
					<Button asChild variant="ghost" className="hidden sm:inline-flex">
						<Link href="/plugins?featured=true">
							Все рекомендации
							<ArrowRight />
						</Link>
					</Button>
				</div>

				{isLoading ? (
					<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-104 rounded-xl" />
						))}
					</div>
				) : (
					<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{featuredPlugins?.map((plugin: typeof Plugin.$inferSelect) => (
							<PluginCard key={plugin.id} plugin={plugin} />
						))}
					</div>
				)}
				<Button asChild variant="outline" className="mt-6 w-full sm:hidden">
					<Link href="/plugins?featured=true">Все рекомендации</Link>
				</Button>
			</div>
		</section>
	);
}
