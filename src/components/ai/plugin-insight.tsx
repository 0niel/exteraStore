"use client";

import {
	BrainCircuit,
	CheckCircle2,
	Gauge,
	Loader2,
	ShieldAlert,
	TriangleAlert,
	Wrench,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface PluginInsightProps {
	pluginId: number;
	pluginName: string;
}

function InsightList({
	items,
	icon: Icon,
	emptyText,
}: {
	items: string[];
	icon: typeof CheckCircle2;
	emptyText: string;
}) {
	if (items.length === 0) {
		return <p className="text-muted-foreground text-sm">{emptyText}</p>;
	}

	return (
		<ul className="space-y-2">
			{items.map((item, index) => (
				<li
					key={`${item}-${index}`}
					className="flex items-start gap-2 text-sm leading-relaxed"
				>
					<Icon className="mt-0.5 size-4 shrink-0 text-primary" />
					<span>{item}</span>
				</li>
			))}
		</ul>
	);
}

export function PluginInsight({ pluginId, pluginName }: PluginInsightProps) {
	const t = useTranslations("AI");
	const locale = useLocale() === "en" ? ("en" as const) : ("ru" as const);
	const [open, setOpen] = useState(false);
	const { data, isLoading, isError, refetch } = api.ai.pluginInsight.useQuery(
		{ pluginId, locale },
		{ enabled: open, staleTime: 30 * 60 * 1000, retry: false },
	);

	const verdictStyles = {
		recommended: "bg-success/10 text-success",
		conditional: "bg-warning/10 text-warning",
		specialized: "bg-primary/10 text-primary",
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="secondary"
					className="press-scale min-h-11 gap-2 bg-contrast/5 hover:bg-contrast/10"
				>
					<BrainCircuit className="size-4 text-primary" />
					{t("insight_button")}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl" closeLabel={t("close")}>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-3 pr-8">
						<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
							<BrainCircuit className="size-5" />
						</span>
						<span>{t("insight_title", { name: pluginName })}</span>
					</DialogTitle>
					<DialogDescription>{t("insight_description")}</DialogDescription>
				</DialogHeader>

				{isLoading && (
					<div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl bg-surface p-6 text-center">
						<Loader2 className="size-7 animate-spin text-primary" />
						<p className="text-muted-foreground text-sm">
							{t("insight_loading")}
						</p>
					</div>
				)}

				{(isError || (data && !data.available)) && (
					<div className="rounded-2xl bg-surface p-6 text-center">
						<p className="text-muted-foreground text-sm">{t("unavailable")}</p>
						<Button
							variant="outline"
							className="mt-4"
							onClick={() => void refetch()}
						>
							{t("retry")}
						</Button>
					</div>
				)}

				{data?.available && (
					<div className="space-y-4">
						<div className="rounded-2xl bg-primary/[0.08] p-4">
							<div className="mb-3 flex flex-wrap items-center gap-2">
								<Badge
									className={cn(
										"border-transparent",
										verdictStyles[data.verdict],
									)}
								>
									{t(`insight_verdict_${data.verdict}`)}
								</Badge>
								<Badge variant="secondary" className="gap-1 bg-background/70">
									<Gauge className="size-3" />
									{t(`insight_setup_${data.setupComplexity}`)}
								</Badge>
							</div>
							<p className="text-sm leading-relaxed sm:text-base">
								{data.summary}
							</p>
						</div>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<section className="rounded-2xl bg-surface/80 p-4">
								<h3 className="mb-3 flex items-center gap-2 font-semibold text-sm">
									<CheckCircle2 className="size-4 text-success" />
									{t("insight_best_for")}
								</h3>
								<InsightList
									items={data.bestFor}
									icon={CheckCircle2}
									emptyText={t("insight_best_for_empty")}
								/>
							</section>
							<section className="rounded-2xl bg-surface/80 p-4">
								<h3 className="mb-3 flex items-center gap-2 font-semibold text-sm">
									<Wrench className="size-4 text-primary" />
									{t("insight_requirements")}
								</h3>
								<InsightList
									items={data.requirements}
									icon={Wrench}
									emptyText={t("insight_requirements_empty")}
								/>
							</section>
							<section className="rounded-2xl bg-surface/80 p-4">
								<h3 className="mb-3 flex items-center gap-2 font-semibold text-sm">
									<TriangleAlert className="size-4 text-warning" />
									{t("insight_caveats")}
								</h3>
								<InsightList
									items={data.caveats}
									icon={TriangleAlert}
									emptyText={t("insight_caveats_empty")}
								/>
							</section>
							<section className="rounded-2xl bg-surface/80 p-4">
								<h3 className="mb-3 flex items-center gap-2 font-semibold text-sm">
									<ShieldAlert className="size-4 text-primary" />
									{t("insight_privacy")}
								</h3>
								<Badge variant="secondary" className="mb-2 bg-background/70">
									{t(`insight_privacy_${data.privacy}`)}
								</Badge>
								<p className="text-muted-foreground text-sm leading-relaxed">
									{data.privacyReason}
								</p>
							</section>
						</div>
						<p className="text-muted-foreground text-xs leading-relaxed">
							{t("insight_disclaimer")}
						</p>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
