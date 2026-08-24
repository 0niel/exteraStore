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
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { AiAuthRequired } from "~/components/ai/ai-auth-required";
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

	return (
		<Card className="group card-lift h-full gap-0 overflow-hidden bg-card py-0 sm:py-0">
			<div className="relative min-h-36 bg-primary/[0.07] p-5">
				<div className="dot-grid absolute inset-0 opacity-40" />
				<div className="relative flex h-full min-h-26 flex-col justify-between gap-6">
					<div className="flex min-w-0 items-start justify-between gap-2">
						<Badge
							variant="secondary"
							className="bg-primary/10 font-medium text-primary text-xs"
						>
							<Sparkles className="mr-1 h-3 w-3" />
							{t("collections.aiBadge")}
						</Badge>
						<div className="hidden shrink-0 items-center gap-1 font-mono text-muted-foreground text-xs sm:flex">
							<Calendar className="h-3 w-3" />
							<span>{formatDate(collection.generatedAt, locale)}</span>
						</div>
					</div>

					<div className="flex items-start gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
							<Icon className="h-4 w-4" />
						</div>
						<div className="min-w-0 flex-1">
							<h3 className="line-clamp-2 font-bold text-lg leading-tight">
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

			<CardContent className="flex flex-1 flex-col p-5">
				<p className="mb-4 line-clamp-2 min-h-11 text-muted-foreground text-sm leading-relaxed">
					{collection.description}
				</p>

				<div className="mb-5 space-y-2">
					{collection.plugins.slice(0, 2).map((plugin: Plugin) => (
						<Link
							key={plugin.id}
							href={`/plugins/${plugin.slug}`}
							className="block rounded-xl bg-surface/80 p-3 transition-colors hover:bg-primary/10"
						>
							<div className="flex items-center gap-3">
								<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<Sparkles className="h-3 w-3" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-sm">{plugin.name}</p>
									<p className="line-clamp-1 text-muted-foreground text-xs">
										{plugin.shortDescription || plugin.description}
									</p>
								</div>
								<div className="flex items-center gap-1 text-muted-foreground text-xs">
									<Star className="h-3 w-3 fill-warning text-warning" />
									<span>
										{plugin.ratingCount > 0 ? plugin.rating.toFixed(1) : "—"}
									</span>
								</div>
							</div>
						</Link>
					))}
				</div>

				<Button
					variant="secondary"
					size="sm"
					className="group/link mt-auto w-full"
					asChild
				>
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
	const { status } = useSession();
	const { data: collections, isLoading } =
		api.aiCollections.getAICollections.useQuery(
			{
				limit: 3,
			},
			{ enabled: status === "authenticated" },
		);

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

	if (status === "loading") {
		return (
			<section className="section-band py-16 sm:py-24">
				<div className="container mx-auto px-4">
					<Skeleton className="h-56 w-full rounded-3xl" />
				</div>
			</section>
		);
	}

	if (status === "unauthenticated") {
		return (
			<section className="section-band py-16 sm:py-24">
				<div className="container mx-auto px-4">
					<AiAuthRequired compact />
				</div>
			</section>
		);
	}

	return (
		<section
			className="section-band relative overflow-hidden py-16 sm:py-24"
			aria-labelledby="collections-title"
		>
			<div className="container relative mx-auto px-4">
				<motion.div
					initial={reduceMotion ? false : { opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
					className="mb-10 sm:mb-12"
				>
					<div className="mb-4 flex items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<span className="eyebrow">{t("collections.eyebrow")}</span>
							<span className="font-mono font-semibold text-primary text-xs">
								02
							</span>
						</div>
						<Button
							variant="ghost"
							asChild
							className="group hidden sm:inline-flex"
						>
							<Link href="/collections">
								{t("collections.viewAll")}
								<ArrowRight className="transition-transform group-hover:translate-x-1" />
							</Link>
						</Button>
					</div>
					<h2
						id="collections-title"
						className="max-w-3xl text-balance font-bold text-3xl tracking-tight sm:text-4xl"
					>
						{t("collections.title")}
					</h2>
					<p className="mt-2 max-w-2xl text-muted-foreground">
						{t("collections.description")}
					</p>
					<Button variant="secondary" asChild className="mt-5 w-full sm:hidden">
						<Link href="/collections">
							{t("collections.viewAll")}
							<ArrowRight />
						</Link>
					</Button>
				</motion.div>

				{isLoading ? (
					<div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Card
								key={i}
								className="w-full min-w-0 gap-0 overflow-hidden bg-card/50 py-0 sm:py-0"
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
						className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
					>
						{collections.map((collection: AICollection, index: number) => (
							<motion.div
								key={collection.id}
								variants={item}
								className="min-w-0 max-w-full"
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
