"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	ArrowLeft,
	Camera,
	Code,
	FileText,
	Globe,
	Heart,
	MessageSquare,
	Music,
	Palette,
	Settings,
	Shield,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PluginCard } from "~/components/plugin-card";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import type { plugins as Plugin } from "~/server/db/schema";
import { api } from "~/trpc/react";

const iconMap = {
	code: Code,
	palette: Palette,
	shield: Shield,
	zap: Zap,
	"message-square": MessageSquare,
	settings: Settings,
	globe: Globe,
	music: Music,
	camera: Camera,
	"file-text": FileText,
	users: Users,
	heart: Heart,
} as const;

function CategoryHeaderSkeleton() {
	return (
		<div className="border-b bg-surface py-16">
			<div className="container mx-auto px-4">
				<div className="mb-6 flex items-center gap-4">
					<Skeleton className="skeleton-shimmer h-16 w-16 rounded-2xl" />
					<div className="space-y-2">
						<Skeleton className="skeleton-shimmer h-8 w-48" />
						<Skeleton className="skeleton-shimmer h-4 w-32" />
					</div>
				</div>
				<Skeleton className="skeleton-shimmer h-6 w-full max-w-2xl" />
			</div>
		</div>
	);
}

function PluginSkeleton() {
	return (
		<Card className="h-full">
			<CardHeader>
				<div className="flex items-center gap-3">
					<Skeleton className="skeleton-shimmer h-12 w-12 rounded-lg" />
					<div className="flex-1 space-y-2">
						<Skeleton className="skeleton-shimmer h-5 w-3/4" />
						<Skeleton className="skeleton-shimmer h-4 w-1/2" />
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<Skeleton className="skeleton-shimmer mb-2 h-4 w-full" />
				<Skeleton className="skeleton-shimmer mb-4 h-4 w-2/3" />
				<div className="flex items-center justify-between">
					<Skeleton className="skeleton-shimmer h-6 w-20" />
					<Skeleton className="skeleton-shimmer h-8 w-24" />
				</div>
			</CardContent>
		</Card>
	);
}

export default function CategoryPage() {
	const t = useTranslations("CategoriesPage");
	const reduceMotion = useReducedMotion();
	const params = useParams();
	const slug = params.slug as string;

	const { data: category, isLoading } = api.categories.getBySlug.useQuery({
		slug,
	});

	if (isLoading) {
		return (
			<div className="bg-background">
				<CategoryHeaderSkeleton />
				<section className="py-16">
					<div className="container mx-auto px-4">
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 6 }).map((_, i) => (
								<PluginSkeleton key={i} />
							))}
						</div>
					</div>
				</section>
			</div>
		);
	}

	if (!category) {
		return (
			<div className="flex min-h-[60dvh] items-center justify-center bg-background">
				<div className="animate-fade-up px-4 text-center">
					<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<Code className="h-10 w-10" />
					</div>
					<h1 className="mb-2 font-bold text-2xl text-foreground">
						{t("not_found_title")}
					</h1>
					<p className="mb-6 text-muted-foreground">
						{t("not_found_description")}
					</p>
					<Link href="/categories">
						<Button className="min-h-11">
							<ArrowLeft className="mr-2 h-4 w-4" />
							{t("back_to_categories")}
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	const IconComponent = iconMap[category.icon as keyof typeof iconMap] || Code;

	return (
		<div className="bg-background">
			<section className="relative isolate overflow-hidden border-b bg-surface py-12 md:py-16">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute -top-24 right-[8%] -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
				/>
				<div className="dot-grid absolute inset-x-0 top-0 -z-10 h-56" />
				<div className="container mx-auto px-4">
					<div className="mb-6 flex items-center gap-2">
						<Link href="/categories">
							<Button variant="ghost" size="sm" className="min-h-11">
								<ArrowLeft className="mr-2 h-4 w-4" />
								{t("back_to_categories")}
							</Button>
						</Link>
					</div>

					<span className="eyebrow mb-4 animate-fade-up">{t("badge")}</span>

					<div className="mt-4 mb-6 flex animate-fade-up items-center gap-5 md:gap-6">
						<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
							<IconComponent className="h-8 w-8" />
						</div>
						<div>
							<h1 className="mb-2 font-bold text-4xl text-foreground tracking-tight md:text-5xl">
								{category.name}
							</h1>
							<span className="inline-flex min-h-6 items-center rounded-full bg-primary/10 px-3 py-1 font-medium font-mono text-primary text-xs uppercase tracking-wider">
								{t("plugin_count", { count: category.plugins.length })}
							</span>
						</div>
					</div>

					{category.description && (
						<p className="max-w-2xl animate-fade-up text-balance text-muted-foreground text-xl">
							{category.description}
						</p>
					)}
				</div>
			</section>

			<section className="py-12 md:py-16">
				<div className="container mx-auto px-4">
					{category.plugins.length > 0 ? (
						<>
							<div className="mb-8 flex items-end justify-between gap-3">
								<div>
									<span className="eyebrow">
										{t("plugin_count", { count: category.plugins.length })}
									</span>
									<h2 className="mt-2 font-bold text-2xl text-foreground">
										{t("plugins_in_category")}
									</h2>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
								{category.plugins.map(
									(plugin: typeof Plugin.$inferSelect, index: number) => (
										<motion.div
											key={plugin.id}
											initial={reduceMotion ? false : { opacity: 0, y: 24 }}
											whileInView={
												reduceMotion ? undefined : { opacity: 1, y: 0 }
											}
											viewport={{ once: true, margin: "-80px" }}
											transition={{
												duration: 0.5,
												delay: (index % 3) * 0.06,
												ease: [0.16, 1, 0.3, 1],
											}}
											className="h-full"
										>
											<PluginCard plugin={plugin} />
										</motion.div>
									),
								)}
							</div>
						</>
					) : (
						<div className="animate-fade-up py-12 text-center md:py-16">
							<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
								<IconComponent className="h-10 w-10" />
							</div>
							<h3 className="mb-2 font-semibold text-foreground text-xl">
								{t("empty_category_title")}
							</h3>
							<p className="mx-auto mb-6 max-w-md text-muted-foreground">
								{t("empty_category_description")}
							</p>
							<div className="flex flex-wrap justify-center gap-3">
								<Link href="/upload">
									<Button className="press-scale min-h-11">
										{t("upload_plugin")}
									</Button>
								</Link>
								<Link href="/categories">
									<Button variant="outline" className="press-scale min-h-11">
										{t("other_categories")}
									</Button>
								</Link>
							</div>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
