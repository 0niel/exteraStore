"use client";

import { ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { plugins } from "~/server/db/schema";
import { api } from "~/trpc/react";
import { PluginCard } from "../plugin-card";

type Plugin = typeof plugins.$inferSelect;

export function TrendingPlugins() {
	const { data: plugins, isLoading } = api.plugins.getTrending.useQuery({
		limit: 4,
	});

	return (
		<section
			className="border-y bg-muted/25 py-12 sm:py-16"
			aria-labelledby="trending-title"
		>
			<div className="container mx-auto px-4">
				<div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
					<div>
						<div className="mb-2 inline-flex items-center gap-2 font-medium text-primary text-sm">
							<TrendingUp className="h-4 w-4" />
							Актуально сейчас
						</div>
						<h2
							id="trending-title"
							className="font-bold text-3xl tracking-tight sm:text-4xl"
						>
							Набирают популярность
						</h2>
						<p className="mt-2 max-w-2xl text-muted-foreground">
							Рейтинг формируется по реальным загрузкам за последние недели.
						</p>
					</div>
					<Button asChild variant="outline">
						<Link href="/plugins?sort=popular">
							Весь рейтинг
							<ArrowRight />
						</Link>
					</Button>
				</div>

				{isLoading ? (
					<div className="grid gap-3 md:grid-cols-2">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-28 w-full rounded-xl" />
						))}
					</div>
				) : plugins && plugins.length > 0 ? (
					<div className="grid gap-3 md:grid-cols-2">
						{plugins.map((plugin: Plugin) => (
							<PluginCard key={plugin.id} plugin={plugin} compact />
						))}
					</div>
				) : null}
			</div>
		</section>
	);
}
