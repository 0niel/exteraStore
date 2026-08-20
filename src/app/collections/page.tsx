"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Calendar, Sparkles, Star, Zap } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { PageHeader } from "~/components/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { cn, createValidDate } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type AICollection = RouterOutputs["aiCollections"]["getAICollections"][number];
type CollectionPlugin = AICollection["plugins"][number];
type CollectionTab = "all" | "recent" | "popular";

function CollectionSkeleton() {
	return (
		<Card className="overflow-hidden border bg-card">
			<Skeleton className="skeleton-shimmer h-28 w-full rounded-none" />
			<CardContent className="p-4">
				<Skeleton className="skeleton-shimmer mb-2 h-6 w-3/4" />
				<Skeleton className="skeleton-shimmer mb-3 h-4 w-full" />
				<div className="mb-3 flex items-center justify-between">
					<Skeleton className="skeleton-shimmer h-4 w-24" />
					<Skeleton className="skeleton-shimmer h-4 w-16" />
				</div>
				<div className="space-y-2">
					<Skeleton className="skeleton-shimmer h-16 w-full rounded-xl" />
					<Skeleton className="skeleton-shimmer h-16 w-full rounded-xl" />
				</div>
			</CardContent>
		</Card>
	);
}

function CollectionCard({
	collection,
	index,
}: {
	collection: AICollection;
	index: number;
}) {
	const t = useTranslations("CollectionsPage");
	const format = useFormatter();
	const initial = (collection.name || "?").trim().charAt(0).toUpperCase();
	const pluginData = collection.plugins || [];

	return (
		<Card className="group card-lift h-full overflow-hidden border bg-card">
			<div className="relative h-28 overflow-hidden border-b bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4">
				<div aria-hidden="true" className="dot-grid absolute inset-0" />
				<span
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 -right-2 -translate-y-1/2 select-none font-black font-mono text-[5.5rem] text-primary leading-none opacity-10 transition-opacity duration-300 group-hover:opacity-15"
				>
					{initial}
				</span>
				<div className="relative flex items-start justify-between">
					<span className="font-bold font-mono text-muted-foreground text-sm tabular-nums">
						{String(index + 1).padStart(2, "0")}
					</span>
					<span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 font-medium text-primary text-xs">
						<Sparkles className="h-3 w-3" />
						{t("ai_curated")}
					</span>
				</div>
			</div>

			<CardContent className="p-4">
				<h3 className="mb-1.5 line-clamp-1 font-bold text-lg leading-tight transition-colors group-hover:text-primary">
					{collection.name}
				</h3>
				<p className="mb-3 line-clamp-2 text-muted-foreground text-sm">
					{collection.description}
				</p>
				<div className="mb-3 flex items-center justify-between text-muted-foreground text-sm">
					<div className="flex items-center gap-1.5">
						<Calendar className="h-3 w-3 text-primary" />
						<span>
							{format.dateTime(createValidDate(collection.createdAt), {
								day: "numeric",
								month: "long",
								year: "numeric",
							})}
						</span>
					</div>
					<span className="font-mono text-xs uppercase tracking-wider">
						{t("plugin_count", { count: pluginData.length })}
					</span>
				</div>

				<div className="space-y-2">
					{pluginData.slice(0, 2).map((plugin: CollectionPlugin) => (
						<Link
							key={plugin.id}
							href={`/plugins/${plugin.slug}`}
							className="block min-h-11 rounded-xl border border-transparent bg-primary/5 p-3 transition-colors hover:border-primary/30 hover:bg-primary/10"
						>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<Zap className="h-4 w-4" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-sm">{plugin.name}</p>
									<p className="line-clamp-1 text-muted-foreground text-xs">
										{plugin.shortDescription || plugin.description}
									</p>
								</div>
								<div className="flex items-center gap-1 font-mono text-muted-foreground text-xs tabular-nums">
									<Star className="h-3 w-3 fill-warning text-warning" />
									<span>{plugin.rating.toFixed(1)}</span>
								</div>
							</div>
						</Link>
					))}
				</div>

				{pluginData.length > 2 && (
					<div className="mt-3 text-center">
						<Button
							variant="ghost"
							size="sm"
							className="min-h-11 w-full hover:bg-primary/10 hover:text-primary"
							asChild
						>
							<Link href={`/collections/${collection.id}`}>
								<span>
									{t("more_plugins", { count: pluginData.length - 2 })}
								</span>
								<ArrowRight className="ml-1 h-3 w-3" />
							</Link>
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default function CollectionsPage() {
	const t = useTranslations("CollectionsPage");
	const reduceMotion = useReducedMotion();
	const [activeTab, setActiveTab] = useState<CollectionTab>("all");

	const { data: collections, isLoading } =
		api.aiCollections.getAICollections.useQuery({ limit: 20 });

	const filteredCollections =
		collections?.filter((collection) => {
			if (activeTab === "all") return true;
			if (activeTab === "recent") {
				const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
				return new Date(collection.createdAt).getTime() > weekAgo;
			}
			if (activeTab === "popular") {
				return collection.plugins && collection.plugins.length >= 5;
			}
			return true;
		}) || [];

	const tabItems: Array<{ value: CollectionTab; label: string }> = [
		{ value: "all", label: t("tab_all") },
		{ value: "recent", label: t("tab_recent") },
		{ value: "popular", label: t("tab_popular") },
	];

	const emptyByTab: Record<
		CollectionTab,
		{ icon: string; title: string; description: string }
	> = {
		all: {
			icon: "AI",
			title: t("empty_all_title"),
			description: t("empty_all_description"),
		},
		recent: {
			icon: "7d",
			title: t("empty_recent_title"),
			description: t("empty_recent_description"),
		},
		popular: {
			icon: "5+",
			title: t("empty_popular_title"),
			description: t("empty_popular_description"),
		},
	};

	const stats = [
		{
			icon: Sparkles,
			value: String(collections?.length || 0),
			label: t("stats_active"),
			mono: true,
		},
		{
			icon: Zap,
			value: String(
				collections?.reduce((acc, c) => acc + (c.plugins?.length || 0), 0) || 0,
			),
			label: t("stats_plugins"),
			mono: true,
		},
		{
			icon: Calendar,
			value: t("stats_weekly"),
			label: t("stats_weekly_label"),
			mono: false,
		},
	];

	return (
		<div className="bg-background">
			<div className="container relative isolate mx-auto px-4 py-8">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
				/>
				<PageHeader
					badge={t("badge")}
					title={t("title")}
					description={t("description")}
					icon={Sparkles}
				/>

				<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
					{stats.map((stat) => (
						<Card key={stat.label} className="border bg-card">
							<CardContent className="flex items-center gap-3 p-4">
								<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<stat.icon className="h-5 w-5" />
								</div>
								<div>
									<p
										className={cn(
											"font-bold text-2xl leading-tight",
											stat.mono && "font-mono tabular-nums",
										)}
									>
										{stat.value}
									</p>
									<p className="text-muted-foreground text-sm">{stat.label}</p>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="mb-4 flex min-h-6 items-center justify-between gap-3">
					<span className="eyebrow">{t("section_collections")}</span>
					{!isLoading && filteredCollections.length > 0 && (
						<span className="font-mono text-muted-foreground text-xs tabular-nums">
							{String(filteredCollections.length).padStart(2, "0")}
						</span>
					)}
				</div>

				<div className="scrollbar-hide -mx-4 mb-6 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
					{tabItems.map((item) => (
						<button
							key={item.value}
							type="button"
							onClick={() => setActiveTab(item.value)}
							aria-pressed={activeTab === item.value}
							className={cn(
								"press-scale min-h-11 shrink-0 snap-start rounded-full border px-4 font-medium text-sm transition-colors",
								activeTab === item.value
									? "border-primary bg-primary text-primary-foreground"
									: "bg-background/70 backdrop-blur hover:border-primary/40 hover:text-primary",
							)}
						>
							{item.label}
						</button>
					))}
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<CollectionSkeleton key={i} />
						))}
					</div>
				) : filteredCollections.length === 0 ? (
					<EmptyState
						icon={emptyByTab[activeTab].icon}
						title={emptyByTab[activeTab].title}
						description={emptyByTab[activeTab].description}
					/>
				) : (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{filteredCollections.map((collection, index) => (
							<motion.div
								key={collection.id}
								initial={reduceMotion ? false : { opacity: 0, y: 24 }}
								whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
								viewport={{ once: true, margin: "-80px" }}
								transition={{
									duration: 0.5,
									delay: (index % 3) * 0.06,
									ease: [0.16, 1, 0.3, 1],
								}}
								className="h-full"
							>
								<CollectionCard collection={collection} index={index} />
							</motion.div>
						))}
					</div>
				)}

				<Card className="relative mt-12 overflow-hidden border">
					<div
						aria-hidden="true"
						className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
					/>
					<CardContent className="p-6">
						<div className="flex flex-col items-start gap-4 sm:flex-row">
							<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<Sparkles className="h-6 w-6" />
							</div>
							<div>
								<span className="eyebrow mb-2">{t("ai_curated")}</span>
								<h3 className="mb-2 font-bold text-lg">{t("how_title")}</h3>
								<p className="mb-4 text-muted-foreground">
									{t("how_description")}
								</p>
								<div className="flex flex-wrap gap-2">
									<Badge variant="secondary">{t("how_badge_ratings")}</Badge>
									<Badge variant="secondary">{t("how_badge_reviews")}</Badge>
									<Badge variant="secondary">{t("how_badge_trends")}</Badge>
									<Badge variant="secondary">{t("how_badge_weekly")}</Badge>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
