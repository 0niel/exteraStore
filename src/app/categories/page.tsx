"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	ArrowUpRight,
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
	Tag,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageHeader } from "~/components/page-header";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
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

function CategorySkeleton() {
	return (
		<div className="flex h-full flex-col justify-between rounded-2xl bg-card p-5">
			<div className="flex items-start justify-between">
				<Skeleton className="skeleton-shimmer h-10 w-14" />
				<Skeleton className="skeleton-shimmer h-11 w-11 rounded-xl" />
			</div>
			<div className="mt-6 space-y-2">
				<Skeleton className="skeleton-shimmer h-5 w-2/3" />
				<Skeleton className="skeleton-shimmer h-4 w-full" />
				<Skeleton className="skeleton-shimmer h-3 w-20" />
			</div>
		</div>
	);
}

export default function CategoriesPage() {
	const t = useTranslations("CategoriesPage");
	const reduceMotion = useReducedMotion();
	const {
		data: categories,
		isLoading,
		isError,
		refetch,
	} = api.categories.getAll.useQuery();

	return (
		<div className="bg-background">
			<div className="container relative isolate mx-auto px-4 py-8">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
				/>
				<PageHeader
					badge={t("badge")}
					title={t("title")}
					description={t("description")}
					icon={Tag}
				/>

				<div className="mb-8">
					<div className="mb-5 flex min-h-6 items-center justify-between gap-3">
						<span className="eyebrow">{t("section_all")}</span>
						{!isLoading && categories && categories.length > 0 && (
							<span className="font-mono text-muted-foreground text-xs tabular-nums">
								{String(categories.length).padStart(2, "0")}
							</span>
						)}
					</div>

					{isLoading ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<CategorySkeleton key={i} />
							))}
						</div>
					) : isError ? (
						<EmptyState
							icon="↻"
							title={t("load_error_title")}
							description={t("load_error_description")}
							actionLabel={t("retry")}
							onAction={() => void refetch()}
						/>
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{categories?.map((category, index) => {
								const IconComponent =
									iconMap[category.icon as keyof typeof iconMap] || Code;

								return (
									<motion.div
										key={category.id}
										initial={reduceMotion ? false : { opacity: 0, y: 24 }}
										whileInView={
											reduceMotion ? undefined : { opacity: 1, y: 0 }
										}
										viewport={{ once: true, margin: "-80px" }}
										transition={{
											duration: 0.5,
											delay: (index % 4) * 0.06,
											ease: [0.16, 1, 0.3, 1],
										}}
										className="h-full"
									>
										<Link
											href={`/categories/${category.slug}`}
											className="group tap-highlight-none block h-full"
										>
											<div className="card-lift relative flex h-full min-h-11 flex-col justify-between overflow-hidden rounded-2xl bg-card p-5">
												<div
													aria-hidden="true"
													className="pointer-events-none absolute inset-0 origin-left scale-x-0 bg-primary/5 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100"
												/>
												<div className="relative flex items-start justify-between">
													<span className="font-bold font-mono text-4xl text-muted-foreground/25 tabular-nums tracking-tight transition-colors duration-300 group-hover:text-primary">
														{String(index + 1).padStart(2, "0")}
													</span>
													<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
														<IconComponent className="h-5 w-5" />
													</div>
												</div>
												<div className="relative mt-6">
													<h3 className="font-bold text-lg leading-tight transition-colors group-hover:text-primary">
														{category.name}
													</h3>
													<p className="mt-1.5 line-clamp-2 text-muted-foreground text-sm leading-relaxed">
														{category.description || t("no_description")}
													</p>
													<p className="mt-4 flex items-center gap-1.5 font-medium font-mono text-muted-foreground text-xs uppercase tracking-wider">
														{t("plugin_count", {
															count: category.pluginCount,
														})}
														<ArrowUpRight className="h-3.5 w-3.5 text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
													</p>
												</div>
											</div>
										</Link>
									</motion.div>
								);
							})}
						</div>
					)}

					{!isLoading &&
						!isError &&
						(!categories || categories.length === 0) && (
							<EmptyState
								icon="#"
								title={t("empty_title")}
								description={t("empty_description")}
							/>
						)}
				</div>
			</div>
		</div>
	);
}
