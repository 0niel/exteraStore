"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	Activity,
	ArrowRight,
	MessageSquare,
	Package,
	ShieldCheck,
	Star,
	Tag,
	TrendingUp,
	Upload,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { cn, formatNumber, safeJsonParse } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type PulseItem = RouterOutputs["pulse"]["get"]["items"][number];

type PulseTab = "all" | "plugin.created" | "version.released" | "review.added";

const nodeStyles: Record<string, { icon: typeof Package; className: string }> =
	{
		"plugin.created": {
			icon: Package,
			className: "bg-primary text-primary-foreground",
		},
		"version.released": {
			icon: Tag,
			className: "bg-success text-primary-foreground",
		},
		"review.added": {
			icon: Star,
			className: "bg-warning text-primary-foreground",
		},
		"review.updated": {
			icon: Star,
			className: "bg-warning text-primary-foreground",
		},
		"plugin.approved": {
			icon: ShieldCheck,
			className: "bg-contrast text-contrast-foreground",
		},
	};

function EcgLine() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 600 48"
			preserveAspectRatio="none"
			className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full opacity-60 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
		>
			<path
				d="M0 24 H120 L138 24 L146 8 L154 40 L162 24 H300 L318 24 L326 12 L334 36 L342 24 H480 L498 24 L506 6 L514 42 L522 24 H600"
				fill="none"
				stroke="var(--primary)"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				pathLength="1"
				className="[stroke-dasharray:0.18_0.82] motion-safe:animate-[ecg-run_3.2s_linear_infinite]"
			/>
			<style>
				{
					"@keyframes ecg-run{from{stroke-dashoffset:1}to{stroke-dashoffset:-1}}"
				}
			</style>
		</svg>
	);
}

function StatTile({
	icon: Icon,
	value,
	label,
	highlight,
}: {
	icon: typeof Package;
	value: number;
	label: string;
	highlight?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-2xl p-4",
				highlight ? "bg-primary/8" : "bg-card",
			)}
		>
			<span
				className={cn(
					"flex size-10 shrink-0 items-center justify-center rounded-xl",
					highlight
						? "bg-primary text-primary-foreground"
						: "bg-primary/10 text-primary",
				)}
			>
				<Icon className="size-4" />
			</span>
			<div className="min-w-0">
				<div className="font-bold font-mono text-2xl tabular-nums leading-none">
					{formatNumber(value)}
				</div>
				<div className="mt-1 truncate text-muted-foreground text-xs">
					{label}
				</div>
			</div>
		</div>
	);
}

function WeekBars({
	days,
	label,
}: {
	days: Array<{ day: number; total: number }>;
	label: string;
}) {
	const format = useFormatter();
	const max = Math.max(1, ...days.map((d) => d.total));

	return (
		<div className="rounded-2xl bg-card p-4">
			<div className="mb-3 flex items-center justify-between">
				<span className="eyebrow">{label}</span>
			</div>
			<div className="flex h-16 items-end gap-1.5">
				{days.map((d, index) => {
					const isToday = index === days.length - 1;
					return (
						<div
							key={d.day}
							className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1"
						>
							<motion.div
								initial={{ scaleY: 0 }}
								animate={{ scaleY: 1 }}
								transition={{
									duration: 0.5,
									delay: index * 0.06,
									ease: [0.16, 1, 0.3, 1],
								}}
								style={{ height: `${Math.max(8, (d.total / max) * 100)}%` }}
								className={cn(
									"w-full origin-bottom rounded-md",
									isToday ? "bg-primary" : "bg-primary/20",
								)}
							/>
							<span
								className={cn(
									"font-mono text-[10px] tabular-nums",
									isToday ? "text-primary" : "text-muted-foreground/70",
								)}
							>
								{format.dateTime(new Date(d.day * 1000), { weekday: "short" })}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function RatingStars({ rating }: { rating: number }) {
	return (
		<span className="inline-flex items-center gap-0.5">
			{[1, 2, 3, 4, 5].map((i) => (
				<Star
					key={i}
					className={cn(
						"size-3.5",
						i <= rating
							? "fill-warning text-warning"
							: "text-muted-foreground/30",
					)}
				/>
			))}
		</span>
	);
}

export default function PulsePage() {
	const t = useTranslations("PulsePage");
	const format = useFormatter();
	const now = useNow({ updateInterval: 60_000 });
	const reduceMotion = useReducedMotion();
	const [page, setPage] = useState(1);
	const [tab, setTab] = useState<PulseTab>("all");
	const [feed, setFeed] = useState<PulseItem[]>([]);

	const activeTypes =
		tab === "all"
			? undefined
			: tab === "review.added"
				? ["review.added", "review.updated"]
				: tab === "plugin.created"
					? ["plugin.created", "plugin.approved"]
					: [tab];
	const { data, isLoading, isFetching, isError, refetch } =
		api.pulse.get.useQuery({
			page,
			limit: 20,
			types: activeTypes,
		});
	const { data: stats } = api.pulse.stats.useQuery();
	const { data: trending } = api.plugins.getTrending.useQuery({ limit: 5 });

	useEffect(() => {
		if (!data) return;
		setFeed((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
	}, [data, page]);

	const hasMore = (data?.pagination.totalPages ?? 1) > page;

	const groups = useMemo(() => {
		const map = new Map<string, { date: Date; items: PulseItem[] }>();
		for (const it of feed) {
			const d = new Date(it.createdAt * 1000);
			const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
			const group = map.get(key) ?? { date: d, items: [] };
			group.items.push(it);
			map.set(key, group);
		}
		return Array.from(map.values());
	}, [feed]);

	const dayLabel = (date: Date) => {
		const startOfDay = (d: Date) =>
			new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
		const diffDays = Math.round(
			(startOfDay(now) - startOfDay(date)) / 86_400_000,
		);
		if (diffDays === 0) return t("today");
		if (diffDays === 1) return t("yesterday");
		return format.dateTime(date, { day: "2-digit", month: "long" });
	};

	const tabItems: Array<{
		value: PulseTab;
		label: string;
		icon: typeof Package | null;
	}> = [
		{ value: "all", label: t("tab_all"), icon: null },
		{ value: "plugin.created", label: t("tab_plugins"), icon: Package },
		{ value: "version.released", label: t("tab_releases"), icon: Tag },
		{ value: "review.added", label: t("tab_reviews"), icon: Star },
	];

	const renderSentence = (it: PulseItem) => {
		const actorName = it.actor?.name ?? t("unknown_user");
		const versionFromData = safeJsonParse<{ version?: string }>(
			it.data || "{}",
			{},
		).version;

		if (it.type === "plugin.created") {
			return (
				<p className="text-sm leading-relaxed">
					<span className="font-semibold">{actorName}</span>{" "}
					<span className="text-muted-foreground">
						{t("sentence_published")}
					</span>{" "}
					<Link
						href={`/plugins/${it.plugin?.slug}`}
						className="font-semibold text-primary underline-offset-4 hover:underline"
					>
						{it.plugin?.name}
					</Link>
					{versionFromData && (
						<span className="ml-2 rounded-full border bg-background/70 px-2 py-0.5 font-mono text-muted-foreground text-xs">
							v{versionFromData}
						</span>
					)}
				</p>
			);
		}

		if (it.type === "plugin.approved") {
			return (
				<p className="text-sm leading-relaxed">
					<Link
						href={`/plugins/${it.plugin?.slug}`}
						className="font-semibold text-primary underline-offset-4 hover:underline"
					>
						{it.plugin?.name}
					</Link>{" "}
					<span className="text-muted-foreground">
						{t("sentence_approved")}
					</span>
				</p>
			);
		}

		if (it.type === "version.released") {
			return (
				<p className="text-sm leading-relaxed">
					<span className="font-semibold">{actorName}</span>{" "}
					<span className="text-muted-foreground">
						{t("sentence_released")}
					</span>{" "}
					{it.version?.version && (
						<span className="mr-1 rounded-full bg-success/10 px-2 py-0.5 font-mono font-semibold text-success text-xs">
							v{it.version.version}
						</span>
					)}
					<span className="text-muted-foreground">{t("sentence_for")}</span>{" "}
					<Link
						href={`/plugins/${it.plugin?.slug}`}
						className="font-semibold text-primary underline-offset-4 hover:underline"
					>
						{it.plugin?.name}
					</Link>
				</p>
			);
		}

		const rating = it.review?.rating ?? it.rating ?? 0;
		return (
			<div className="space-y-1.5">
				<p className="text-sm leading-relaxed">
					<span className="font-semibold">{actorName}</span>{" "}
					<span className="text-muted-foreground">
						{it.type === "review.updated"
							? t("sentence_rerated")
							: t("sentence_rated")}
					</span>{" "}
					<Link
						href={`/plugins/${it.plugin?.slug}`}
						className="font-semibold text-primary underline-offset-4 hover:underline"
					>
						{it.plugin?.name}
					</Link>{" "}
					<RatingStars rating={rating} />
				</p>
				{it.review?.comment && (
					<blockquote className="line-clamp-2 rounded-xl border-primary/30 border-l-2 bg-primary/5 px-3 py-2 text-muted-foreground text-sm italic">
						{it.review.comment}
					</blockquote>
				)}
			</div>
		);
	};

	return (
		<div className="bg-background">
			<section className="relative isolate overflow-hidden">
				<div className="dot-grid absolute inset-0 -z-10" />
				<div className="absolute -top-24 left-1/4 -z-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="container mx-auto px-4 pt-10 pb-14 sm:pt-14">
					<div className="flex flex-wrap items-center gap-3">
						<span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-primary/10 px-3 font-mono font-semibold text-primary text-xs uppercase tracking-widest">
							<span className="size-2 animate-pulse-dot rounded-full bg-primary" />
							{t("live")}
						</span>
						{stats && (
							<span className="font-mono text-muted-foreground text-xs tabular-nums">
								{t("events_this_week", { count: stats.week })}
							</span>
						)}
					</div>
					<h1 className="mt-4 font-bold text-4xl tracking-tighter sm:text-5xl">
						{t("title")}
					</h1>
					<p className="mt-3 max-w-xl text-muted-foreground sm:text-lg">
						{t("description")}
					</p>
				</div>
				<EcgLine />
			</section>

			<div className="container mx-auto px-4 py-8 sm:py-10">
				<div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
					<StatTile
						icon={Activity}
						value={stats?.today ?? 0}
						label={t("stats_today")}
						highlight
					/>
					<StatTile
						icon={Package}
						value={stats?.plugins ?? 0}
						label={t("stats_plugins")}
					/>
					<StatTile
						icon={Tag}
						value={stats?.releases ?? 0}
						label={t("stats_releases")}
					/>
					<StatTile
						icon={MessageSquare}
						value={stats?.reviews ?? 0}
						label={t("stats_reviews")}
					/>
				</div>

				<div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
					<div className="min-w-0">
						<div className="scrollbar-hide -mx-4 mb-6 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
							{tabItems.map((item) => {
								const ItemIcon = item.icon;
								return (
									<button
										key={item.value}
										type="button"
										onClick={() => {
											setTab(item.value);
											setPage(1);
										}}
										aria-pressed={tab === item.value}
										className={cn(
											"press-scale inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-full px-4 font-medium text-sm transition-colors",
											tab === item.value
												? "bg-primary text-primary-foreground"
												: "bg-surface hover:text-primary",
										)}
									>
										{ItemIcon && <ItemIcon className="h-4 w-4" />}
										{item.label}
									</button>
								);
							})}
						</div>

						{isLoading && feed.length === 0 ? (
							<div className="space-y-3">
								{Array.from({ length: 6 }).map((_, i) => (
									<div key={i} className="flex items-start gap-4 py-3 pl-2">
										<Skeleton className="size-9 shrink-0 rounded-xl" />
										<div className="min-w-0 flex-1 space-y-2 pt-1">
											<Skeleton className="h-4 w-2/3" />
											<Skeleton className="h-3 w-24" />
										</div>
									</div>
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
						) : feed.length === 0 ? (
							<EmptyState
								icon="~"
								title={
									tab === "plugin.created"
										? t("empty_plugins_title")
										: tab === "version.released"
											? t("empty_releases_title")
											: tab === "review.added"
												? t("empty_reviews_title")
												: t("empty_all_title")
								}
								description={
									tab === "plugin.created"
										? t("empty_plugins_description")
										: tab === "version.released"
											? t("empty_releases_description")
											: tab === "review.added"
												? t("empty_reviews_description")
												: t("empty_all_description")
								}
							/>
						) : (
							<div className="relative pl-2">
								<div
									aria-hidden="true"
									className="absolute top-2 bottom-2 left-[2.06rem] w-px bg-gradient-to-b from-primary/50 via-border to-transparent"
								/>
								<AnimatePresence initial={false}>
									{groups.map((group) => (
										<div key={group.date.toDateString()} className="mb-2">
											<div className="relative mb-3 flex items-center gap-4 px-2 py-2">
												<span className="flex size-9 shrink-0 items-center justify-center">
													<span className="relative z-10 size-2.5 rounded-full border-2 border-background bg-primary" />
												</span>
												<span className="eyebrow">{dayLabel(group.date)}</span>
											</div>
											<div className="space-y-1">
												{group.items.map((it, idx) => {
													const node =
														nodeStyles[it.type] ?? nodeStyles["review.added"];
													const NodeIcon = node?.icon ?? Star;
													const isLatest =
														groups[0] === group && idx === 0 && page >= 1;
													return (
														<motion.div
															key={it.id}
															initial={
																reduceMotion ? false : { opacity: 0, y: 12 }
															}
															whileInView={
																reduceMotion ? undefined : { opacity: 1, y: 0 }
															}
															viewport={{ once: true, margin: "-30px" }}
															transition={{
																duration: 0.35,
																delay: (idx % 6) * 0.04,
																ease: [0.16, 1, 0.3, 1],
															}}
															className="group relative flex items-start gap-4 rounded-2xl px-2 py-3 transition-colors hover:bg-primary/[0.04]"
														>
															<span
																className={cn(
																	"relative z-10 mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
																	node?.className,
																	isLatest &&
																		!reduceMotion &&
																		"after:absolute after:inset-0 after:animate-ping after:rounded-xl after:bg-primary/30",
																)}
															>
																<NodeIcon className="size-4" />
															</span>
															<div className="min-w-0 flex-1">
																{renderSentence(it)}
																<div className="mt-1.5 flex items-center gap-2 text-muted-foreground text-xs">
																	<Avatar className="size-4 border">
																		<AvatarImage
																			src={it.actor?.image ?? undefined}
																		/>
																		<AvatarFallback className="bg-primary/10 text-[8px] text-primary">
																			{(it.actor?.name ?? "??")
																				.slice(0, 2)
																				.toUpperCase()}
																		</AvatarFallback>
																	</Avatar>
																	<span className="whitespace-nowrap">
																		{format.relativeTime(
																			new Date(it.createdAt * 1000),
																			now,
																		)}
																	</span>
																</div>
															</div>
														</motion.div>
													);
												})}
											</div>
										</div>
									))}
								</AnimatePresence>

								{hasMore && (
									<div className="mt-6 flex justify-center">
										<Button
											variant="outline"
											size="lg"
											disabled={isFetching}
											onClick={() => setPage((prev) => prev + 1)}
											className="min-w-48"
										>
											{isFetching ? t("loading") : t("load_more")}
										</Button>
									</div>
								)}
							</div>
						)}
					</div>

					<aside className="hidden space-y-6 lg:block">
						{stats && <WeekBars days={stats.days} label={t("week_activity")} />}

						<div className="rounded-2xl bg-card p-5">
							<div className="mb-4 flex items-center justify-between">
								<span className="eyebrow">{t("trending_title")}</span>
								<TrendingUp className="size-4 text-primary" />
							</div>
							<div className="space-y-1">
								{(trending ?? []).map((plugin, index) => (
									<Link
										key={plugin.id}
										href={`/plugins/${plugin.slug}`}
										className="flex min-h-11 items-center gap-3 rounded-xl px-2 transition-colors hover:bg-primary/5"
									>
										<span
											className={cn(
												"flex size-7 shrink-0 items-center justify-center rounded-lg font-bold font-mono text-xs",
												index === 0
													? "bg-primary text-primary-foreground"
													: "bg-primary/10 text-primary",
											)}
										>
											{index + 1}
										</span>
										<span className="min-w-0 flex-1 truncate font-medium text-sm">
											{plugin.name}
										</span>
										<span className="flex shrink-0 items-center gap-1 font-mono text-muted-foreground text-xs tabular-nums">
											<Star className="size-3 fill-warning text-warning" />
											{plugin.rating.toFixed(1)}
										</span>
									</Link>
								))}
							</div>
						</div>

						<div className="relative overflow-hidden rounded-2xl bg-contrast p-6 text-contrast-foreground">
							<div className="absolute -top-10 -right-10 size-32 rounded-full bg-primary/25 blur-2xl" />
							<div className="mb-3 flex items-center gap-2">
								<Users className="size-4 text-primary" />
								<span className="font-mono text-xs uppercase tracking-widest opacity-70">
									{t("cta_eyebrow")}
								</span>
							</div>
							<p className="font-bold text-lg leading-snug">{t("cta_title")}</p>
							<p className="mt-2 text-sm opacity-70">{t("cta_description")}</p>
							<Button asChild size="sm" className="mt-4">
								<Link href="/upload">
									<Upload className="size-4" />
									{t("cta_button")}
									<ArrowRight className="size-4" />
								</Link>
							</Button>
						</div>
					</aside>
				</div>
			</div>
		</div>
	);
}
