"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	Award,
	Crown,
	Download,
	ExternalLink,
	Github,
	Globe,
	Package,
	Search,
	Sparkles,
	Star,
	Target,
	Trophy,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PageHeader } from "~/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { cn, formatNumber } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Developer =
	RouterOutputs["developers"]["getDevelopers"]["developers"][number];

const tiers = [
	{ key: "rising", min: 0, icon: Sparkles },
	{ key: "pro", min: 500, icon: Target },
	{ key: "expert", min: 2000, icon: Award },
	{ key: "master", min: 5000, icon: Trophy },
	{ key: "legend", min: 10000, icon: Crown },
] as const;

function getScore(downloads: number, rating: number, plugins: number) {
	return downloads * 0.6 + rating * plugins * 20;
}

function getDeveloperTier(downloads: number, rating: number, plugins: number) {
	const score = getScore(downloads, rating, plugins);
	let current: (typeof tiers)[number] = tiers[0];
	for (const tier of tiers) {
		if (score >= tier.min) current = tier;
	}
	return current;
}

function getTierProgress(downloads: number, rating: number, plugins: number) {
	const score = getScore(downloads, rating, plugins);
	let currentIndex = 0;
	for (const [i, tier] of tiers.entries()) {
		if (score >= tier.min) currentIndex = i;
	}

	const currentTier = tiers[currentIndex] ?? tiers[0];
	const nextTier = tiers[currentIndex + 1];
	if (!nextTier) {
		return { progress: 100, nextTier: null };
	}

	const progress = Math.min(
		((score - currentTier.min) / (nextTier.min - currentTier.min)) * 100,
		100,
	);

	return { progress, nextTier };
}

export default function DevelopersPage() {
	const t = useTranslations("Developers");
	const router = useRouter();
	const reduceMotion = useReducedMotion();
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);

	const { data: developersData, isLoading } =
		api.developers.getDevelopers.useQuery({
			page,
			limit: 12,
			search: searchQuery,
		});

	const filteredDevelopers = developersData?.developers || [];
	const showMedals = page === 1 && searchQuery.trim() === "";

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
					icon={Users}
				>
					<div className="relative w-full max-w-md">
						<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder={t("search_placeholder")}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="min-h-11 pl-10"
						/>
					</div>
				</PageHeader>

				<div className="mb-5 flex min-h-6 items-center justify-between gap-3">
					<span className="eyebrow">{t("section_leaderboard")}</span>
					{!isLoading && (
						<span className="font-mono text-muted-foreground text-xs tabular-nums">
							{String(filteredDevelopers.length).padStart(2, "0")}
						</span>
					)}
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<Card key={i} className="overflow-hidden">
								<CardContent className="p-6">
									<div className="flex items-start gap-4">
										<Skeleton className="skeleton-shimmer h-12 w-12 rounded-full" />
										<div className="flex-1 space-y-2">
											<Skeleton className="skeleton-shimmer h-5 w-24" />
											<Skeleton className="skeleton-shimmer h-4 w-16" />
										</div>
									</div>
									<div className="mt-4 space-y-2">
										<Skeleton className="skeleton-shimmer h-4 w-full" />
										<Skeleton className="skeleton-shimmer h-4 w-3/4" />
									</div>
									<div className="mt-4 grid grid-cols-3 gap-2">
										<Skeleton className="skeleton-shimmer h-8 w-full" />
										<Skeleton className="skeleton-shimmer h-8 w-full" />
										<Skeleton className="skeleton-shimmer h-8 w-full" />
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				) : filteredDevelopers.length === 0 ? (
					<div>
						<EmptyState
							icon="@"
							title={searchQuery ? t("no_results") : t("no_developers")}
							description={
								searchQuery
									? t("try_different_search")
									: t("no_developers_description")
							}
							actionLabel={searchQuery ? t("clear_search") : undefined}
							onAction={searchQuery ? () => setSearchQuery("") : undefined}
						/>
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{filteredDevelopers.map((developer: Developer, index: number) => {
								const tier = getDeveloperTier(
									developer.totalDownloads || 0,
									developer.averageRating || 0,
									developer.pluginCount || 0,
								);
								const progress = getTierProgress(
									developer.totalDownloads || 0,
									developer.averageRating || 0,
									developer.pluginCount || 0,
								);
								const TierIcon = tier.icon;
								const rank = index + 1;
								const hasMedal = showMedals && rank <= 3;

								return (
									<motion.div
										key={developer.id}
										initial={reduceMotion ? false : { opacity: 0, y: 24 }}
										whileInView={
											reduceMotion ? undefined : { opacity: 1, y: 0 }
										}
										viewport={{ once: true, margin: "-80px" }}
										transition={{
											duration: 0.5,
											delay: (index % 4) * 0.06,
											ease: [0.16, 1, 0.3, 1],
										}}
										className="h-full"
									>
										<Card
											className="group card-lift relative h-full cursor-pointer overflow-hidden bg-card"
											onClick={() => router.push(`/developers/${developer.id}`)}
										>
											<div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

											{hasMedal && (
												<div
													className={cn(
														"absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl font-bold font-mono text-sm tabular-nums",
														rank === 1
															? "bg-primary text-primary-foreground"
															: "bg-primary/10 text-primary",
													)}
												>
													<span className="sr-only">{t("rank", { rank })}</span>
													<span aria-hidden="true">{rank}</span>
												</div>
											)}
											{showMedals && !hasMedal && (
												<span
													aria-hidden="true"
													className="absolute top-3 right-4 z-10 font-bold font-mono text-muted-foreground/30 text-sm tabular-nums"
												>
													{String(rank).padStart(2, "0")}
												</span>
											)}

											<CardContent className="relative flex h-full flex-col p-6">
												<div className="mb-4 flex items-start gap-4">
													<div className="relative">
														<Avatar className="h-14 w-14 border-2 border-border transition-colors duration-300 group-hover:border-primary/50">
															<AvatarImage
																src={developer.image || undefined}
																alt={developer.name || ""}
																className="object-cover"
															/>
															<AvatarFallback className="bg-primary/10 font-medium text-primary text-sm">
																{(developer.name || "??")
																	.slice(0, 2)
																	.toUpperCase()}
															</AvatarFallback>
														</Avatar>
														<div className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md">
															<TierIcon className="h-3.5 w-3.5" />
														</div>
													</div>

													<div className="min-w-0 flex-1">
														<h3 className="truncate font-bold text-lg transition-colors group-hover:text-primary">
															{developer.name || t("anonymous")}
														</h3>
														<div className="mt-2">
															<Badge className="border border-primary/20 bg-primary/10 px-3 py-1 text-primary text-xs">
																<TierIcon className="mr-1.5 h-3 w-3" />
																{t("tier_developer", {
																	tier: t(`tier_${tier.key}`),
																})}
															</Badge>
														</div>
													</div>
												</div>

												{developer.bio && (
													<p className="mb-4 line-clamp-2 text-muted-foreground text-sm">
														{developer.bio}
													</p>
												)}

												{progress.nextTier && progress.progress < 100 && (
													<div className="mb-4">
														<div className="mb-2 flex items-center justify-between text-xs">
															<span className="text-muted-foreground">
																{t("progress_to", {
																	tier: t(`tier_${progress.nextTier.key}`),
																})}
															</span>
															<span className="font-medium font-mono text-primary tabular-nums">
																{Math.round(progress.progress)}%
															</span>
														</div>
														<div
															role="progressbar"
															aria-valuenow={Math.round(progress.progress)}
															aria-valuemin={0}
															aria-valuemax={100}
															className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10"
														>
															<div
																className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
																style={{ width: `${progress.progress}%` }}
															/>
														</div>
													</div>
												)}

												<div className="mb-4 grid grid-cols-3 gap-2 text-center">
													<div className="rounded-xl bg-primary/5 p-2">
														<div className="flex items-center justify-center gap-1">
															<Package className="h-3 w-3 text-primary" />
															<span className="font-bold font-mono text-sm tabular-nums">
																{developer.pluginCount || 0}
															</span>
														</div>
														<div className="text-muted-foreground text-xs">
															{t("stats_plugins")}
														</div>
													</div>

													<div className="rounded-xl bg-primary/5 p-2">
														<div className="flex items-center justify-center gap-1">
															<Download className="h-3 w-3 text-primary" />
															<span className="font-bold font-mono text-sm tabular-nums">
																{formatNumber(developer.totalDownloads || 0)}
															</span>
														</div>
														<div className="text-muted-foreground text-xs">
															{t("stats_downloads")}
														</div>
													</div>

													<div className="rounded-xl bg-primary/5 p-2">
														<div className="flex items-center justify-center gap-1">
															<Star className="h-3 w-3 text-primary" />
															<span className="font-bold font-mono text-sm tabular-nums">
																{developer.averageRating?.toFixed(1) || "0.0"}
															</span>
														</div>
														<div className="text-muted-foreground text-xs">
															{t("stats_rating")}
														</div>
													</div>
												</div>

												<div className="mt-auto flex items-center justify-between">
													<div className="flex items-center gap-1">
														{developer.githubUsername && (
															<Button
																variant="ghost"
																size="sm"
																className="h-11 w-11 p-0 transition-colors hover:bg-primary/10 hover:text-primary"
																aria-label="GitHub"
																onClick={(e) => {
																	e.stopPropagation();
																	window.open(
																		`https://github.com/${developer.githubUsername}`,
																		"_blank",
																	);
																}}
															>
																<Github className="h-4 w-4" />
															</Button>
														)}
														{developer.website && (
															<Button
																variant="ghost"
																size="sm"
																className="h-11 w-11 p-0 transition-colors hover:bg-primary/10 hover:text-primary"
																aria-label={t("website")}
																onClick={(e) => {
																	e.stopPropagation();
																	window.open(
																		developer.website ?? undefined,
																		"_blank",
																	);
																}}
															>
																<Globe className="h-4 w-4" />
															</Button>
														)}
													</div>

													<Button
														size="sm"
														variant="ghost"
														aria-label={t("view_profile")}
														className="h-11 w-11 p-0 opacity-60 transition-colors hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
													>
														<ExternalLink className="h-4 w-4" />
													</Button>
												</div>
											</CardContent>
										</Card>
									</motion.div>
								);
							})}
						</div>

						{developersData && developersData.pagination.totalPages > 1 && (
							<div className="mt-8 flex justify-center gap-2">
								<Button
									variant="outline"
									className="min-h-11"
									onClick={() => setPage(page - 1)}
									disabled={page === 1}
								>
									{t("previous")}
								</Button>
								<span className="flex items-center px-4 text-muted-foreground text-sm tabular-nums">
									{t("page")} {page} {t("of")}{" "}
									{developersData.pagination.totalPages}
								</span>
								<Button
									variant="outline"
									className="min-h-11"
									onClick={() => setPage(page + 1)}
									disabled={page === developersData.pagination.totalPages}
								>
									{t("next")}
								</Button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
