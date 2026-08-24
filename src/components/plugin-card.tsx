"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Calendar, Download, Heart, Shield, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { SecurityWarning } from "~/components/ui/security-warning";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn, formatDate, formatNumber, safeJsonParse } from "~/lib/utils";
import { api } from "~/trpc/react";

interface Plugin {
	id: number;
	name: string;
	slug: string;
	description: string;
	shortDescription?: string | null;
	version: string;
	author?: string | null;
	authorId?: string | null;
	category: string;
	tags: string | null;
	downloadCount: number;
	rating: number;
	ratingCount: number;
	price: number;
	featured: boolean;
	verified: boolean;
	exteralessCompatible?: boolean | null;
	screenshots: string | null;
	createdAt: Date | number;
	latestSecurityCheck?: {
		status: string;
		classification: string | null;
		shortDescription: string | null;
		details: string | null;
	} | null;
}

interface PluginCardProps {
	plugin: Plugin;
	className?: string;
	showAuthor?: boolean;
	compact?: boolean;
}

interface SecurityIssue {
	type: string;
	severity: "low" | "medium" | "high" | "critical";
	description: string;
	recommendation: string;
}

function CategoryChip({
	category,
	className,
}: {
	category: string;
	className?: string;
}) {
	return (
		<Badge
			variant="secondary"
			className={cn(
				"max-w-full border-0 bg-background/75 text-foreground text-xs backdrop-blur",
				className,
			)}
		>
			{category}
		</Badge>
	);
}

function VerifiedChip({
	label,
	compact,
}: {
	label: string;
	compact?: boolean;
}) {
	if (compact) {
		return (
			<span className="flex size-5 items-center justify-center rounded-full bg-contrast text-contrast-foreground">
				<Shield className="size-3" />
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 rounded-full bg-contrast px-2 py-1 text-contrast-foreground text-xs">
			<Shield className="size-3.5" />
			<span>{label}</span>
		</span>
	);
}

function FavoriteButton({
	isFavorited,
	pending,
	onToggle,
	labels,
	className,
}: {
	isFavorited: boolean;
	pending: boolean;
	onToggle: () => void;
	labels: { add: string; remove: string };
	className?: string;
}) {
	const prefersReducedMotion = useReducedMotion();
	return (
		<Button
			size="icon"
			variant="secondary"
			disabled={pending}
			className={cn(
				"press-scale pointer-events-auto size-11 rounded-full bg-background/90 backdrop-blur hover:bg-background",
				isFavorited && "bg-primary/10 hover:bg-primary/20",
				className,
			)}
			onClick={onToggle}
			aria-label={isFavorited ? labels.remove : labels.add}
			aria-pressed={isFavorited}
		>
			<motion.span
				className="flex"
				animate={
					isFavorited && !prefersReducedMotion
						? { scale: [1, 1.35, 1] }
						: { scale: 1 }
				}
				transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
			>
				<Heart
					className={cn(
						"size-4",
						isFavorited ? "fill-primary text-primary" : "text-foreground",
					)}
				/>
			</motion.span>
		</Button>
	);
}

export function PluginCard({
	plugin,
	className,
	showAuthor = true,
	compact = false,
}: PluginCardProps) {
	const t = useTranslations("PluginCard");
	const locale = useLocale();
	const tags = plugin.tags ? safeJsonParse<unknown>(plugin.tags, []) : [];
	const screenshots = plugin.screenshots
		? safeJsonParse<unknown>(plugin.screenshots, [])
		: [];
	const safeTags = Array.isArray(tags)
		? tags.filter((tag): tag is string => typeof tag === "string")
		: [];
	const safeScreenshots = Array.isArray(screenshots)
		? screenshots.filter(
				(screenshot): screenshot is string => typeof screenshot === "string",
			)
		: [];

	const router = useRouter();
	const { data: session } = useSession();
	const [optimisticFavorite, setOptimisticFavorite] = useState<boolean | null>(
		null,
	);
	const { data: favoriteState, refetch: refetchFavorite } =
		api.favorites.check.useQuery(
			{ pluginId: plugin.id },
			{ enabled: !!session?.user?.id },
		);
	const toggleFavorite = api.favorites.toggle.useMutation({
		onSettled: () => {
			void refetchFavorite().finally(() => setOptimisticFavorite(null));
		},
	});
	const isFavorited = optimisticFavorite ?? favoriteState?.isFavorited ?? false;

	const handleFavorite = () => {
		if (!session?.user?.id) {
			router.push("/auth/signin");
			return;
		}
		setOptimisticFavorite(!isFavorited);
		toggleFavorite.mutate({ pluginId: plugin.id });
	};

	const favoriteLabels = {
		add: t("add_favorite"),
		remove: t("remove_favorite"),
	};
	const authorName = plugin.author || t("unknown_author");
	const coverImage = safeScreenshots[0];
	const securityIssues = plugin.latestSecurityCheck?.details
		? safeJsonParse<{ issues?: SecurityIssue[] }>(
				plugin.latestSecurityCheck.details,
				{},
			).issues || []
		: [];

	const securityBlock = plugin.latestSecurityCheck &&
		plugin.latestSecurityCheck.status !== "passed" &&
		plugin.latestSecurityCheck.details && (
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
					shortDescription: plugin.latestSecurityCheck.shortDescription ?? "",
					issues: securityIssues,
				}}
				variant="compact"
			/>
		);

	if (compact) {
		return (
			<Card
				className={cn(
					"card-lift group relative w-full min-w-0 max-w-full overflow-hidden bg-card focus-within:ring-2 focus-within:ring-ring/40",
					className,
				)}
			>
				<Link
					href={`/plugins/${plugin.slug}`}
					className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none"
					aria-label={`${plugin.name}: ${plugin.shortDescription || plugin.description}`}
				>
					<span className="sr-only">{plugin.name}</span>
				</Link>
				<div className="pointer-events-none relative z-10 flex min-h-11 items-center gap-3 p-3 sm:gap-4 sm:p-4">
					<div className="relative shrink-0">
						<div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 font-bold text-lg text-primary">
							{plugin.name.slice(0, 1).toUpperCase()}
						</div>
						{plugin.verified && (
							<div className="absolute -top-1 -right-1">
								<VerifiedChip label={t("verified")} compact />
								<span className="sr-only">{t("verified")}</span>
							</div>
						)}
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<h3 className="truncate font-semibold transition-colors group-hover:text-primary">
									{plugin.name}
								</h3>
								<p className="line-clamp-1 text-muted-foreground text-sm">
									{plugin.shortDescription || plugin.description}
								</p>
							</div>
							<div className="hidden shrink-0 items-center gap-2 sm:flex">
								<span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5">
									<Star className="size-3.5 fill-warning text-warning" />
									<span className="font-medium text-sm">
										{plugin.rating.toFixed(1)}
									</span>
								</span>
								<CategoryChip category={plugin.category} />
							</div>
						</div>

						<div className="mt-1.5 flex items-center gap-3 text-muted-foreground text-xs sm:gap-4">
							<span className="max-w-32 truncate">{authorName}</span>
							<span className="flex items-center gap-1">
								<Download className="size-3" />
								{formatNumber(plugin.downloadCount)}
							</span>
							<span className="hidden items-center gap-1 sm:flex">
								<Calendar className="size-3" />
								{formatDate(plugin.createdAt, locale)}
							</span>
							{plugin.price > 0 && (
								<span className="rounded-full bg-contrast px-2 py-0.5 font-medium text-contrast-foreground">
									${plugin.price}
								</span>
							)}
							{plugin.exteralessCompatible === true && (
								<span className="rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">
									{t("exteraless")}
								</span>
							)}
						</div>

						{securityBlock && <div className="mt-2">{securityBlock}</div>}
					</div>

					<FavoriteButton
						isFavorited={isFavorited}
						pending={toggleFavorite.isPending}
						onToggle={handleFavorite}
						labels={favoriteLabels}
						className="shrink-0"
					/>
				</div>
			</Card>
		);
	}

	return (
		<Card
			className={cn(
				"card-lift group relative flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden bg-card focus-within:ring-2 focus-within:ring-ring/40",
				plugin.featured && "bg-primary/[0.055]",
				className,
			)}
		>
			<Link
				href={`/plugins/${plugin.slug}`}
				className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none"
				aria-label={`${plugin.name}: ${plugin.shortDescription || plugin.description}`}
			>
				<span className="sr-only">{plugin.name}</span>
			</Link>
			<div className="pointer-events-none relative z-10 flex h-full flex-col">
				<div className="flex h-full min-w-0 flex-col p-3 sm:p-5">
					<div className="relative mb-4 min-w-0 overflow-hidden rounded-xl bg-surface">
						<div className="relative aspect-[16/10] sm:aspect-video">
							{coverImage ? (
								<Image
									src={coverImage}
									alt={plugin.name}
									fill
									sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
									className="object-contain transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.015]"
									priority={false}
								/>
							) : (
								<div className="dot-grid relative flex h-full w-full items-center justify-center bg-linear-to-br from-primary/10 via-primary/5 to-transparent">
									<span className="font-bold text-6xl text-primary/25 tracking-tighter transition-transform duration-300 group-hover:scale-110">
										{plugin.name.slice(0, 1).toUpperCase()}
									</span>
								</div>
							)}
							{plugin.verified && (
								<div className="absolute top-3 left-3">
									<VerifiedChip label={t("verified")} />
								</div>
							)}
							<div className="absolute bottom-3 left-3">
								<CategoryChip category={plugin.category} />
							</div>
							{plugin.price > 0 && (
								<div className="absolute right-3 bottom-3">
									<Badge className="border-transparent bg-contrast text-contrast-foreground">
										${plugin.price}
									</Badge>
								</div>
							)}
							<div className="absolute top-3 right-3">
								<FavoriteButton
									isFavorited={isFavorited}
									pending={toggleFavorite.isPending}
									onToggle={handleFavorite}
									labels={favoriteLabels}
								/>
							</div>
						</div>
					</div>

					<div className="flex min-h-0 min-w-0 flex-1 flex-col">
						<div className="space-y-2">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0 flex-1">
									<h3 className="truncate font-semibold text-lg leading-tight tracking-tight transition-colors group-hover:text-primary">
										{plugin.name}
									</h3>
									<p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
										{plugin.shortDescription || plugin.description}
									</p>
								</div>
							</div>
						</div>

						{showAuthor && (
							<div className="mt-3 flex items-center gap-3">
								<Avatar className="h-8 w-8 rounded-xl">
									<AvatarFallback className="rounded-xl bg-primary/10 font-medium text-primary text-xs">
										{authorName.slice(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-sm">{authorName}</p>
									<p className="text-muted-foreground text-xs">
										{t("developer")}
									</p>
								</div>
							</div>
						)}

						{safeTags.length > 0 && (
							<div className="mt-2 flex min-w-0 flex-wrap gap-1">
								{safeTags.slice(0, 3).map((tag) => (
									<Badge
										key={tag}
										variant="secondary"
										className="px-2 py-0 text-xs"
									>
										{tag}
									</Badge>
								))}
								{safeTags.length > 3 && (
									<Badge variant="secondary" className="px-2 py-0 text-xs">
										+{safeTags.length - 3}
									</Badge>
								)}
							</div>
						)}

						<div className="mt-auto flex min-w-0 items-center justify-between gap-2 pt-3">
							<div className="flex min-w-0 items-center gap-3 text-sm sm:gap-4">
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex cursor-default items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5">
											<Star className="h-4 w-4 fill-warning text-warning" />
											<span className="font-medium">
												{plugin.rating.toFixed(1)}
											</span>
											<span className="text-muted-foreground">
												({plugin.ratingCount})
											</span>
										</div>
									</TooltipTrigger>
									<TooltipContent>{t("rating_tooltip")}</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex cursor-default items-center gap-1 text-muted-foreground">
											<Download className="h-4 w-4" />
											<span>{formatNumber(plugin.downloadCount)}</span>
										</div>
									</TooltipTrigger>
									<TooltipContent>{t("downloads_tooltip")}</TooltipContent>
								</Tooltip>
							</div>

							<div className="flex items-center gap-2 text-xs">
								{plugin.exteralessCompatible === true && (
									<span className="rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">
										{t("exteraless")}
									</span>
								)}
								<span className="hidden items-center gap-2 text-muted-foreground md:flex">
									<Calendar className="h-3.5 w-3.5" />
									<span>{formatDate(plugin.createdAt, locale)}</span>
								</span>
							</div>
						</div>

						{securityBlock && <div className="pt-2">{securityBlock}</div>}
					</div>
				</div>
			</div>
		</Card>
	);
}
