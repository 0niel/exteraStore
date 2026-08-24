"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	CheckCircle,
	ChevronLeft,
	Download,
	Edit,
	ExternalLink,
	FileText,
	Globe,
	Heart,
	Loader2,
	MessageSquare,
	Share2,
	Shield,
	Star,
	Tag,
	Trash2,
	TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { AskAi } from "~/components/ai/ask-ai";
import { PluginInsight } from "~/components/ai/plugin-insight";
import { ReviewSummary } from "~/components/ai/review-summary";
import { SmartCaptcha } from "~/components/captcha/smart-captcha";
import { DonationWidget } from "~/components/donations/donation-widget";
import { GitHubIcon } from "~/components/icons/github-icon";
import { ImageGallery } from "~/components/image-gallery";
import { PluginInstallDialog } from "~/components/plugin-install-dialog";
import { PluginPipeline } from "~/components/plugin-pipeline";
import { PluginSubscription } from "~/components/plugin-subscription";
import { PluginVersions } from "~/components/plugin-versions";
import { TelegramBotIntegration } from "~/components/telegram-bot-integration";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { SecurityWarning } from "~/components/ui/security-warning";
import { Textarea } from "~/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn, formatDate, formatNumber, safeJsonParse } from "~/lib/utils";
import { api } from "~/trpc/react";

type TabId = "description" | "versions" | "reviews" | "changelog" | "pipeline";

export default function PluginDetailPage() {
	const params = useParams();
	const router = useRouter();
	const slug = params.slug as string;
	const { data: session } = useSession();
	const t = useTranslations("PluginDetailPage");
	const locale = useLocale();
	const reduceMotion = useReducedMotion();

	const [activeTab, setActiveTab] = useState<TabId>("description");
	const [reviewRating, setReviewRating] = useState(5);
	const [reviewComment, setReviewComment] = useState("");
	const [reviewCaptchaToken, setReviewCaptchaToken] = useState("");
	const [isFavorited, setIsFavorited] = useState(false);
	const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
	const [editingRating, setEditingRating] = useState<number>(5);
	const [editingComment, setEditingComment] = useState("");
	const [downloadPulse, setDownloadPulse] = useState(0);
	const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
	const reviewTextareaRef = useRef<HTMLTextAreaElement | null>(null);

	const {
		data: plugin,
		isLoading,
		isError,
		refetch: refetchPlugin,
	} = api.plugins.getBySlug.useQuery({ slug });
	const { data: reviewsData, refetch: refetchReviews } =
		api.plugins.getReviews.useQuery(
			{ pluginId: plugin?.id ?? 0, page: 1, limit: 10 },
			{ enabled: !!plugin?.id },
		);
	const { data: favoriteData } = api.favorites.check.useQuery(
		{ pluginId: plugin?.id ?? 0 },
		{ enabled: !!plugin?.id && !!session },
	);
	const { data: versions } = api.pluginVersions.getVersions.useQuery(
		{ pluginSlug: slug },
		{ enabled: !!slug },
	);
	const { data: categories } = api.categories.getAll.useQuery();
	const { data: authorData } = api.users.getPublicProfile.useQuery(
		{ id: plugin?.authorId || "" },
		{ enabled: !!plugin?.authorId },
	);

	const downloadMutation = api.plugins.download.useMutation({
		onSuccess: (data) => {
			setDownloadPulse((value) => value + 1);
			if (
				data.securityCheck &&
				data.securityCheck.status !== "passed" &&
				data.securityCheck.details
			) {
				const details = safeJsonParse<Record<string, unknown>>(
					data.securityCheck.details,
					{},
				);
				if (
					details.classification === "critical" ||
					details.classification === "unsafe"
				) {
					toast.error(t("security_failed_title"), {
						description: t("security_failed_description"),
						duration: 6000,
					});
				} else if (details.classification === "potentially_unsafe") {
					toast.warning(t("security_warning_title"), {
						description: t("security_warning_description"),
						duration: 4000,
					});
				}
			}
		},
		onError: (error) => {
			toast.error(t("download_error_title"), {
				description: error.message,
				duration: 4000,
			});
		},
	});

	const addReviewMutation = api.plugins.addReview.useMutation({
		onSuccess: () => {
			toast.success(t("review_added"));
			setReviewComment("");
			setReviewRating(5);
			refetchReviews();
		},
		onError: (error) => {
			toast.error(t("review_add_error", { error: error.message }));
		},
	});

	const updateReviewMutation = api.plugins.updateReview.useMutation({
		onSuccess: () => {
			toast.success(t("review_updated"));
			setEditingReviewId(null);
			refetchReviews();
		},
		onError: (error) => {
			toast.error(t("review_update_error", { error: error.message }));
		},
	});

	const deleteReviewMutation = api.plugins.deleteReview.useMutation({
		onSuccess: () => {
			toast.success(t("review_deleted"));
			refetchReviews();
		},
		onError: (error) => {
			toast.error(t("review_delete_error", { error: error.message }));
		},
	});

	const toggleFavoriteMutation = api.favorites.toggle.useMutation({
		onSuccess: (data) => {
			setIsFavorited(data.isFavorited);
			toast.success(
				data.isFavorited ? t("favorite_added") : t("favorite_removed"),
			);
		},
		onError: (error) => {
			toast.error(t("favorite_error", { error: error.message }));
		},
	});

	const handleDownload = () => {
		if (!plugin) return;

		downloadMutation.mutate({
			pluginId: plugin.id,
			userAgent: navigator.userAgent,
		});
	};

	const handleAddReview = () => {
		if (!plugin) return;

		if (!reviewCaptchaToken) {
			toast.error(t("captcha_required"));
			return;
		}

		addReviewMutation.mutate({
			pluginId: plugin.id,
			rating: reviewRating,
			comment: reviewComment || undefined,
			captchaToken: reviewCaptchaToken,
		});
	};

	const handleToggleFavorite = () => {
		if (!session) {
			toast.error(t("sign_in_to_favorite"));
			return;
		}

		if (!plugin) return;

		toggleFavoriteMutation.mutate({ pluginId: plugin.id });
	};

	React.useEffect(() => {
		if (favoriteData) {
			setIsFavorited(favoriteData.isFavorited);
		}
	}, [favoriteData]);

	const fallbackShare = (url: string) => {
		navigator.clipboard
			.writeText(url)
			.then(() => {
				toast.success(t("link_copied"));
			})
			.catch(() => {
				toast.error(t("copy_error"));
			});
	};

	const handleShare = async () => {
		const url = window.location.href;
		const title = t("share_title", { name: plugin?.name ?? "" });
		const text = t("share_text", {
			description: plugin?.shortDescription || plugin?.description || "",
		});

		if (navigator.share) {
			try {
				await navigator.share({ title, text, url });
				toast.success(t("share_success"));
			} catch (error) {
				if ((error as Error).name !== "AbortError") {
					fallbackShare(url);
				}
			}
		} else {
			fallbackShare(url);
		}
	};

	const handleWriteFirstReview = () => {
		if (!session) {
			toast.error(t("sign_in_to_review"));
			return;
		}
		reviewTextareaRef.current?.scrollIntoView({
			behavior: reduceMotion ? "auto" : "smooth",
			block: "center",
		});
		reviewTextareaRef.current?.focus({ preventScroll: true });
	};

	const sectionMotion = (index: number) =>
		reduceMotion
			? {}
			: {
					initial: { opacity: 0, y: 16 },
					whileInView: { opacity: 1, y: 0 },
					viewport: { once: true, margin: "-40px" },
					transition: {
						duration: 0.5,
						ease: [0.16, 1, 0.3, 1] as const,
						delay: index * 0.06,
					},
				};

	if (isLoading) {
		return (
			<div className="bg-background">
				<div className="container mx-auto max-w-4xl px-4 py-4 lg:py-8">
					<div className="space-y-6">
						<div className="skeleton-shimmer hidden h-9 w-40 rounded-md lg:block" />
						<div className="flex items-start gap-4">
							<div className="skeleton-shimmer h-16 w-16 shrink-0 rounded-2xl" />
							<div className="min-w-0 flex-1 space-y-3">
								<div className="skeleton-shimmer h-7 w-2/3 rounded-md" />
								<div className="skeleton-shimmer h-4 w-1/2 rounded-md" />
								<div className="flex flex-wrap gap-2">
									<div className="skeleton-shimmer h-5 w-24 rounded-full" />
									<div className="skeleton-shimmer h-5 w-16 rounded-full" />
									<div className="skeleton-shimmer h-5 w-14 rounded-full" />
								</div>
							</div>
						</div>
						<div className="grid grid-cols-3 gap-4 rounded-xl bg-muted/50 p-4">
							{[0, 1, 2].map((i) => (
								<div key={i} className="space-y-2">
									<div className="skeleton-shimmer mx-auto h-6 w-12 rounded-md" />
									<div className="skeleton-shimmer mx-auto h-3 w-16 rounded-md" />
								</div>
							))}
						</div>
						<div className="skeleton-shimmer h-40 w-full rounded-xl" />
						<div className="flex gap-2 overflow-hidden">
							{[0, 1, 2, 3, 4].map((i) => (
								<div
									key={i}
									className="skeleton-shimmer h-11 w-28 shrink-0 rounded-full"
								/>
							))}
						</div>
						<div className="space-y-3">
							<div className="skeleton-shimmer h-4 w-full rounded-md" />
							<div className="skeleton-shimmer h-4 w-11/12 rounded-md" />
							<div className="skeleton-shimmer h-4 w-4/5 rounded-md" />
							<div className="skeleton-shimmer h-4 w-2/3 rounded-md" />
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
				onAction={() => void refetchPlugin()}
			/>
		);
	}

	if (!plugin) {
		return (
			<div className="flex min-h-[60dvh] items-center justify-center bg-background py-16">
				<div className="px-4 text-center">
					<div className="mb-4 text-6xl">😕</div>
					<h1 className="mb-2 font-bold text-2xl">{t("not_found_title")}</h1>
					<p className="mb-4 text-muted-foreground">
						{t("not_found_description")}
					</p>
					<Link href="/plugins">
						<Button className="min-h-11">{t("back_to_catalog")}</Button>
					</Link>
				</div>
			</div>
		);
	}

	const screenshots = safeJsonParse<string[]>(plugin.screenshots ?? "[]", []);
	const tags = safeJsonParse<string[]>(plugin.tags ?? "[]", []);

	const latestVersion = versions?.[0];
	const latestChangelog = latestVersion?.changelog || plugin.changelog;
	const categoryName =
		categories?.find((c) => c.slug === plugin.category)?.name ||
		plugin.category;
	const hasLinks = Boolean(plugin.githubUrl || plugin.documentationUrl);

	const tabs: Array<{ id: TabId; label: string }> = [
		{ id: "description", label: t("description") },
		{
			id: "versions",
			label:
				versions && versions.length > 0
					? `${t("versions")} (${versions.length})`
					: t("versions"),
		},
		{ id: "reviews", label: `${t("reviews")} (${plugin.ratingCount})` },
		{ id: "changelog", label: t("changelog_tab") },
		{ id: "pipeline", label: t("pipeline_tab") },
	];
	const checkBadge = {
		critical: {
			label: t("checks_badge_critical"),
			icon: TriangleAlert,
			className: "bg-destructive/15 text-destructive",
			activeClassName: "bg-background text-destructive",
		},
		issues: {
			label: t("checks_badge_issues"),
			icon: TriangleAlert,
			className: "bg-warning/15 text-warning",
			activeClassName: "bg-warning text-black",
		},
		ok: {
			label: t("checks_badge_ok"),
			icon: CheckCircle,
			className: "bg-success/15 text-success",
			activeClassName: "bg-success text-white",
		},
		running: {
			label: t("checks_badge_running"),
			icon: Loader2,
			className: "bg-primary/10 text-primary",
			activeClassName: "bg-background/15 text-primary-foreground",
		},
		unchecked: {
			label: t("checks_badge_unchecked"),
			icon: Shield,
			className: "bg-muted text-muted-foreground",
			activeClassName: "bg-background/15 text-primary-foreground/80",
		},
	}[plugin.checkSummary];

	return (
		<div className="bg-background">
			<div className="glass sticky top-0 z-40 lg:hidden">
				<div className="flex items-center justify-between px-4 py-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.back()}
						className="h-11 w-11"
						aria-label={t("back_to_catalog")}
					>
						<ChevronLeft className="h-5 w-5" />
					</Button>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							onClick={handleToggleFavorite}
							className={cn("h-11 w-11", isFavorited && "text-primary")}
							aria-label={t("favorite_aria")}
						>
							<Heart className={cn("h-5 w-5", isFavorited && "fill-current")} />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleShare}
							className="h-11 w-11"
							aria-label={t("share_aria")}
						>
							<Share2 className="h-5 w-5" />
						</Button>
					</div>
				</div>
			</div>

			<div className="container mx-auto max-w-4xl px-4 py-4 pb-40 md:pb-8 lg:py-8">
				<div className="mb-6 hidden lg:block">
					<Button
						variant="ghost"
						onClick={() => router.back()}
						className="gap-2"
					>
						<ChevronLeft className="h-4 w-4" />
						{t("back_to_catalog")}
					</Button>
				</div>

				<div className="space-y-6">
					<motion.section
						className="relative isolate space-y-4"
						{...sectionMotion(0)}
					>
						<div
							className="pointer-events-none absolute -top-24 -left-16 -z-10 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
							aria-hidden="true"
						/>
						<div
							className="h-1 w-16 rounded-full bg-linear-to-r from-primary to-primary/30"
							aria-hidden="true"
						/>
						<div className="flex items-start gap-4">
							<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-bold text-2xl text-primary">
								{plugin.name.slice(0, 1).toUpperCase()}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-start justify-between gap-4">
									<div className="min-w-0">
										<h1 className="text-balance font-bold text-2xl leading-tight lg:text-3xl">
											{plugin.name}
										</h1>
										<p className="mt-1 text-muted-foreground">
											{plugin.shortDescription || plugin.description}
										</p>
									</div>
									<div className="hidden items-center gap-2 lg:flex">
										<Button
											variant="secondary"
											size="icon"
											onClick={handleToggleFavorite}
											className={cn(
												isFavorited && "bg-primary/10 text-primary",
											)}
											aria-label={t("favorite_aria")}
										>
											<Heart
												className={cn("h-4 w-4", isFavorited && "fill-current")}
											/>
										</Button>
										<Button
											variant="secondary"
											size="icon"
											onClick={handleShare}
											aria-label={t("share_aria")}
										>
											<Share2 className="h-4 w-4" />
										</Button>
									</div>
								</div>

								<div className="mt-3 flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
									<Link
										href={`/developers/${plugin.authorId}`}
										className="group inline-flex min-h-11 items-center gap-1 hover:text-foreground md:min-h-0"
									>
										<Avatar className="h-5 w-5">
											<AvatarImage src={authorData?.image || undefined} />
											<AvatarFallback className="text-xs">
												{plugin.author.slice(0, 1).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<span className="font-medium group-hover:underline">
											{authorData?.name || plugin.author}
										</span>
									</Link>
									<Badge variant="outline" className="text-xs">
										{categoryName}
									</Badge>
									<div className="flex items-center gap-1">
										<Tag className="h-3 w-3" />
										<span>v{plugin.version}</span>
									</div>
									{plugin.minExteraVersion && (
										<Badge variant="outline" className="font-mono text-xs">
											{t("min_extera_chip", {
												version: plugin.minExteraVersion,
											})}
										</Badge>
									)}
									{plugin.exteralessCompatible === true && (
										<Badge
											className={`border-transparent bg-success/10 text-success text-xs ${
												plugin.minExteralessVersion ? "font-mono" : ""
											}`}
										>
											{plugin.minExteralessVersion
												? t("exteraless_min_chip", {
														version: plugin.minExteralessVersion,
													})
												: t("exteraless_compatible")}
										</Badge>
									)}
									{plugin.exteralessCompatible === false && (
										<Badge
											variant="outline"
											className="text-muted-foreground text-xs"
										>
											{t("exteraless_incompatible")}
										</Badge>
									)}
									{plugin.verified && (
										<Badge className="border-transparent bg-contrast text-contrast-foreground text-xs">
											<Shield className="mr-1 h-3 w-3" />
											{t("verified")}
										</Badge>
									)}
								</div>

								{tags.length > 0 && (
									<div className="mt-3 flex flex-wrap gap-1">
										{tags.slice(0, 4).map((tag) => (
											<Badge key={tag} variant="secondary" className="text-xs">
												{tag}
											</Badge>
										))}
										{tags.length > 4 && (
											<Badge variant="secondary" className="text-xs">
												+{tags.length - 4}
											</Badge>
										)}
									</div>
								)}
							</div>
						</div>

						<div className="grid grid-cols-3 gap-2 sm:gap-3">
							<div className="min-w-0 rounded-2xl bg-primary/[0.07] p-3 text-center sm:p-4">
								<div className="flex items-center justify-center gap-1 font-bold font-mono text-xl sm:text-2xl">
									<Star
										className={cn(
											"h-4 w-4 shrink-0",
											plugin.ratingCount > 0 && "fill-warning text-warning",
										)}
									/>
									{plugin.ratingCount > 0
										? plugin.rating.toFixed(1)
										: t("not_rated")}
								</div>
								<div className="mt-1 truncate text-muted-foreground text-xs">
									{plugin.ratingCount > 0
										? `${plugin.ratingCount} · ${t("stats_reviews")}`
										: t("not_rated")}
								</div>
							</div>
							<div className="min-w-0 rounded-2xl bg-primary/[0.07] p-3 text-center sm:p-4">
								<div className="font-bold font-mono text-xl sm:text-2xl">
									{formatNumber(plugin.downloadCount)}
								</div>
								<div className="mt-1 truncate text-muted-foreground text-xs">
									{t("stats_downloads")}
								</div>
							</div>
							<div className="min-w-0 rounded-2xl bg-primary/[0.07] p-3 text-center sm:p-4">
								<div className="font-bold font-mono text-xl sm:text-2xl">
									{versions?.length || 1}
								</div>
								<div className="mt-1 truncate text-muted-foreground text-xs">
									{t("versions_label", { count: versions?.length || 1 })}
								</div>
							</div>
						</div>

						<div className="space-y-3">
							<TelegramBotIntegration
								dependencies={plugin.dependencies}
								onRequestInstall={() => setIsInstallDialogOpen(true)}
								isDownloading={downloadMutation.isPending}
							/>
							{session?.user?.id === plugin.authorId && (
								<Button
									variant="outline"
									asChild
									className="min-h-11 w-full md:min-h-9"
								>
									<Link href={`/my-plugins/${plugin.slug}/manage`}>
										<Edit className="mr-2 h-4 w-4" />
										{t("manage_plugin")}
									</Link>
								</Button>
							)}
						</div>
					</motion.section>

					{plugin.latestSecurityCheck &&
						plugin.latestSecurityCheck.status !== "passed" &&
						plugin.latestSecurityCheck.details && (
							<motion.section {...sectionMotion(1)}>
								<SecurityWarning
									securityResult={{
										status: plugin.latestSecurityCheck.classification as
											| "safe"
											| "warning"
											| "danger",
										classification: plugin.latestSecurityCheck.classification as
											| "safe"
											| "potentially_unsafe"
											| "unsafe"
											| "critical",
										shortDescription:
											plugin.latestSecurityCheck.shortDescription ?? "",
										issues:
											safeJsonParse<{ issues?: [] }>(
												plugin.latestSecurityCheck.details,
												{},
											).issues || [],
									}}
									variant="banner"
									showDetails={true}
								/>
							</motion.section>
						)}

					{screenshots.length > 0 && (
						<motion.section className="space-y-4" {...sectionMotion(1)}>
							<span className="eyebrow">{t("screenshots")}</span>
							<ImageGallery
								images={screenshots}
								alt={t("screenshots_alt", { name: plugin.name })}
								category={plugin.category}
								verified={plugin.verified}
							/>
						</motion.section>
					)}

					<motion.section className="w-full" {...sectionMotion(2)}>
						<div
							role="tablist"
							aria-label={t("description")}
							className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
						>
							{tabs.map((tab) => (
								<button
									key={tab.id}
									type="button"
									role="tab"
									aria-selected={activeTab === tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={cn(
										"press-scale tap-highlight-none min-h-11 shrink-0 snap-start whitespace-nowrap rounded-full px-4 font-medium text-sm transition-all duration-200 ease-[var(--ease-spring)]",
										activeTab === tab.id
											? "bg-primary text-primary-foreground"
											: "bg-surface text-muted-foreground hover:bg-primary/10 hover:text-foreground",
									)}
								>
									<span>{tab.label}</span>
									{tab.id === "pipeline" && (
										<span
											className={cn(
												"ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-[11px] leading-none",
												activeTab === tab.id
													? checkBadge.activeClassName
													: checkBadge.className,
											)}
										>
											<checkBadge.icon
												className={cn(
													"h-3 w-3",
													plugin.checkSummary === "running" && "animate-spin",
												)}
											/>
											{checkBadge.label}
										</span>
									)}
								</button>
							))}
						</div>

						<AnimatePresence mode="wait" initial={false}>
							<motion.div
								key={activeTab}
								initial={reduceMotion ? false : { opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
								transition={{ duration: 0.2, ease: "easeOut" }}
								className="mt-6"
							>
								{activeTab === "description" && (
									<div>
										<div className="mb-5 flex flex-wrap justify-end gap-2">
											<PluginInsight
												pluginId={plugin.id}
												pluginName={plugin.name}
											/>
											<AskAi pluginId={plugin.id} pluginName={plugin.name} />
										</div>
										<div className="prose prose-neutral dark:prose-invert max-w-none">
											<ReactMarkdown>{plugin.description}</ReactMarkdown>
										</div>

										<div
											className={cn(
												"mt-8 grid min-w-0 grid-cols-1 gap-4",
												hasLinks ? "sm:grid-cols-2" : "sm:grid-cols-1",
											)}
										>
											<Card className="transition-colors hover:border-primary/30">
												<CardContent className="p-4">
													<Link
														href={`/developers/${plugin.authorId}`}
														className="group flex items-start gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
													>
														<Avatar className="h-12 w-12 rounded-xl">
															<AvatarImage
																src={authorData?.image || undefined}
															/>
															<AvatarFallback className="rounded-xl bg-primary/10 font-medium text-primary text-sm">
																{(authorData?.name || plugin.author)
																	.slice(0, 2)
																	.toUpperCase()}
															</AvatarFallback>
														</Avatar>
														<div className="min-w-0 flex-1">
															<div className="flex items-center gap-2">
																<p className="truncate font-semibold">
																	{authorData?.name || plugin.author}
																</p>
																{authorData?.isVerified && (
																	<Badge className="border-transparent bg-contrast text-contrast-foreground text-xs">
																		<Shield className="mr-1 h-3 w-3" />
																		{t("verified")}
																	</Badge>
																)}
															</div>
															{authorData?.telegramUsername && (
																<p className="text-primary text-sm">
																	@{authorData.telegramUsername}
																</p>
															)}
															{authorData?.bio && (
																<p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
																	{authorData.bio}
																</p>
															)}
															{authorData?.stats && (
																<div className="mt-3 grid grid-cols-3 gap-2 text-center">
																	<div>
																		<div className="font-semibold text-sm">
																			{authorData.stats.totalPlugins || 0}
																		</div>
																		<div className="text-muted-foreground text-xs">
																			{t("author_plugins")}
																		</div>
																	</div>
																	<div>
																		<div className="font-semibold text-sm">
																			{formatNumber(
																				Number(
																					authorData.stats.totalDownloads,
																				) || 0,
																			)}
																		</div>
																		<div className="text-muted-foreground text-xs">
																			{t("author_downloads")}
																		</div>
																	</div>
																	<div>
																		<div className="flex items-center justify-center gap-1 font-semibold text-sm">
																			<Star className="h-3.5 w-3.5 fill-warning text-warning" />
																			{authorData.stats.ratingCount > 0
																				? Number(
																						authorData.stats.averageRating,
																					).toFixed(1)
																				: t("not_rated")}
																		</div>
																		<div className="text-muted-foreground text-xs">
																			{t("author_rating")}
																		</div>
																	</div>
																</div>
															)}
														</div>
													</Link>
													<div className="mt-3 flex flex-wrap gap-2">
														{authorData?.githubUsername && (
															<Button
																asChild
																variant="outline"
																size="sm"
																className="min-h-11 md:min-h-8"
															>
																<a
																	href={`https://github.com/${authorData.githubUsername}`}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="inline-flex items-center gap-2"
																>
																	<GitHubIcon className="size-4" /> GitHub
																</a>
															</Button>
														)}
														{authorData?.website && (
															<Button
																asChild
																variant="outline"
																size="sm"
																className="min-h-11 md:min-h-8"
															>
																<a
																	href={authorData.website}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="inline-flex items-center gap-2"
																>
																	<Globe className="h-4 w-4" /> {t("website")}
																</a>
															</Button>
														)}
														{authorData?.telegramUsername && (
															<Button
																asChild
																variant="outline"
																size="sm"
																className="min-h-11 md:min-h-8"
															>
																<a
																	href={`https://t.me/${authorData.telegramUsername}`}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="inline-flex items-center gap-2"
																>
																	<MessageSquare className="h-4 w-4" /> Telegram
																</a>
															</Button>
														)}
													</div>
												</CardContent>
											</Card>

											{hasLinks && (
												<Card>
													<CardContent className="p-4">
														<div className="flex flex-wrap gap-2">
															{plugin.githubUrl && (
																<Tooltip>
																	<TooltipTrigger asChild>
																		<Button
																			asChild
																			variant="outline"
																			size="sm"
																			className="min-h-11 md:min-h-8"
																		>
																			<a
																				href={plugin.githubUrl}
																				target="_blank"
																				rel="noopener noreferrer"
																				className="inline-flex items-center gap-2"
																			>
																				<GitHubIcon className="size-4" />{" "}
																				{t("source_code")}{" "}
																				<ExternalLink className="h-3 w-3" />
																			</a>
																		</Button>
																	</TooltipTrigger>
																	<TooltipContent>
																		{t("open_github")}
																	</TooltipContent>
																</Tooltip>
															)}
															{plugin.documentationUrl && (
																<Tooltip>
																	<TooltipTrigger asChild>
																		<Button
																			asChild
																			variant="outline"
																			size="sm"
																			className="min-h-11 md:min-h-8"
																		>
																			<a
																				href={plugin.documentationUrl}
																				target="_blank"
																				rel="noopener noreferrer"
																				className="inline-flex items-center gap-2"
																			>
																				<FileText className="h-4 w-4" />{" "}
																				{t("documentation")}{" "}
																				<ExternalLink className="h-3 w-3" />
																			</a>
																		</Button>
																	</TooltipTrigger>
																	<TooltipContent>
																		{t("open_docs")}
																	</TooltipContent>
																</Tooltip>
															)}
														</div>
													</CardContent>
												</Card>
											)}

											{authorData?.donationRequisites && (
												<DonationWidget
													methods={safeJsonParse(
														authorData.donationRequisites || "null",
														null,
													)}
												/>
											)}
										</div>
									</div>
								)}

								{activeTab === "versions" && (
									<PluginVersions pluginSlug={plugin.slug} />
								)}

								{activeTab === "reviews" && (
									<div className="space-y-6">
										<ReviewSummary pluginId={plugin.id} />
										{session && (
											<Card className="border-primary/20 bg-linear-to-br from-primary/5 to-transparent">
												<CardContent className="p-4">
													<div className="space-y-4">
														<div className="flex items-center gap-3">
															<Avatar className="h-8 w-8 rounded-xl">
																<AvatarImage
																	src={session.user?.image || undefined}
																/>
																<AvatarFallback className="rounded-xl bg-primary/10 font-medium text-primary">
																	{session.user?.name
																		?.slice(0, 2)
																		.toUpperCase() || "??"}
																</AvatarFallback>
															</Avatar>
															<div className="flex-1">
																<p className="font-medium text-sm">
																	{session.user?.name}
																</p>
																<div className="mt-1 flex gap-1">
																	{[1, 2, 3, 4, 5].map((star) => (
																		<button
																			key={star}
																			type="button"
																			onClick={() => setReviewRating(star)}
																			className="tap-highlight-none flex h-11 w-8 items-center justify-center transition-colors md:h-6 md:w-6"
																			aria-label={t("rate_star_aria", {
																				star,
																			})}
																		>
																			<Star
																				className={cn(
																					"h-4 w-4",
																					star <= reviewRating
																						? "fill-warning text-warning"
																						: "text-muted-foreground",
																				)}
																			/>
																		</button>
																	))}
																</div>
															</div>
														</div>
														<Textarea
															ref={reviewTextareaRef}
															value={reviewComment}
															onChange={(e) => setReviewComment(e.target.value)}
															placeholder={t("review_placeholder")}
															rows={3}
															className="resize-none"
														/>
														<SmartCaptcha
															onSuccess={setReviewCaptchaToken}
															onError={() => setReviewCaptchaToken("")}
														/>
														<div className="flex justify-end">
															<Button
																onClick={handleAddReview}
																disabled={
																	addReviewMutation.isPending ||
																	!reviewComment.trim() ||
																	!reviewCaptchaToken
																}
																size="sm"
																className="min-h-11 md:min-h-8"
															>
																{addReviewMutation.isPending
																	? t("sending")
																	: t("submit_review")}
															</Button>
														</div>
													</div>
												</CardContent>
											</Card>
										)}

										{reviewsData && reviewsData.reviews.length === 0 ? (
											<div className="rounded-2xl border border-dashed bg-primary/5 p-8 text-center">
												<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
													<MessageSquare className="h-7 w-7" />
												</div>
												<h4 className="mb-2 font-medium">
													{t("no_reviews_title")}
												</h4>
												<p className="mx-auto mb-4 max-w-sm text-muted-foreground text-sm">
													{t("no_reviews_description")}
												</p>
												<Button
													onClick={handleWriteFirstReview}
													className="min-h-11"
												>
													<Star className="mr-2 h-4 w-4" />
													{t("write_first_review")}
												</Button>
											</div>
										) : (
											<div className="space-y-4">
												{reviewsData?.reviews.map((review) => (
													<Card key={review.id} className="w-full">
														<CardContent className="p-4">
															<div className="flex items-start gap-3">
																<Avatar className="h-8 w-8 rounded-xl">
																	<AvatarImage
																		src={review.user?.image || undefined}
																	/>
																	<AvatarFallback className="rounded-xl bg-primary/10 font-medium text-primary">
																		{review.user?.name
																			?.slice(0, 2)
																			.toUpperCase() || "??"}
																	</AvatarFallback>
																</Avatar>
																<div className="min-w-0 flex-1 space-y-2">
																	<div className="flex flex-wrap items-center justify-between gap-2">
																		<div className="flex flex-wrap items-center gap-2">
																			<span className="font-medium text-sm">
																				{review.user?.name}
																			</span>
																			<div className="flex">
																				{[1, 2, 3, 4, 5].map((star) => (
																					<Star
																						key={star}
																						className={cn(
																							"h-3 w-3",
																							star <= review.rating
																								? "fill-warning text-warning"
																								: "text-muted-foreground",
																						)}
																					/>
																				))}
																			</div>
																			<span className="text-muted-foreground text-xs">
																				{formatDate(review.createdAt, locale)}
																			</span>
																		</div>
																		{(session?.user?.id === review.userId ||
																			session?.user?.role === "admin") && (
																			<div className="flex items-center gap-2">
																				<Button
																					variant="outline"
																					size="sm"
																					className="min-h-11 md:min-h-8"
																					onClick={() => {
																						setEditingReviewId(review.id);
																						setEditingRating(review.rating);
																						setEditingComment(
																							review.comment ?? "",
																						);
																					}}
																				>
																					<Edit className="mr-2 h-3.5 w-3.5" />{" "}
																					{t("edit")}
																				</Button>
																				<Button
																					variant="outline"
																					size="sm"
																					className="min-h-11 md:min-h-8"
																					onClick={() => {
																						if (
																							confirm(
																								t("confirm_delete_review"),
																							)
																						) {
																							deleteReviewMutation.mutate({
																								reviewId: review.id,
																							});
																						}
																					}}
																				>
																					<Trash2 className="mr-2 h-3.5 w-3.5" />{" "}
																					{t("delete")}
																				</Button>
																			</div>
																		)}
																	</div>
																	{editingReviewId === review.id ? (
																		<div className="space-y-2">
																			<div className="flex gap-1">
																				{[1, 2, 3, 4, 5].map((star) => (
																					<button
																						key={star}
																						type="button"
																						onClick={() =>
																							setEditingRating(star)
																						}
																						className="tap-highlight-none flex h-11 w-8 items-center justify-center md:h-6 md:w-6"
																						aria-label={t("edit_rating_aria", {
																							star,
																						})}
																					>
																						<Star
																							className={cn(
																								"h-4 w-4",
																								star <= editingRating
																									? "fill-warning text-warning"
																									: "text-muted-foreground",
																							)}
																						/>
																					</button>
																				))}
																			</div>
																			<Textarea
																				value={editingComment}
																				onChange={(e) =>
																					setEditingComment(e.target.value)
																				}
																				rows={3}
																				className="resize-none"
																			/>
																			<div className="flex gap-2">
																				<Button
																					size="sm"
																					className="min-h-11 md:min-h-8"
																					onClick={() => {
																						updateReviewMutation.mutate({
																							reviewId: review.id,
																							rating: editingRating,
																							comment: editingComment,
																						});
																					}}
																					disabled={
																						updateReviewMutation.isPending
																					}
																				>
																					{t("save")}
																				</Button>
																				<Button
																					variant="outline"
																					size="sm"
																					className="min-h-11 md:min-h-8"
																					onClick={() =>
																						setEditingReviewId(null)
																					}
																				>
																					{t("cancel")}
																				</Button>
																			</div>
																		</div>
																	) : (
																		review.comment && (
																			<p className="text-muted-foreground text-sm">
																				{review.comment}
																			</p>
																		)
																	)}
																</div>
															</div>
														</CardContent>
													</Card>
												))}
											</div>
										)}
									</div>
								)}

								{activeTab === "changelog" && (
									<div className="space-y-6">
										{latestChangelog ? (
											<div className="prose prose-neutral dark:prose-invert max-w-none">
												<ReactMarkdown>{latestChangelog}</ReactMarkdown>
											</div>
										) : (
											<div className="rounded-2xl border border-dashed bg-primary/5 p-8 text-center">
												<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
													<FileText className="h-7 w-7" />
												</div>
												<h4 className="mb-2 font-medium">
													{t("no_changelog_title")}
												</h4>
												<p className="text-muted-foreground text-sm">
													{t("no_changelog_description")}
												</p>
											</div>
										)}
									</div>
								)}

								{activeTab === "pipeline" && (
									<PluginPipeline
										pluginId={plugin.id}
										canRunChecks={
											session?.user?.id === plugin.authorId ||
											session?.user?.role === "admin"
										}
									/>
								)}
							</motion.div>
						</AnimatePresence>
					</motion.section>

					{session && (
						<motion.section {...sectionMotion(3)}>
							<PluginSubscription
								pluginId={plugin.id}
								pluginName={plugin.name}
							/>
						</motion.section>
					)}
				</div>
			</div>

			<div className="glass fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-3 py-2 md:hidden">
				<div className="mx-auto max-w-4xl">
					<motion.div
						key={downloadPulse}
						className="min-w-0"
						animate={
							reduceMotion || downloadPulse === 0
								? undefined
								: { scale: [1, 1.05, 1] }
						}
						transition={{ duration: 0.45, ease: "easeOut" }}
					>
						<Button
							className="press-scale min-h-11 w-full"
							onClick={() => setIsInstallDialogOpen(true)}
							disabled={downloadMutation.isPending}
						>
							<Download className="mr-2 h-4 w-4" />
							{t("download")}
						</Button>
					</motion.div>
				</div>
			</div>

			<PluginInstallDialog
				open={isInstallDialogOpen}
				onOpenChange={setIsInstallDialogOpen}
				pluginId={plugin.id}
				pluginName={plugin.name}
				pluginSlug={plugin.slug}
				telegramBotDeeplink={plugin.telegramBotDeeplink}
				onDownload={handleDownload}
			/>
		</div>
	);
}
