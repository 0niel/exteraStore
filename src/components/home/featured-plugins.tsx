import { Code, Download, Star } from "lucide-react";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { plugins as Plugin } from "~/server/db/schema";
import { api } from "~/trpc/react";

export function FeaturedPlugins() {
	const { data: featuredPlugins, isLoading } = api.plugins.getFeatured.useQuery(
		{ limit: 6 },
	);

	const { data: popularPlugins } = api.plugins.getPopular.useQuery(
		{ limit: 3 },
		{
			enabled: !isLoading && (!featuredPlugins || featuredPlugins.length === 0),
		},
	);

	const displayPlugins =
		featuredPlugins && featuredPlugins.length > 0
			? featuredPlugins
			: popularPlugins;

	const isShowingPopular = !featuredPlugins || featuredPlugins.length === 0;

	return (
		<section className="bg-muted/10 py-12 sm:py-16 md:py-20">
			<div className="container mx-auto px-4">
				<div className="mb-8 text-center sm:mb-12 md:mb-16">
					<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-medium text-primary text-sm">
						<Star className="h-4 w-4" />
						{isShowingPopular ? "Популярные" : "Рекомендуемые"}
					</div>
					<h2 className="mb-2 font-bold text-3xl sm:mb-4 sm:text-4xl md:text-5xl">
						{isShowingPopular ? "Популярные плагины" : "Рекомендуемые плагины"}
					</h2>
					<p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl">
						{isShowingPopular
							? "Самые популярные плагины среди пользователей"
							: "Лучшие плагины, отобранные нашей командой"}
					</p>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:grid-cols-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 rounded-xl bg-muted sm:h-12 sm:w-12" />
										<div>
											<div className="mb-1 h-4 w-24 rounded bg-muted" />
											<div className="h-3 w-16 rounded bg-muted" />
										</div>
									</div>
									<div className="h-6 w-12 rounded bg-muted" />
								</div>
								<div className="space-y-2">
									<div className="h-4 w-full rounded bg-muted" />
									<div className="h-3 w-4/5 rounded bg-muted" />
								</div>
								<div className="flex items-center justify-between">
									<div className="h-4 w-20 rounded bg-muted" />
									<div className="h-8 w-20 rounded bg-muted" />
								</div>
							</div>
						))}
					</div>
				) : displayPlugins && displayPlugins.length > 0 ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:grid-cols-3">
						{displayPlugins.map((plugin: typeof Plugin.$inferSelect) => (
							<div
								key={plugin.id}
								className="group hover:-translate-y-1 space-y-3 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-primary/5 hover:shadow-xl sm:space-y-4 sm:p-6"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 sm:h-12 sm:w-12">
											<Code className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
										</div>
										<div>
											<h3 className="line-clamp-1 font-semibold text-base sm:text-lg">
												{plugin.name}
											</h3>
											<p className="text-muted-foreground text-xs sm:text-sm">
												v{plugin.version}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 dark:bg-yellow-900/20">
										<Star className="h-3 w-3 fill-yellow-400 text-yellow-400 sm:h-4 sm:w-4" />
										<span className="font-medium text-xs sm:text-sm">
											{plugin.rating.toFixed(1)}
										</span>
									</div>
								</div>
								<div className="space-y-2">
									<p className="line-clamp-2 text-muted-foreground text-xs sm:line-clamp-3 sm:text-sm">
										{plugin.shortDescription || plugin.description}
									</p>
								</div>
								<div className="flex items-center justify-between pt-2">
									<div className="flex items-center gap-2 sm:gap-4">
										<div className="flex items-center gap-1 text-muted-foreground">
											<Download className="h-3 w-3 sm:h-4 sm:w-4" />
											<span className="font-medium text-xs sm:text-sm">
												{plugin.downloadCount}
											</span>
										</div>
										<Badge
											variant="secondary"
											className="px-1.5 py-0.5 text-xs sm:px-2 sm:py-1"
										>
											{plugin.category}
										</Badge>
									</div>
									<Button
										size="sm"
										asChild
										className="h-8 px-2 text-xs transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:px-3 sm:text-sm"
									>
										<Link href={`/plugins/${plugin.slug}`}>Подробнее</Link>
									</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="rounded-2xl border border-border/70 border-dashed bg-card/30 p-8 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
							<Star className="h-8 w-8 text-muted-foreground/70" />
						</div>
						<h3 className="mb-2 font-medium text-xl">Плагины скоро появятся</h3>
						<p className="mx-auto max-w-md text-muted-foreground text-sm">
							Мы работаем над добавлением рекомендованных плагинов. Пока можете
							посмотреть все доступные плагины.
						</p>
						<div className="mt-6">
							<Link href="/plugins">
								<Button className="bg-primary/90 hover:bg-primary">
									Смотреть все плагины
								</Button>
							</Link>
						</div>
					</div>
				)}

				{displayPlugins && displayPlugins.length > 0 && (
					<div className="mt-8 text-center sm:mt-10 md:mt-12">
						<Link
							href={
								isShowingPopular
									? "/plugins?sort=popular"
									: "/plugins?featured=true"
							}
						>
							<Button
								size="lg"
								variant="outline"
								className="border-2 px-6 py-2 text-base hover:bg-primary/5 sm:px-8 sm:py-4 sm:text-lg"
							>
								Смотреть все {isShowingPopular ? "популярные" : "рекомендуемые"}
							</Button>
						</Link>
					</div>
				)}
			</div>
		</section>
	);
}
