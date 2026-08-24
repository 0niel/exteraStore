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
		<Card className="overflow-hidden bg-card">
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
		<Card className="group card-lift h-full overflow-hidden bg-card">
			<div className="relative">
				<div className="relative h-24 overflow-hidden bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 p-4 dark:from-primary/30 dark:via-primary/12 dark:to-transparent">
					<div
						aria-hidden="true"
						className="dot-grid absolute inset-0 opacity-70"
					/>
					<div className="relative flex items-start justify-between">
						<span className="font-bold font-mono text-muted-foreground text-sm tabular-nums">
							{String(index + 1).padStart(2, "0")}
						</span>
						<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary text-xs">
							<Sparkles className="h-3 w-3" />
							{t("ai_curated")}
						</span>
					</div>
					<div
						aria-hidden="true"
						className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent"
					/>
				</div>
				<span
					aria-hidden="true"
					className="absolute -bottom-6 left-4 flex size-12 select-none items-center justify-center rounded-2xl bg-primary font-black text-2xl text-primary-foreground transition-transform duration-300 group-hover:scale-105"
				>
					{initial}
				</span>
			</div>

			<CardContent className="p-4 pt-9">
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
									<span>
										{plugin.ratingCount > 0 ? plugin.rating.toFixed(1) : "—"}
									</span>
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
	const [visibleCount, setVisibleCount] = useState(6);

	const {
		data: collections,
		isLoading,
		isError,
		refetch,
	} = api.aiCollections.getAICollections.useQuery({ limit: 20 });

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
	const visibleCollections = filteredCollections.slice(0, visibleCount);

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

				<div className="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
					{stats.map((stat) => (
						<Card key={stat.label} className="bg-card">
							<CardContent className="flex h-full flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
								<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-11">
									<stat.icon className="h-5 w-5" />
								</div>
								<div className="min-w-0">
									<p
										className={cn(
											"truncate font-bold text-base leading-tight sm:text-2xl",
											stat.mono && "font-mono tabular-nums",
										)}
									>
										{stat.value}
									</p>
									<p className="line-clamp-2 text-[11px] text-muted-foreground leading-tight sm:text-sm">
										{stat.label}
									</p>
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
							onClick={() => {
								setActiveTab(item.value);
								setVisibleCount(6);
							}}
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
				) : isError ? (
					<EmptyState
						icon="↻"
						title={t("load_error_title")}
						description={t("load_error_description")}
						actionLabel={t("retry")}
						onAction={() => void refetch()}
					/>
				) : filteredCollections.length === 0 ? (
					<EmptyState
						icon={emptyByTab[activeTab].icon}
						title={emptyByTab[activeTab].title}
						description={emptyByTab[activeTab].description}
					/>
				) : (
					<div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{visibleCollections.map((collection, index) => (
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
								className="h-full min-w-0 max-w-full"
							>
								<CollectionCard collection={collection} index={index} />
							</motion.div>
						))}
					</div>
				)}

				{visibleCount < filteredCollections.length && (
					<div className="mt-6 flex justify-center">
						<Button
							variant="secondary"
							className="w-full sm:w-auto"
							onClick={() => setVisibleCount((count) => count + 6)}
						>
							{t("show_more", {
								count: filteredCollections.length - visibleCount,
							})}
						</Button>
					</div>
				)}

				<Card className="relative mt-12 overflow-hidden bg-surface">
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
