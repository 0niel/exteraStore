"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface DiffExplainProps {
	pluginId: number;
	fromHash: string;
	toHash: string;
}

const changeStyles: Record<string, string> = {
	feature: "bg-primary/10 text-primary",
	fix: "bg-success/10 text-success",
	refactor: "bg-muted text-muted-foreground",
	risk: "bg-destructive/10 text-destructive",
};

export function DiffExplain({ pluginId, fromHash, toHash }: DiffExplainProps) {
	const t = useTranslations("AI");
	const rawLocale = useLocale();
	const locale = rawLocale === "en" ? ("en" as const) : ("ru" as const);
	const reduceMotion = useReducedMotion();
	const [requested, setRequested] = useState(false);

	const { data, isFetching, isError } = api.ai.explainDiff.useQuery(
		{ pluginId, fromHash, toHash, locale },
		{
			enabled: requested,
			staleTime: Number.POSITIVE_INFINITY,
			retry: false,
		},
	);

	const explanation = data?.available ? data : null;
	const unavailable = data?.available === false;

	return (
		<div className="space-y-3">
			{!explanation && !unavailable && (
				<Button
					variant="outline"
					className="press-scale min-h-11 gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10"
					onClick={() => setRequested(true)}
					disabled={isFetching}
				>
					{isFetching ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Sparkles className="h-4 w-4 text-primary" />
					)}
					{isFetching ? t("explain_loading") : t("explain_button")}
				</Button>
			)}

			{(isError || unavailable) && (
				<p className="text-muted-foreground text-sm">
					{unavailable ? t("unavailable") : t("explain_error")}
				</p>
			)}

			<AnimatePresence initial={false}>
				{explanation && (
					<motion.div
						initial={reduceMotion ? false : { opacity: 0, height: 0, y: 8 }}
						animate={{ opacity: 1, height: "auto", y: 0 }}
						exit={reduceMotion ? undefined : { opacity: 0, height: 0, y: -8 }}
						transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
						className="overflow-hidden"
					>
						<Card className="border-primary/25 bg-linear-to-br from-primary/10 via-card to-card">
							<CardContent className="space-y-4 p-4">
								<span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-xs">
									<Sparkles className="h-3.5 w-3.5" />
									{t("explain_chip")}
								</span>
								<p className="text-sm leading-relaxed">{explanation.summary}</p>
								{explanation.changes.length > 0 && (
									<ul className="space-y-2">
										{explanation.changes.map((change) => (
											<li
												key={`${change.type}-${change.description}`}
												className="flex items-start gap-2 text-sm"
											>
												<span
													className={cn(
														"mt-0.5 inline-flex shrink-0 rounded-full px-2 py-0.5 font-medium text-xs",
														changeStyles[change.type],
													)}
												>
													{t(`change_${change.type}`)}
												</span>
												<span>{change.description}</span>
											</li>
										))}
									</ul>
								)}
							</CardContent>
						</Card>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
