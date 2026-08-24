"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Calendar, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";

import { PluginCard } from "~/components/plugin-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { createValidDate } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type AICollection = RouterOutputs["aiCollections"]["getAICollections"][number];
type CollectionPlugin = AICollection["plugins"][number];

function CollectionSkeleton() {
	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<Skeleton className="skeleton-shimmer h-8 w-32" />
				<Skeleton className="skeleton-shimmer h-48 w-full rounded-2xl" />
				<Skeleton className="skeleton-shimmer h-20 w-full rounded-xl" />
			</div>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="space-y-4 rounded-lg bg-surface p-4">
						<Skeleton className="skeleton-shimmer h-32 w-full" />
						<div className="space-y-2">
							<Skeleton className="skeleton-shimmer h-5 w-3/4" />
							<Skeleton className="skeleton-shimmer h-4 w-full" />
							<Skeleton className="skeleton-shimmer h-4 w-2/3" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default function CollectionDetailPage() {
	const t = useTranslations("CollectionsPage");
	const format = useFormatter();
	const reduceMotion = useReducedMotion();
	const params = useParams();
	const router = useRouter();
	const collectionId = Number.parseInt(params.id as string, 10);

	const {
		data: collections,
		isLoading,
		isError,
		refetch,
	} = api.aiCollections.getAICollections.useQuery({ limit: 20 });

	const collection = collections?.find((c) => c.id === collectionId);
	const plugins = collection?.plugins || [];
	const reviewCount = plugins.reduce(
		(total: number, plugin: CollectionPlugin) => total + plugin.ratingCount,
		0,
	);
	const averageRating =
		reviewCount > 0
			? plugins.reduce(
					(total: number, plugin: CollectionPlugin) =>
						total + plugin.rating * plugin.ratingCount,
					0,
				) / reviewCount
			: null;

	const initial = (collection?.name || "?").trim().charAt(0).toUpperCase();

	if (isLoading) {
		return (
			<div className="bg-background">
				<div className="container mx-auto px-4 py-8">
					<CollectionSkeleton />
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<EmptyState
				icon="↻"
				title={t("load_error_title")}
				description={t("load_error_description")}
				actionLabel={t("retry")}
				onAction={() => void refetch()}
			/>
		);
	}

	if (!collection) {
		return (
			<div className="flex min-h-[60dvh] items-center justify-center bg-background">
				<div className="animate-fade-up px-4 text-center">
					<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<Sparkles className="h-10 w-10" />
					</div>
					<h1 className="mb-2 font-bold text-2xl">{t("not_found_title")}</h1>
					<p className="mb-6 text-muted-foreground">
						{t("not_found_description")}
					</p>
					<Link href="/collections">
						<Button className="min-h-11">{t("back_to_collections")}</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-background">
			<div className="glass sticky top-0 z-40 lg:hidden">
				<div className="flex items-center justify-between px-4 py-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.back()}
						className="h-11 w-11"
						aria-label={t("back")}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<span className="truncate px-2 font-medium text-sm">
						{collection.name}
					</span>
					<div className="w-11" />
				</div>
			</div>

			<div className="container mx-auto px-4 py-4 lg:py-8">
				<div className="mb-6 hidden lg:block">
					<Button
						variant="ghost"
						onClick={() => router.back()}
						className="min-h-11 gap-2"
					>
						<ArrowLeft className="h-4 w-4" />
						{t("back_to_collections")}
					</Button>
				</div>

				<div className="mb-8 space-y-6">
					<div className="relative animate-fade-up overflow-hidden rounded-2xl bg-card p-6 lg:p-8">
						<div
							aria-hidden="true"
							className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent"
						/>
						<div aria-hidden="true" className="dot-grid absolute inset-0" />
						<div
							aria-hidden="true"
							className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
						/>
						<span
							aria-hidden="true"
							className="pointer-events-none absolute top-1/2 -right-4 hidden -translate-y-1/2 select-none font-black font-mono text-[11rem] text-primary leading-none opacity-10 sm:block"
						>
							{initial}
						</span>
						<div className="relative flex min-h-40 flex-col justify-between gap-6">
							<span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 font-medium text-primary text-xs">
								<Sparkles className="h-3.5 w-3.5" />
								{t("ai_curated")}
							</span>
							<div>
								<h1 className="mb-2 font-bold text-3xl leading-tight tracking-tight lg:text-4xl">
									{collection.name}
								</h1>
								<p className="max-w-2xl text-lg text-muted-foreground lg:text-xl">
									{collection.description}
								</p>
							</div>
						</div>
					</div>

					<div className="grid animate-fade-up grid-cols-3 gap-3">
						<div className="rounded-2xl bg-card p-4 text-center">
							<div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<Sparkles className="h-4 w-4" />
							</div>
							<div className="font-bold font-mono text-xl tabular-nums">
								{plugins.length}
							</div>
							<div className="text-muted-foreground text-xs">
								{t("stat_plugins")}
							</div>
						</div>
						<div className="rounded-2xl bg-card p-4 text-center">
							<div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<Star className="h-4 w-4" />
							</div>
							<div className="font-bold font-mono text-xl tabular-nums">
								{averageRating === null ? "—" : averageRating.toFixed(1)}
							</div>
							<div className="text-muted-foreground text-xs">
								{t("avg_rating")}
							</div>
						</div>
						<div className="rounded-2xl bg-card p-4 text-center">
							<div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<Calendar className="h-4 w-4" />
							</div>
							<div className="font-bold font-mono text-xl tabular-nums">
								{format.dateTime(createValidDate(collection.generatedAt), {
									day: "numeric",
									month: "short",
								})}
							</div>
							<div className="text-muted-foreground text-xs">
								{t("created")}
							</div>
						</div>
					</div>
				</div>

				<div className="space-y-6">
					<div className="flex items-end justify-between gap-3">
						<div>
							<span className="eyebrow">
								{t("plugin_count", { count: plugins.length })}
							</span>
							<h2 className="mt-2 font-bold text-2xl">
								{t("plugins_in_collection")}
							</h2>
						</div>
						<span className="font-mono text-muted-foreground text-sm tabular-nums">
							{String(plugins.length).padStart(2, "0")}
						</span>
					</div>

					{plugins.length === 0 ? (
						<EmptyState
							icon="0"
							title={t("empty_plugins_title")}
							description={t("empty_plugins_description")}
						/>
					) : (
						<div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{plugins.map((plugin: CollectionPlugin, index: number) => (
								<motion.div
									key={plugin.id}
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
									<PluginCard plugin={plugin} className="h-full" />
								</motion.div>
							))}
						</div>
					)}
				</div>

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
								<h3 className="mb-2 font-bold text-lg">
									{t("ai_generated_title")}
								</h3>
								<p className="mb-4 text-muted-foreground">
									{t("ai_generated_description")}
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
