"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	ArrowRight,
	Calendar,
	Gem,
	Heart,
	Rocket,
	Sparkles,
	Star,
	Users,
	Wrench,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { formatDate } from "~/lib/utils";
import type { aiPluginCollections, plugins } from "~/server/db/schema";
import { api } from "~/trpc/react";

type Plugin = typeof plugins.$inferSelect;
type AICollection = typeof aiPluginCollections.$inferSelect & {
	plugins: Plugin[];
};

const collectionIcons = [Wrench, Rocket, Users, Heart, Gem, Zap] as const;

function CollectionPreview({
	collection,
	index,
}: {
	collection: AICollection;
	index: number;
}) {
	const t = useTranslations("Home");
	const locale = useLocale();
	const Icon = collectionIcons[index % collectionIcons.length] ?? Sparkles;
	const contrastAccent = index % 2 === 1;

	return (
		<Card className="group card-lift h-full overflow-hidden border bg-card">
			<div className="relative h-24 border-b">
				<div className="flex h-full flex-col justify-between p-4">
					<div className="flex items-start justify-between">
						<Badge variant="secondary" className="font-medium text-xs">
							<Sparkles className="mr-1 h-3 w-3" />
							{t("collections.aiBadge")}
						</Badge>
						<div className="flex items-center gap-1 text-muted-foreground text-xs">
							<Calendar className="h-3 w-3" />
							<span>{formatDate(collection.generatedAt, locale)}</span>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div
							className={`flex h-8 w-8 items-center justify-center rounded-lg ${
								contrastAccent
									? "bg-contrast text-contrast-foreground"
									: "bg-primary/10 text-primary"
							}`}
						>
							<Icon className="h-4 w-4" />
						</div>
						<div className="min-w-0 flex-1">
							<h3 className="truncate font-bold text-lg leading-tight">
								{collection.name}
							</h3>
							<div className="text-muted-foreground text-sm">
								{t("collections.pluginsCount", {
									count: collection.plugins.length,
								})}
							</div>
						</div>
					</div>
				</div>
			</div>

			<CardContent className="p-5">
				<p className="mb-4 line-clamp-2 text-muted-foreground text-sm leading-relaxed">
					{collection.description}
				</p>

				<div className="mb-5 space-y-3">
					{collection.plugins.slice(0, 2).map((plugin: Plugin) => (
						<Link
							key={plugin.id}
							href={`/plugins/${plugin.slug}`}
							className="block rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
						>
							<div className="flex items-center gap-3">
								<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10">
									<Sparkles className="h-3 w-3 text-primary" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-sm">{plugin.name}</p>
									<p className="line-clamp-1 text-muted-foreground text-xs">
										{plugin.shortDescription || plugin.description}
									</p>
								</div>
								<div className="flex items-center gap-1 text-muted-foreground text-xs">
									<Star className="h-3 w-3 fill-warning text-warning" />
									<span>{plugin.rating.toFixed(1)}</span>
								</div>
							</div>
						</Link>
					))}
				</div>

				<Button variant="ghost" size="sm" className="group/link w-full" asChild>
					<Link href={`/collections/${collection.id}`}>
						<span>
							{t("collections.viewCollection", {
								count: collection.plugins.length,
							})}
						</span>
						<ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover/link:translate-x-1" />
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}

export function AiCollections() {
	const t = useTranslations("Home");
	const reduceMotion = useReducedMotion();
	const { data: collections, isLoading } =
		api.aiCollections.getAICollections.useQuery({
			limit: 3,
		});

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
		<section className="py-16 sm:py-24" aria-labelledby="collections-title">
			<div className="container mx-auto px-4">
				<motion.div
					initial={reduceMotion ? false : { opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
					className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
				>
					<div>
						<div className="mb-2 inline-flex items-center gap-2 font-medium text-primary text-sm">
							<span className="size-1.5 rounded-full bg-primary" />
							<span className="font-mono text-muted-foreground text-xs">
								03
							</span>
							{t("collections.eyebrow")}
						</div>
						<h2
							id="collections-title"
							className="font-bold text-3xl tracking-tight sm:text-4xl"
						>
							{t("collections.title")}
						</h2>
						<p className="mt-2 max-w-2xl text-muted-foreground">
							{t("collections.description")}
						</p>
					</div>
					<Button variant="outline" asChild className="group">
						<Link href="/collections">
							{t("collections.viewAll")}
							<ArrowRight className="transition-transform group-hover:translate-x-1" />
						</Link>
					</Button>
				</motion.div>

				{isLoading ? (
					<div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Card
								key={i}
								className="w-[80vw] shrink-0 snap-start overflow-hidden border bg-card/50 md:w-auto md:shrink"
							>
								<Skeleton className="h-24 w-full" />
								<div className="space-y-3 p-4">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-full" />
									<Skeleton className="h-3 w-2/3" />
									<div className="space-y-2">
										<Skeleton className="h-12 w-full" />
										<Skeleton className="h-12 w-full" />
									</div>
									<Skeleton className="h-8 w-full" />
								</div>
							</Card>
						))}
					</div>
				) : collections && collections.length > 0 ? (
					<motion.div
						variants={container}
						initial="hidden"
						whileInView="show"
						viewport={{ once: true, margin: "-80px" }}
						className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3"
					>
						{collections.map((collection: AICollection, index: number) => (
							<motion.div
								key={collection.id}
								variants={item}
								className="w-[80vw] shrink-0 snap-start md:w-auto md:shrink"
							>
								<CollectionPreview collection={collection} index={index} />
							</motion.div>
						))}
					</motion.div>
				) : (
					<div className="py-16 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
							<Sparkles className="h-7 w-7" />
						</div>
						<h3 className="mb-2 font-semibold text-xl">
							{t("collections.emptyTitle")}
						</h3>
						<p className="text-muted-foreground">
							{t("collections.emptyDescription")}
						</p>
					</div>
				)}
			</div>
		</section>
	);
}
