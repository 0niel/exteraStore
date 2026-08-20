"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Activity, MessageSquare, Package, Star, Tag } from "lucide-react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { PageHeader } from "~/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type PulseItem = RouterOutputs["pulse"]["get"]["items"][number];

type PulseTab = "all" | "plugin.created" | "version.released" | "review.added";

const defaultBubble = {
	icon: Star,
	className: "bg-warning/15 text-warning",
};

const eventBubbles: Record<
	string,
	{ icon: typeof Package; className: string }
> = {
	"plugin.created": {
		icon: Package,
		className: "bg-primary/10 text-primary",
	},
	"version.released": {
		icon: Tag,
		className: "bg-success/15 text-success",
	},
	"review.added": defaultBubble,
};

export default function PulsePage() {
	const t = useTranslations("PulsePage");
	const format = useFormatter();
	const now = useNow({ updateInterval: 60_000 });
	const reduceMotion = useReducedMotion();
	const [page, setPage] = useState(1);
	const [tab, setTab] = useState<PulseTab>("all");

	const activeTypes = tab === "all" ? undefined : [tab];
	const { data, isLoading, isFetching } = api.pulse.get.useQuery({
		page,
		limit: 20,
		types: activeTypes,
	});

	const items = data?.items ?? [];
	const totalPages = data?.pagination.totalPages ?? 1;

	const groups = useMemo(() => {
		const map = new Map<string, { date: Date; items: PulseItem[] }>();
		for (const it of items) {
			const d = new Date(it.createdAt * 1000);
			const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
			const group = map.get(key) ?? { date: d, items: [] };
			group.items.push(it);
			map.set(key, group);
		}
		return Array.from(map.values());
	}, [items]);

	const dayLabel = (date: Date) => {
		const startOfDay = (d: Date) =>
			new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
		const diffDays = Math.round(
			(startOfDay(now) - startOfDay(date)) / 86_400_000,
		);
		if (diffDays === 0) return t("today");
		if (diffDays === 1) return t("yesterday");
		return format.dateTime(date, {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
	};

	const renderBubble = (type: string) => {
		const bubble = eventBubbles[type] ?? defaultBubble;
		const BubbleIcon = bubble.icon;
		return (
			<div
				className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${bubble.className}`}
			>
				<BubbleIcon className="h-4 w-4" />
			</div>
		);
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

	const countLabel =
		tab === "all"
			? t("count_events", { count: data?.pagination.total ?? 0 })
			: tab === "plugin.created"
				? t("count_plugins", { count: data?.pagination.total ?? 0 })
				: tab === "version.released"
					? t("count_releases", { count: data?.pagination.total ?? 0 })
					: t("count_reviews", { count: data?.pagination.total ?? 0 });

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
					icon={Activity}
				/>

				<div className="mb-4 flex min-h-6 items-center justify-between gap-3">
					<span className="eyebrow">{t("section_feed")}</span>
					{isLoading ? (
						<span className="text-muted-foreground text-xs">
							{t("loading")}
						</span>
					) : (
						<span className="font-mono text-muted-foreground text-xs tabular-nums">
							{countLabel}
						</span>
					)}
				</div>

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
									"press-scale inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-full border px-4 font-medium text-sm transition-colors",
									tab === item.value
										? "border-primary bg-primary text-primary-foreground"
										: "bg-background/70 backdrop-blur hover:border-primary/40 hover:text-primary",
								)}
							>
								{ItemIcon && <ItemIcon className="h-4 w-4" />}
								{item.label}
							</button>
						);
					})}
				</div>

				{isLoading ? (
					<div className="space-y-4">
						{Array.from({ length: 6 }).map((_, i) => (
							<Card key={i}>
								<CardContent className="p-0">
									<div className="flex items-start gap-3 p-4 sm:p-5">
										<Skeleton className="skeleton-shimmer h-10 w-10 shrink-0 rounded-xl" />
										<div className="min-w-0 flex-1 space-y-2">
											<div className="flex items-center justify-between gap-2">
												<div className="flex items-center gap-2">
													<Skeleton className="skeleton-shimmer h-6 w-6 rounded-full" />
													<Skeleton className="skeleton-shimmer h-4 w-24" />
												</div>
												<Skeleton className="skeleton-shimmer h-3 w-16" />
											</div>
											<Skeleton className="skeleton-shimmer h-4 w-3/4" />
											<div className="flex gap-2">
												<Skeleton className="skeleton-shimmer h-5 w-16" />
												<Skeleton className="skeleton-shimmer h-5 w-20" />
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				) : items.length === 0 ? (
					<EmptyState
						icon={
							tab === "plugin.created"
								? "+"
								: tab === "version.released"
									? "v"
									: tab === "review.added"
										? "*"
										: "~"
						}
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
					<div className="relative">
						{groups.map((group) => (
							<div key={group.date.toDateString()} className="mb-10">
								<div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 mb-4 flex justify-center">
									<span className="eyebrow glass rounded-full border px-4 py-2 shadow-soft">
										{dayLabel(group.date)}
									</span>
								</div>
								<div className="space-y-4">
									{group.items.map((it, idx) => (
										<motion.div
											key={it.id}
											initial={reduceMotion ? false : { opacity: 0, y: 16 }}
											whileInView={
												reduceMotion ? undefined : { opacity: 1, y: 0 }
											}
											viewport={{ once: true, margin: "-40px" }}
											transition={{
												duration: 0.4,
												delay: (idx % 5) * 0.05,
												ease: [0.16, 1, 0.3, 1],
											}}
										>
											<Card className="group overflow-hidden transition-colors hover:border-primary/35">
												<CardContent className="p-0">
													<div className="flex items-start gap-3 p-4 sm:p-5">
														{renderBubble(it.type)}

														<div className="min-w-0 flex-1 space-y-2">
															<div className="flex items-start justify-between gap-2">
																<div className="flex items-center gap-2">
																	<Avatar className="h-6 w-6 border">
																		<AvatarImage
																			src={it.actor?.image ?? undefined}
																		/>
																		<AvatarFallback className="bg-primary/10 text-primary text-xs">
																			{(it.actor?.name ?? "??")
																				.slice(0, 2)
																				.toUpperCase()}
																		</AvatarFallback>
																	</Avatar>
																	<span className="font-medium text-sm">
																		{it.actor?.name ?? t("unknown_user")}
																	</span>
																</div>
																<span className="whitespace-nowrap text-muted-foreground text-xs">
																	{format.relativeTime(
																		new Date(it.createdAt * 1000),
																		now,
																	)}
																</span>
															</div>

															<div className="space-y-1.5">
																{it.type === "plugin.created" && (
																	<>
																		<div className="flex items-center gap-2 text-sm">
																			<span className="text-muted-foreground">
																				{t("published_plugin")}
																			</span>
																		</div>
																		<Link
																			className="group/link inline-flex items-baseline gap-2 hover:underline"
																			href={`/plugins/${it.plugin?.slug}`}
																		>
																			<span className="font-bold text-base leading-tight">
																				{it.plugin?.name}
																			</span>
																			{it.plugin &&
																				JSON.parse(it.data || "{}").version && (
																					<Badge
																						variant="outline"
																						className="text-xs"
																					>
																						v
																						{
																							JSON.parse(it.data || "{}")
																								.version
																						}
																					</Badge>
																				)}
																		</Link>
																		{it.message && (
																			<p className="line-clamp-2 text-muted-foreground text-sm">
																				{it.message}
																			</p>
																		)}
																	</>
																)}

																{it.type === "version.released" && (
																	<>
																		<div className="flex items-center gap-2 text-sm">
																			<span className="text-muted-foreground">
																				{t("update_for")}
																			</span>
																			<Link
																				className="font-medium hover:underline"
																				href={`/plugins/${it.plugin?.slug}`}
																			>
																				{it.plugin?.name}
																			</Link>
																		</div>
																		<div className="flex flex-wrap items-center gap-2">
																			<Badge
																				variant="default"
																				className="gap-1 px-2.5 py-1"
																			>
																				<Tag className="h-3 w-3" />v
																				{it.version?.version}
																			</Badge>
																			{JSON.parse(it.data || "{}").isStable ===
																			false ? (
																				<Badge
																					variant="outline"
																					className="border-warning/50 text-warning text-xs"
																				>
																					{t("beta")}
																				</Badge>
																			) : (
																				<Badge
																					variant="outline"
																					className="border-success/50 text-success text-xs"
																				>
																					{t("stable")}
																				</Badge>
																			)}
																		</div>
																		{it.message &&
																			it.message !==
																				`v${it.version?.version}` && (
																				<div className="rounded-md border-primary border-l-2 bg-primary/5 py-1.5 pr-2 pl-3 text-sm">
																					<p className="line-clamp-2">
																						{it.message}
																					</p>
																				</div>
																			)}
																	</>
																)}

																{it.type === "review.added" && (
																	<>
																		<div className="text-sm">
																			<span className="text-muted-foreground">
																				{t("left_review")}
																			</span>{" "}
																			<Link
																				className="font-medium hover:underline"
																				href={`/plugins/${it.plugin?.slug}`}
																			>
																				{it.plugin?.name}
																			</Link>
																		</div>

																		{(() => {
																			const displayRating =
																				it.review?.rating ?? it.rating;
																			return (
																				displayRating !== null &&
																				displayRating !== undefined && (
																					<div className="flex items-center gap-2">
																						<div className="flex items-center gap-1 rounded-lg bg-warning/10 px-2.5 py-1.5">
																							{Array.from({ length: 5 }).map(
																								(_, i) => (
																									<Star
																										key={i}
																										className={`h-4 w-4 ${
																											i < displayRating
																												? "fill-warning text-warning"
																												: "fill-muted-foreground/30 text-muted-foreground/30"
																										}`}
																									/>
																								),
																							)}
																							<span className="ml-1.5 font-bold text-foreground text-sm tabular-nums">
																								{displayRating}/5
																							</span>
																						</div>
																						{it.review?.comment && (
																							<Badge
																								variant="outline"
																								className="gap-1 text-xs"
																							>
																								<MessageSquare className="h-3 w-3" />
																								{t("with_comment")}
																							</Badge>
																						)}
																					</div>
																				)
																			);
																		})()}

																		{it.review?.title && (
																			<div className="font-medium text-sm">
																				{it.review.title}
																			</div>
																		)}

																		{it.review?.comment && (
																			<div className="rounded-lg border border-primary/10 bg-primary/5 p-3 text-sm">
																				<div className="mb-1 flex items-center gap-1.5 text-muted-foreground text-xs">
																					<MessageSquare className="h-3.5 w-3.5" />
																					<span>{t("comment_label")}</span>
																				</div>
																				<p className="line-clamp-4 leading-relaxed">
																					{it.review.comment}
																				</p>
																				<Link
																					href={`/plugins/${it.plugin?.slug}`}
																					className="mt-2 inline-flex min-h-11 items-center text-primary text-xs hover:underline"
																				>
																					{t("read_more")}
																				</Link>
																			</div>
																		)}

																		{!it.review?.comment &&
																			!it.review?.title && (
																				<div className="text-muted-foreground text-xs italic">
																					{t("no_comment")}
																				</div>
																			)}
																	</>
																)}
															</div>
														</div>
													</div>
												</CardContent>
											</Card>
										</motion.div>
									))}
								</div>
							</div>
						))}
					</div>
				)}

				{totalPages > 1 && (
					<div className="mt-6 flex justify-center gap-2">
						<Button
							variant="outline"
							className="min-h-11"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1 || isFetching}
						>
							{t("prev_page")}
						</Button>
						<Button
							variant="outline"
							className="min-h-11"
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							disabled={page === totalPages || isFetching}
						>
							{t("next_page")}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
