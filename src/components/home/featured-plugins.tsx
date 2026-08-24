"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PluginCard } from "~/components/plugin-card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { plugins as Plugin } from "~/server/db/schema";
import { api } from "~/trpc/react";

export function FeaturedPlugins() {
	const t = useTranslations("Home");
	const reduceMotion = useReducedMotion();
	const { data: featuredPlugins, isLoading } = api.plugins.getFeatured.useQuery(
		{ limit: 3 },
	);

	if (!isLoading && (!featuredPlugins || featuredPlugins.length === 0)) {
		return null;
	}

	const container = {
		hidden: {},
		show: {
			transition: { staggerChildren: reduceMotion ? 0 : 0.08 },
		},
	};
	const item = {
		hidden: reduceMotion ? {} : { opacity: 0, y: 20 },
		show: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
		},
	};

	return (
		<section className="py-16 sm:py-24" aria-labelledby="featured-title">
			<div className="container mx-auto px-4">
				<motion.div
					initial={reduceMotion ? false : { opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
					className="mb-8 flex items-end justify-between gap-4"
				>
					<div>
						<div className="mb-3 flex items-center gap-3">
							<span className="eyebrow">{t("featured.eyebrow")}</span>
							<span className="font-mono font-semibold text-primary text-xs">
								01
							</span>
						</div>
						<h2
							id="featured-title"
							className="text-balance font-bold text-3xl tracking-tight sm:text-4xl"
						>
							{t("featured.title")}
						</h2>
						<p className="mt-2 max-w-2xl text-muted-foreground">
							{t("featured.description")}
						</p>
					</div>
					<Button
						asChild
						variant="ghost"
						className="group hidden sm:inline-flex"
					>
						<Link href="/plugins?featured=true">
							{t("featured.viewAll")}
							<ArrowRight className="transition-transform group-hover:translate-x-1" />
						</Link>
					</Button>
				</motion.div>

				{isLoading ? (
					<div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-104 w-full min-w-0 rounded-2xl" />
						))}
					</div>
				) : (
					<motion.div
						variants={container}
						initial="hidden"
						whileInView="show"
						viewport={{ once: true, margin: "-80px" }}
						className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
					>
						{featuredPlugins?.map((plugin: typeof Plugin.$inferSelect) => (
							<motion.div
								key={plugin.id}
								variants={item}
								className="min-w-0 max-w-full"
							>
								<PluginCard plugin={plugin} />
							</motion.div>
						))}
					</motion.div>
				)}
				<Button
					asChild
					variant="outline"
					className="group mt-6 w-full sm:hidden"
				>
					<Link href="/plugins?featured=true">
						{t("featured.viewAll")}
						<ArrowRight className="transition-transform group-hover:translate-x-1" />
					</Link>
				</Button>
			</div>
		</section>
	);
}
