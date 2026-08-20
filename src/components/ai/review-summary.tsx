"use client";

import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface ReviewSummaryProps {
	pluginId: number;
}

export function ReviewSummary({ pluginId }: ReviewSummaryProps) {
	const t = useTranslations("AI");
	const rawLocale = useLocale();
	const locale = rawLocale === "en" ? ("en" as const) : ("ru" as const);

	const { data, isLoading, isError } = api.ai.summarizeReviews.useQuery(
		{ pluginId, locale },
		{
			enabled: pluginId > 0,
			staleTime: 5 * 60 * 1000,
			retry: false,
		},
	);

	if (isLoading) {
		return (
			<Card className="border-primary/20">
				<CardContent className="space-y-3 p-4">
					<div className="skeleton-shimmer h-6 w-32 rounded-full" />
					<div className="skeleton-shimmer h-4 w-full rounded-md" />
					<div className="skeleton-shimmer h-4 w-3/4 rounded-md" />
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="skeleton-shimmer h-16 rounded-lg" />
						<div className="skeleton-shimmer h-16 rounded-lg" />
					</div>
				</CardContent>
			</Card>
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
		<Card className="animate-fade-up border-primary/20">
			<CardContent className="space-y-4 p-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-xs">
						<Sparkles className="h-3.5 w-3.5" />
						{t("summary_chip")}
					</span>
					<Badge
						className={cn(
							"border-transparent text-xs",
							sentimentStyles[data.sentiment],
						)}
					>
						{t(`sentiment_${data.sentiment}`)}
					</Badge>
				</div>

				<p className="text-sm leading-relaxed">{data.verdict}</p>

				<div className="grid gap-4 sm:grid-cols-2">
					{data.pros.length > 0 && (
						<div className="space-y-2">
							<h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
								{t("pros")}
							</h4>
							<ul className="space-y-1.5">
								{data.pros.map((pro) => (
									<li key={pro} className="flex items-start gap-2 text-sm">
										<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
										<span>{pro}</span>
									</li>
								))}
							</ul>
						</div>
					)}
					{data.cons.length > 0 && (
						<div className="space-y-2">
							<h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
								{t("cons")}
							</h4>
							<ul className="space-y-1.5">
								{data.cons.map((con) => (
									<li key={con} className="flex items-start gap-2 text-sm">
										<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
										<span>{con}</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
