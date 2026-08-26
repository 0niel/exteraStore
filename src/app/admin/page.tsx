"use client";

import {
	Activity,
	AlertTriangle,
	ArrowRight,
	Download,
	MessageSquare,
	Package,
	ShieldAlert,
	Star,
	Timer,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { isAdminUser } from "~/config/admins";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const STAT_SKELETON_KEYS = ["st-1", "st-2", "st-3", "st-4", "st-5"];
const LIST_SKELETON_KEYS = ["ls-1", "ls-2", "ls-3"];

const CLASSIFICATION_STYLES: Record<string, string> = {
	safe: "border-transparent bg-success/15 text-success",
	potentially_unsafe: "border-transparent bg-warning/15 text-warning",
	unsafe: "border-transparent bg-destructive/15 text-destructive",
	critical: "border-transparent bg-destructive/15 text-destructive",
};

function useCountUp(target: number, duration = 900) {
	const [value, setValue] = useState(0);

	useEffect(() => {
		if (target <= 0) {
			setValue(0);
			return;
		}
		let frame = 0;
		const start = performance.now();
		const tick = (now: number) => {
			const progress = Math.min((now - start) / duration, 1);
			setValue(Math.round(target * (1 - (1 - progress) ** 3)));
			if (progress < 1) {
				frame = requestAnimationFrame(tick);
			}
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target, duration]);

	return value;
}

function StatTile({
	icon: Icon,
	label,
	value,
	highlight,
}: {
	icon: typeof Package;
	label: string;
	value: number;
	highlight?: boolean;
}) {
	const animated = useCountUp(value);

	return (
		<Card className="card-lift animate-fade-in">
			<CardContent className="flex items-center gap-3 p-4">
				<span
					className={cn(
						"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
						highlight
							? "bg-warning/15 text-warning"
							: "bg-primary/10 text-primary",
					)}
				>
					<Icon className="h-5 w-5" />
				</span>
				<div className="min-w-0">
					<div className="font-bold font-mono text-2xl leading-tight">
						{animated.toLocaleString()}
					</div>
					<div className="truncate text-muted-foreground text-xs">{label}</div>
				</div>
			</CardContent>
		</Card>
	);
}

function ActivityBars({
	days,
	locale,
}: {
	days: { day: number; total: number }[];
	locale: string;
}) {
	const max = Math.max(1, ...days.map((d) => d.total));
	const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });

	return (
		<div className="flex h-36 items-end gap-2">
			{days.map((d) => (
				<div
					key={d.day}
					className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
				>
					<span className="font-mono text-muted-foreground text-xs">
						{d.total}
					</span>
					<div
						className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/70 transition-all"
						style={{
							height: `${Math.max(4, Math.round((d.total / max) * 100))}%`,
						}}
					/>
					<span className="text-[11px] text-muted-foreground">
						{formatter.format(new Date(d.day * 1000))}
					</span>
				</div>
			))}
		</div>
	);
}

export default function AdminDashboardPage() {
	const { data: session } = useSession();
	const t = useTranslations("AdminDashboard");
	const locale = useLocale();

	const isAdmin = isAdminUser(session?.user);
	const enabled = Boolean(session && isAdmin);

	const { data: overview } = api.adminStats.overview.useQuery(undefined, {
		enabled,
	});
	const { data: queue } = api.adminStats.moderationQueue.useQuery(undefined, {
		enabled,
	});
	const { data: failures } = api.adminStats.pipelineFailures.useQuery(
		undefined,
		{ enabled },
	);
	const { data: pulse } = api.pulse.stats.useQuery(undefined, { enabled });

	const stats = [
		{
			key: "plugins",
			icon: Package,
			label: t("stat_plugins"),
			value: overview?.totalPlugins ?? 0,
		},
		{
			key: "pending",
			icon: Timer,
			label: t("stat_pending"),
			value: overview?.pendingPlugins ?? 0,
			highlight: (overview?.pendingPlugins ?? 0) > 0,
		},
		{
			key: "users",
			icon: Users,
			label: t("stat_users"),
			value: overview?.totalUsers ?? 0,
		},
		{
			key: "downloads",
			icon: Download,
			label: t("stat_downloads"),
			value: overview?.totalDownloads ?? 0,
		},
		{
			key: "reviews",
			icon: Star,
			label: t("stat_reviews"),
			value: overview?.totalReviews ?? 0,
		},
	];

	return (
		<div className="py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-6 animate-fade-up">
					<span className="eyebrow mb-2">{t("eyebrow")}</span>
					<h1 className="font-bold text-3xl tracking-tight md:text-4xl">
						{t("title")}
					</h1>
					<p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
				</div>

				{overview ? (
					<div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
						{stats.map((stat) => (
							<StatTile
								key={stat.key}
								icon={stat.icon}
								label={stat.label}
								value={stat.value}
								highlight={stat.highlight}
							/>
						))}
					</div>
				) : (
					<div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
						{STAT_SKELETON_KEYS.map((key) => (
							<div
								key={key}
								className="skeleton-shimmer h-[76px] rounded-2xl"
							/>
						))}
					</div>
				)}

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<Card className="animate-fade-in">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<Activity className="h-4 w-4" />
								</span>
								{t("activity_title")}
								{pulse ? (
									<span className="ml-auto font-mono font-semibold text-primary text-sm">
										{pulse.week}
									</span>
								) : null}
							</CardTitle>
						</CardHeader>
						<CardContent>
							{pulse ? (
								<ActivityBars days={pulse.days} locale={locale} />
							) : (
								<div className="skeleton-shimmer h-36 rounded-xl" />
							)}
						</CardContent>
					</Card>

					<Card className="animate-fade-in">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<ShieldAlert className="h-4 w-4" />
								</span>
								{t("queue_title")}
								<Button
									variant="ghost"
									size="sm"
									className="ml-auto text-primary"
									asChild
								>
									<Link href="/admin/plugins">
										{t("view_all")}
										<ArrowRight className="ml-1 h-4 w-4" />
									</Link>
								</Button>
							</CardTitle>
						</CardHeader>
						<CardContent>
							{!queue ? (
								<div className="space-y-2">
									{LIST_SKELETON_KEYS.map((key) => (
										<div
											key={key}
											className="skeleton-shimmer h-12 rounded-xl"
										/>
									))}
								</div>
							) : queue.length === 0 ? (
								<p className="py-6 text-center text-muted-foreground text-sm">
									{t("queue_empty")}
								</p>
							) : (
								<ul className="space-y-2">
									{queue.map((plugin) => (
										<li
											key={plugin.id}
											className="flex min-h-11 items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
										>
											<div className="min-w-0 flex-1">
												<div className="truncate font-medium text-sm">
													{plugin.name}
												</div>
												<div className="truncate text-muted-foreground text-xs">
													{plugin.author}
												</div>
											</div>
											{plugin.securityCheck?.classification ? (
												<Badge
													className={
														CLASSIFICATION_STYLES[
															plugin.securityCheck.classification
														] ??
														"border-transparent bg-muted text-muted-foreground"
													}
												>
													{t(
														`class_${plugin.securityCheck.classification}` as
															| "class_safe"
															| "class_potentially_unsafe"
															| "class_unsafe"
															| "class_critical",
													)}
												</Badge>
											) : (
												<Badge className="border-transparent bg-muted text-muted-foreground">
													{t("class_unchecked")}
												</Badge>
											)}
											<Button variant="outline" size="sm" asChild>
												<Link href="/admin/plugins">{t("review")}</Link>
											</Button>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>

					<Card className="animate-fade-in lg:col-span-2">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<span className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
									<AlertTriangle className="h-4 w-4" />
								</span>
								{t("failures_title")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							{!failures ? (
								<div className="space-y-2">
									{LIST_SKELETON_KEYS.map((key) => (
										<div
											key={key}
											className="skeleton-shimmer h-12 rounded-xl"
										/>
									))}
								</div>
							) : failures.length === 0 ? (
								<p className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
									<MessageSquare className="h-4 w-4" />
									{t("failures_empty")}
								</p>
							) : (
								<ul className="space-y-2">
									{failures.map((failure) => (
										<li
											key={failure.id}
											className="flex min-h-11 flex-wrap items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2"
										>
											<div className="min-w-0 flex-1">
												<div className="truncate font-medium text-sm">
													{failure.pluginName ?? `#${failure.pluginId}`}
												</div>
												<div className="truncate text-muted-foreground text-xs">
													{failure.errorMessage ?? t("failures_unknown")}
												</div>
											</div>
											<span className="font-mono text-muted-foreground text-xs">
												{t("failures_attempts", {
													count: failure.retryCount,
													max: failure.maxRetries,
												})}
											</span>
											{failure.completedAt ? (
												<span className="font-mono text-muted-foreground text-xs">
													{new Intl.DateTimeFormat(locale, {
														day: "numeric",
														month: "short",
														hour: "2-digit",
														minute: "2-digit",
													}).format(new Date(failure.completedAt * 1000))}
												</span>
											) : null}
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
