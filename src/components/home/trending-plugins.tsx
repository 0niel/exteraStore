"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { plugins } from "~/server/db/schema";
import { api } from "~/trpc/react";
import { PluginCard } from "../plugin-card";

type Plugin = typeof plugins.$inferSelect;

export function TrendingPlugins() {
	const t = useTranslations("Home");
	const reduceMotion = useReducedMotion();
	const { data: trending, isLoading } = api.plugins.getTrending.useQuery({
		limit: 4,
	});

	const container = {
		hidden: {},
		show: {
			transition: { staggerChildren: reduceMotion ? 0 : 0.07 },
		},
	};
	const item = {
		hidden: reduceMotion ? {} : { opacity: 0, y: 18 },
		show: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
		},
	};

	return (
		<section className="py-16 sm:py-24" aria-labelledby="trending-title">
			<div className="container mx-auto px-4">
				<motion.div
					initial={reduceMotion ? false : { opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
					className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
				>
					<div>
						<div className="mb-3 flex items-center gap-3">
							<span className="eyebrow">{t("trending.eyebrow")}</span>
							<span className="font-mono font-semibold text-primary text-xs">
								03
							</span>
						</div>
						<h2
							id="trending-title"
							className="font-bold text-3xl tracking-tight sm:text-4xl"
						>
							{t("trending.title")}
						</h2>
						<p className="mt-2 max-w-2xl text-muted-foreground">
							{t("trending.description")}
						</p>
					</div>
					<Button
						asChild
						variant="ghost"
						className="group self-start sm:self-auto"
					>
						<Link href="/plugins?sort=popular">
							{t("trending.viewAll")}
							<ArrowRight className="transition-transform group-hover:translate-x-1" />
						</Link>
					</Button>
				</motion.div>

				{isLoading ? (
					<div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton
								key={i}
								className="h-28 w-[min(86vw,23rem)] shrink-0 snap-center rounded-2xl md:w-full md:shrink md:snap-start"
							/>
						))}
					</div>
				) : trending && trending.length > 0 ? (
					<motion.div
						variants={container}
						initial="hidden"
						whileInView="show"
						viewport={{ once: true, margin: "-80px" }}
						className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0"
					>
						{trending.map((plugin: Plugin) => (
							<motion.div
								key={plugin.id}
								variants={item}
								className="w-[min(86vw,23rem)] shrink-0 snap-center md:w-auto md:shrink md:snap-start"
							>
								<PluginCard plugin={plugin} compact />
							</motion.div>
						))}
					</motion.div>
				) : null}
			</div>
		</section>
	);
}
