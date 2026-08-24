"use client";

import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface ReviewSummaryProps {
	pluginId: number;
}

export function ReviewSummary({ pluginId }: ReviewSummaryProps) {
	const t = useTranslations("AI");
	const { status } = useSession();

	const { data, isLoading, isError } = api.ai.summarizeReviews.useQuery(
		{ pluginId },
		{
			enabled: pluginId > 0 && status === "authenticated",
			staleTime: 5 * 60 * 1000,
			retry: false,
		},
	);

	if (status !== "authenticated") {
		return null;
	}

	if (isLoading) {
		return (
			<section className="space-y-5 rounded-3xl bg-surface/70 p-5 sm:p-7">
				<div className="skeleton-shimmer h-12 w-52 rounded-2xl" />
				<div className="skeleton-shimmer h-6 w-full rounded-md" />
				<div className="skeleton-shimmer h-6 w-4/5 rounded-md" />
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div className="skeleton-shimmer h-24 rounded-2xl" />
					<div className="skeleton-shimmer h-24 rounded-2xl" />
				</div>
			</section>
		);
	}

	if (isError || !data || !data.available) {
		return null;
	}

	const sentimentStyles: Record<string, string> = {
		positive: "bg-success/10 text-success",
		mixed: "bg-warning/10 text-warning",
		negative: "bg-destructive/10 text-destructive",
	};

	return (
		<section className="animate-fade-up space-y-6 overflow-hidden rounded-3xl bg-linear-to-br from-primary/10 via-surface/80 to-surface/60 p-5 sm:p-7">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
						<Sparkles className="size-5" />
					</span>
					<div className="min-w-0">
						<h3 className="font-semibold text-base sm:text-lg">
							{t("summary_chip")}
						</h3>
						<p className="text-muted-foreground text-sm">
							{t("summary_based_on", { count: data.reviewCount })}
						</p>
					</div>
				</div>
				<span
					className={cn(
						"inline-flex rounded-full px-3 py-1.5 font-semibold text-sm",
						sentimentStyles[data.sentiment],
					)}
				>
					{t(`sentiment_${data.sentiment}`)}
				</span>
			</div>

			<p className="max-w-4xl text-base leading-7 sm:text-lg sm:leading-8">
				{data.verdict}
			</p>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{data.pros.length > 0 && (
					<div className="space-y-3 rounded-2xl bg-background/55 p-4 sm:p-5">
						<h4 className="font-semibold text-sm">{t("pros")}</h4>
						<ul className="space-y-2.5">
							{data.pros.map((pro) => (
								<li
									key={pro}
									className="flex items-start gap-2.5 text-sm leading-6"
								>
									<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
									<span className="text-foreground/90">{pro}</span>
								</li>
							))}
						</ul>
					</div>
				)}
				{data.cons.length > 0 && (
					<div className="space-y-3 rounded-2xl bg-background/55 p-4 sm:p-5">
						<h4 className="font-semibold text-sm">{t("cons")}</h4>
						<ul className="space-y-2.5">
							{data.cons.map((con) => (
								<li
									key={con}
									className="flex items-start gap-2.5 text-sm leading-6"
								>
									<AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
									<span className="text-foreground/90">{con}</span>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</section>
	);
}
