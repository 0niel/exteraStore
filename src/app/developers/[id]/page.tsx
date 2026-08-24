"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	ArrowLeft,
	Award,
	Check,
	Copy,
	Crown,
	Download,
	ExternalLink,
	Globe,
	Mail,
	Package,
	Share2,
	Sparkles,
	Star,
	Target,
	TrendingUp,
	Trophy,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import type { DonationMethod } from "~/components/donations/donation-widget";
import { DonationWidget } from "~/components/donations/donation-widget";
import { GitHubIcon } from "~/components/icons/github-icon";
import { PluginCard } from "~/components/plugin-card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { formatNumber, safeJsonParse } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type DeveloperPlugin =
	RouterOutputs["developers"]["getDeveloper"]["plugins"][number];

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

function getNextTierProgress(
	downloads: number,
	rating: number,
	plugins: number,
) {
	const score = getScore(downloads, rating, plugins);
	let currentIndex = 0;
	for (const [i, tier] of tiers.entries()) {
		if (score >= tier.min) currentIndex = i;
	}

	const currentTier = tiers[currentIndex] ?? tiers[0];
	const nextTier = tiers[currentIndex + 1];
	if (!nextTier) {
		return {
			progress: 100,
			currentTier,
			nextTier: null,
			currentScore: score,
			scoreNeeded: 0,
		};
	}

	const progress = Math.min(
		((score - currentTier.min) / (nextTier.min - currentTier.min)) * 100,
		100,
	);

	return {
		progress,
		currentTier,
		nextTier,
		currentScore: score,
		scoreNeeded: nextTier.min - score,
	};
}

export default function DeveloperProfilePage() {
	const params = useParams();
	const router = useRouter();
	const id = params?.id as string;
	const t = useTranslations("DeveloperProfile");
	const reduceMotion = useReducedMotion();
	const [copied, setCopied] = useState(false);

	const {
		data: developerData,
		isLoading,
		isError,
		refetch,
	} = api.developers.getDeveloper.useQuery({
		id: id,
	});

	const handleCopyLink = async () => {
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(window.location.href);
				setCopied(true);
				toast.success(t("link_copied"));
				setTimeout(() => setCopied(false), 2000);
			} else {
				toast.error(t("copy_not_supported"));
			}
		} catch (_error) {
			toast.error(t("copy_failed"));
		}
	};

	const handleShare = async () => {
		const url = window.location.href;
		const title = t("share_title", {
			name: developerData?.developer.name || t("anonymous"),
		});

		if (typeof navigator !== "undefined" && navigator.share) {
			try {
				await navigator.share({ title, url });
				toast.success(t("share_success"));
			} catch (error) {
				if ((error as Error).name !== "AbortError") {
					handleCopyLink();
				}
			}
		} else {
			handleCopyLink();
		}
	};

	if (isLoading) {
		return (
			<div className="bg-background">
				<div className="container mx-auto max-w-6xl px-4 py-8">
					<div className="space-y-8">
						<Skeleton className="skeleton-shimmer h-72 w-full rounded-3xl" />
						<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
							<div className="space-y-6 lg:col-span-2">
								<Skeleton className="skeleton-shimmer h-10 w-48 rounded-lg" />
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
									{Array.from({ length: 4 }).map((_, i) => (
										<Skeleton
											key={i}
											className="skeleton-shimmer h-56 w-full rounded-2xl"
										/>
									))}
								</div>
							</div>
							<div className="space-y-6">
								<Skeleton className="skeleton-shimmer h-48 w-full rounded-2xl" />
								<Skeleton className="skeleton-shimmer h-56 w-full rounded-2xl" />
							</div>
						</div>
					</div>
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

	if (!developerData) {
		return (
			<div className="flex min-h-[60dvh] items-center justify-center bg-background">
				<Card className="w-full max-w-md animate-fade-up text-center">
					<CardContent className="p-8">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 font-bold text-2xl text-primary">
							?
						</div>
						<CardTitle className="mb-2 text-2xl">{t("not_found")}</CardTitle>
						<CardDescription className="mb-6">
							{t("not_found_description")}
						</CardDescription>
						<Button
							onClick={() => router.push("/developers")}
							className="min-h-11 w-full"
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							{t("back_to_developers")}
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const { developer, plugins, stats } = developerData;
	const tier = getDeveloperTier(
		stats?.totalDownloads || 0,
		stats?.averageRating || 0,
		stats?.totalPlugins || 0,
	);
	const tierProgress = getNextTierProgress(
		stats?.totalDownloads || 0,
		stats?.averageRating || 0,
		stats?.totalPlugins || 0,
	);
	const TierIcon = tier.icon;
	const tierName = t(`tier_${tier.key}`);
	const donationMethods = safeJsonParse<DonationMethod[]>(
		developer.donationRequisites ?? "",
		[],
	);

	return (
		<div className="bg-background">
			<div className="container mx-auto max-w-6xl px-4 py-8">
				<div className="space-y-8">
					<div className="relative isolate animate-fade-up overflow-hidden rounded-3xl bg-card">
						<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/10" />
						<div
							aria-hidden="true"
							className="pointer-events-none absolute -top-24 -right-24 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
						/>
						<div className="dot-grid absolute inset-x-0 top-0 -z-10 h-48" />
						<div className="relative p-6 md:p-12">
							<div className="mb-6 flex flex-wrap items-center justify-between gap-2">
								<Button
									variant="ghost"
									onClick={() => router.back()}
									className="min-h-11 gap-2"
								>
									<ArrowLeft className="h-4 w-4" />
									{t("back")}
								</Button>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={handleShare}
										className="min-h-11 gap-2"
									>
										<Share2 className="h-4 w-4" />
										{t("share")}
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={handleCopyLink}
										className="min-h-11 gap-2"
									>
										{copied ? (
											<Check className="h-4 w-4" />
										) : (
											<Copy className="h-4 w-4" />
										)}
										{copied ? t("copied") : t("link")}
									</Button>
								</div>
							</div>

							<div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
								<div className="relative">
									<Avatar className="h-32 w-32 ring-4 ring-primary/10 md:h-40 md:w-40">
										<AvatarImage
											src={developer.image || undefined}
											alt={developer.name || ""}
											className="object-cover"
										/>
										<AvatarFallback className="bg-primary/10 font-bold text-4xl text-primary">
											{(developer.name || "??").slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="absolute -right-2 -bottom-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card">
										<TierIcon className="h-7 w-7" />
									</div>
								</div>

								<div className="flex-1 text-center md:text-left">
									<div className="mb-4">
										<div className="mb-3 flex justify-center md:justify-start">
											<span className="eyebrow">{t("eyebrow_profile")}</span>
										</div>
										<h1 className="mb-2 font-bold text-4xl tracking-tight md:text-5xl">
											{developer.name || t("anonymous")}
										</h1>
										{developer.telegramUsername && (
											<p className="font-medium text-lg text-primary">
												@{developer.telegramUsername}
											</p>
										)}
									</div>

									<div className="mb-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
										<Badge className="border-0 bg-primary/10 px-4 py-2 text-primary text-sm">
											<TierIcon className="mr-2 h-4 w-4" />
											{t("tier_developer", { tier: tierName })}
										</Badge>
									</div>

									{developer.bio && (
										<p className="mb-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
											{developer.bio}
										</p>
									)}

									<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
										<div className="rounded-xl bg-primary/5 p-3 text-center">
											<div className="mb-1 font-bold font-mono text-3xl text-primary tabular-nums">
												{stats?.totalPlugins || 0}
											</div>
											<div className="text-muted-foreground text-sm">
												{t("plugins_label")}
											</div>
										</div>
										<div className="rounded-xl bg-primary/5 p-3 text-center">
											<div className="mb-1 font-bold font-mono text-3xl text-primary tabular-nums">
												{formatNumber(stats?.totalDownloads || 0)}
											</div>
											<div className="text-muted-foreground text-sm">
												{t("downloads_label")}
											</div>
										</div>
										<div className="rounded-xl bg-primary/5 p-3 text-center">
											<div className="mb-1 flex items-center justify-center gap-1 font-bold font-mono text-3xl text-primary tabular-nums">
												<Star className="h-6 w-6 fill-warning text-warning" />
												{stats?.averageRating?.toFixed(1) || "0.0"}
											</div>
											<div className="text-muted-foreground text-sm">
												{t("rating_label")}
											</div>
										</div>
										<div className="rounded-xl bg-primary/5 p-3 text-center">
											<div className="mb-1 font-bold font-mono text-3xl text-primary tabular-nums">
												{Math.round(tierProgress.progress)}%
											</div>
											<div className="text-muted-foreground text-sm">
												{tier.key === "legend"
													? t("max_rank")
													: t("next_rank_label")}
											</div>
										</div>
									</div>

									{tierProgress.progress < 100 && tier.key !== "legend" && (
										<div className="mt-6">
											<div className="mb-2 flex items-center justify-between text-sm">
												<span className="text-muted-foreground">
													{tierProgress.nextTier
														? t("progress_to", {
																tier: t(`tier_${tierProgress.nextTier.key}`),
															})
														: t("progress")}
												</span>
												<span className="font-medium font-mono text-primary tabular-nums">
													{Math.round(tierProgress.progress)}%
												</span>
											</div>
											<div
												role="progressbar"
												aria-valuenow={Math.round(tierProgress.progress)}
												aria-valuemin={0}
												aria-valuemax={100}
												className="h-3 w-full overflow-hidden rounded-full bg-primary/10"
											>
												<div
													className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
													style={{ width: `${tierProgress.progress}%` }}
												/>
											</div>
											{tierProgress.nextTier && (
												<div className="mt-2 text-center">
													<div className="text-muted-foreground text-xs">
														{t.rich("points_needed", {
															points: Math.ceil(tierProgress.scoreNeeded),
															tier: t(`tier_${tierProgress.nextTier.key}`),
															accent: (chunks) => (
																<span className="font-medium text-primary">
																	{chunks}
																</span>
															),
														})}
													</div>
													<div className="mt-1 text-muted-foreground text-xs">
														{t("current_score", {
															score: Math.floor(tierProgress.currentScore),
														})}
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
						<div className="lg:col-span-2">
							<div className="space-y-8">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<span className="eyebrow mb-2">
											{t("plugins_count", { count: plugins.length })}
										</span>
										<h2 className="font-bold text-3xl">{t("portfolio")}</h2>
									</div>
									{stats?.totalDownloads && stats.totalDownloads > 0 && (
										<div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
											<TrendingUp className="h-4 w-4" />
											<span className="font-medium font-mono text-sm tabular-nums">
												{t("downloads_badge", {
													count: formatNumber(stats.totalDownloads),
												})}
											</span>
										</div>
									)}
								</div>

								{plugins.length === 0 ? (
									<Card className="bg-card">
										<CardContent>
											<EmptyState
												icon="+"
												title={t("no_plugins")}
												description={t("no_plugins_description")}
											/>
										</CardContent>
									</Card>
								) : (
									<div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
										{plugins.map((plugin: DeveloperPlugin, index: number) => (
											<motion.div
												key={plugin.id}
												initial={reduceMotion ? false : { opacity: 0, y: 24 }}
												whileInView={
													reduceMotion ? undefined : { opacity: 1, y: 0 }
												}
												viewport={{ once: true, margin: "-80px" }}
												transition={{
													duration: 0.5,
													delay: (index % 2) * 0.06,
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
						</div>

						<div className="space-y-6">
							{donationMethods.length > 0 && (
								<DonationWidget methods={donationMethods} />
							)}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2.5">
										<span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
											<ExternalLink className="h-4 w-4" />
										</span>
										{t("quick_actions")}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{developer.githubUsername && (
										<Button
											asChild
											variant="outline"
											className="min-h-11 w-full justify-start"
										>
											<a
												href={`https://github.com/${developer.githubUsername}`}
												target="_blank"
												rel="noopener noreferrer"
											>
												<GitHubIcon className="mr-2 size-4" />
												{t("github_profile")}
											</a>
										</Button>
									)}
									{developer.website && (
										<Button
											asChild
											variant="outline"
											className="min-h-11 w-full justify-start"
										>
											<a
												href={developer.website}
												target="_blank"
												rel="noopener noreferrer"
											>
												<Globe className="mr-2 h-4 w-4" />
												{t("website")}
											</a>
										</Button>
									)}
									{developer.telegramUsername && (
										<Button
											asChild
											variant="outline"
											className="min-h-11 w-full justify-start"
										>
											<a
												href={`https://t.me/${developer.telegramUsername}`}
												target="_blank"
												rel="noopener noreferrer"
											>
												<Mail className="mr-2 h-4 w-4" />
												{t("telegram")}
											</a>
										</Button>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2.5">
										<span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
											<TrendingUp className="h-4 w-4" />
										</span>
										{t("stats")}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Package className="h-4 w-4 text-muted-foreground" />
												<span className="text-sm">{t("total_plugins")}</span>
											</div>
											<span className="font-bold font-mono tabular-nums">
												{stats?.totalPlugins || 0}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Download className="h-4 w-4 text-muted-foreground" />
												<span className="text-sm">{t("total_downloads")}</span>
											</div>
											<span className="font-bold font-mono tabular-nums">
												{formatNumber(stats?.totalDownloads || 0)}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Star className="h-4 w-4 text-muted-foreground" />
												<span className="text-sm">{t("average_rating")}</span>
											</div>
											<span className="font-bold font-mono tabular-nums">
												{stats?.averageRating?.toFixed(1) || "0.0"}
											</span>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
