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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn, createValidDate } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type AICollection = RouterOutputs["aiCollections"]["getAICollections"][number];
type CollectionPlugin = AICollection["plugins"][number];

const coverTreatments = [
	{
		cover: "bg-contrast text-contrast-foreground",
		chip: "bg-primary text-primary-foreground",
	},
	{
		cover: "bg-primary text-primary-foreground",
		chip: "bg-contrast text-contrast-foreground",
	},
	{
		cover: "border-b-2 border-primary bg-primary/10 text-foreground",
		chip: "bg-primary text-primary-foreground",
	},
] as const;

function getTreatment(id: number) {
	return (
		coverTreatments[Math.abs(id) % coverTreatments.length] ?? coverTreatments[0]
	);
}

function CollectionSkeleton() {
	return (
		<Card className="overflow-hidden border bg-card">
			<Skeleton className="skeleton-shimmer h-32 w-full rounded-none" />
			<CardContent className="p-4">
				<div className="mb-3 flex items-center justify-between">
					<Skeleton className="skeleton-shimmer h-5 w-20" />
					<Skeleton className="skeleton-shimmer h-4 w-16" />
				</div>
				<div className="space-y-2">
					<Skeleton className="skeleton-shimmer h-16 w-full" />
					<Skeleton className="skeleton-shimmer h-16 w-full" />
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
	const treatment = getTreatment(collection.id ?? index);
	const initial = (collection.name || "?").trim().charAt(0).toUpperCase();
	const pluginData = collection.plugins || [];

	return (
		<Card className="group card-lift h-full overflow-hidden border bg-card">
			<div className={cn("relative h-36 overflow-hidden p-4", treatment.cover)}>
				<span
					aria-hidden="true"
					className="pointer-events-none absolute -right-3 -bottom-10 select-none font-bold text-[8rem] leading-none opacity-15"
				>
					{initial}
				</span>
				<div className="flex items-start justify-between">
					<span className="font-bold text-2xl tabular-nums opacity-60">
						{String(index + 1).padStart(2, "0")}
					</span>
					<span
						className={cn(
							"inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium text-xs",
							treatment.chip,
						)}
					>
						<Sparkles className="h-3 w-3" />
						{t("ai_curated")}
					</span>
				</div>
				<h3 className="absolute right-4 bottom-4 left-4 font-bold text-lg leading-tight">
					{collection.name}
				</h3>
			</div>

			<CardContent className="p-4">
				<p className="mb-3 line-clamp-2 text-muted-foreground text-sm">
					{collection.description}
				</p>
				<div className="mb-3 flex items-center justify-between text-muted-foreground text-sm">
					<div className="flex items-center gap-1">
						<Calendar className="h-3 w-3" />
						<span>
							{format.dateTime(createValidDate(collection.createdAt), {
								day: "numeric",
								month: "long",
								year: "numeric",
							})}
						</span>
					</div>
					<span>{t("plugin_count", { count: pluginData.length })}</span>
				</div>

				<div className="space-y-2">
					{pluginData.slice(0, 2).map((plugin: CollectionPlugin) => (
						<Link
							key={plugin.id}
							href={`/plugins/${plugin.slug}`}
							className="block min-h-11 rounded-lg border bg-muted/30 p-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
						>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-sm">{plugin.name}</p>
									<p className="line-clamp-1 text-muted-foreground text-xs">
										{plugin.shortDescription || plugin.description}
									</p>
								</div>
								<div className="flex items-center gap-1 text-muted-foreground text-xs">
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
							className="min-h-11 w-full"
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
	const [activeTab, setActiveTab] = useState("all");

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

	const renderGrid = (
		skeletonCount: number,
		emptyIcon: string,
		emptyTitle: string,
		emptyDescription: string,
	) => {
		if (isLoading) {
			return (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: skeletonCount }).map((_, i) => (
						<CollectionSkeleton key={i} />
					))}
				</div>
			);
		}
		if (filteredCollections.length === 0) {
			return (
				<EmptyState
					icon={emptyIcon}
					title={emptyTitle}
					description={emptyDescription}
				/>
			);
		}
		return (
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
		);
	};

	return (
		<div className="bg-background">
			<div className="container mx-auto px-4 py-8">
				<PageHeader
					badge={t("badge")}
					title={t("title")}
					description={t("description")}
					icon={Sparkles}
				/>

				<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
					<Card className="border bg-card">
						<CardContent className="flex items-center gap-3 p-4">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
								<Sparkles className="h-5 w-5 text-primary" />
							</div>
							<div>
								<p className="font-bold text-lg tabular-nums">
									{collections?.length || 0}
								</p>
								<p className="text-muted-foreground text-sm">
									{t("stats_active")}
								</p>
							</div>
						</CardContent>
					</Card>

					<Card className="border bg-card">
						<CardContent className="flex items-center gap-3 p-4">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-contrast text-contrast-foreground">
								<Zap className="h-5 w-5" />
							</div>
							<div>
								<p className="font-bold text-lg tabular-nums">
									{collections?.reduce(
										(acc, c) => acc + (c.plugins?.length || 0),
										0,
									) || 0}
								</p>
								<p className="text-muted-foreground text-sm">
									{t("stats_plugins")}
								</p>
							</div>
						</CardContent>
					</Card>

					<Card className="border bg-card">
						<CardContent className="flex items-center gap-3 p-4">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
								<Calendar className="h-5 w-5 text-primary" />
							</div>
							<div>
								<p className="font-bold text-lg">{t("stats_weekly")}</p>
								<p className="text-muted-foreground text-sm">
									{t("stats_weekly_label")}
								</p>
							</div>
						</CardContent>
					</Card>
				</div>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
					<div className="rounded-lg border bg-card p-2 sm:p-4">
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="all" className="min-h-9">
								{t("tab_all")}
							</TabsTrigger>
							<TabsTrigger value="recent" className="min-h-9">
								{t("tab_recent")}
							</TabsTrigger>
							<TabsTrigger value="popular" className="min-h-9">
								{t("tab_popular")}
							</TabsTrigger>
						</TabsList>
					</div>

					<TabsContent value="all" className="mt-6">
						{renderGrid(
							6,
							"AI",
							t("empty_all_title"),
							t("empty_all_description"),
						)}
					</TabsContent>

					<TabsContent value="recent" className="mt-6">
						{renderGrid(
							3,
							"7d",
							t("empty_recent_title"),
							t("empty_recent_description"),
						)}
					</TabsContent>

					<TabsContent value="popular" className="mt-6">
						{renderGrid(
							3,
							"5+",
							t("empty_popular_title"),
							t("empty_popular_description"),
						)}
					</TabsContent>
				</Tabs>

				<Card className="mt-12 overflow-hidden border">
					<CardContent className="p-6">
						<div className="flex flex-col items-start gap-4 sm:flex-row">
							<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-contrast text-contrast-foreground">
								<Sparkles className="h-6 w-6" />
							</div>
							<div>
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
