import { Bot, Code, Download, Shield, Star, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import type { plugins as Plugin } from "~/server/db/schema";
import { api } from "~/trpc/react";

export function PopularPlugins() {
	const { data: popularPlugins, isLoading } = api.plugins.getPopular.useQuery({
		limit: 6,
	});
	const icons = [Bot, Shield, Zap, Code, Download, Star];

	return (
		<section className="py-12 sm:py-16 md:py-20">
			<div className="container mx-auto px-4">
				<div className="mb-8 text-center sm:mb-12 md:mb-16">
					<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 font-medium text-green-700 text-sm dark:bg-green-900/20 dark:text-green-400">
						<Zap className="h-4 w-4" />
						Популярные
					</div>
					<h2 className="mb-2 font-bold text-3xl sm:mb-4 sm:text-4xl md:text-5xl">
						Популярные плагины
					</h2>
					<p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl">
						Самые скачиваемые плагины этого месяца
					</p>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:grid-cols-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6"
							>
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-xl bg-muted sm:h-12 sm:w-12" />
									<div className="flex-1">
										<div className="mb-1 h-4 w-32 rounded bg-muted" />
										<div className="h-3 w-20 rounded bg-muted" />
									</div>
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
				) : popularPlugins && popularPlugins.length > 0 ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:grid-cols-3">
						{popularPlugins.map(
							(plugin: typeof Plugin.$inferSelect, i: number) => {
								const IconComponent = icons[i % icons.length];
								return (
									<div
										key={plugin.id}
										className="group hover:-translate-y-1 relative space-y-3 overflow-hidden rounded-2xl border border-border/50 bg-card p-4 transition-all duration-300 hover:border-green-500/20 hover:shadow-green-500/5 hover:shadow-xl sm:space-y-4 sm:p-6"
									>
										<div className="absolute top-2 right-2 sm:top-4 sm:right-4">
											<div className="rounded-full bg-green-100 px-1.5 py-0.5 font-bold text-green-700 text-xs sm:px-2 sm:py-1 dark:bg-green-900/20 dark:text-green-400">
												#{i + 1}
											</div>
										</div>

										<div className="flex items-center gap-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 sm:h-12 sm:w-12">
												{IconComponent && (
													<IconComponent className="h-5 w-5 text-green-600 sm:h-6 sm:w-6" />
												)}
											</div>
											<div className="flex-1 pr-6">
												<h3 className="line-clamp-1 font-semibold text-base sm:text-lg">
													{plugin.name}
												</h3>
												<p className="text-muted-foreground text-xs sm:text-sm">
													v{plugin.version}
												</p>
											</div>
										</div>

										<div className="space-y-2">
											<p className="line-clamp-2 text-muted-foreground text-xs sm:line-clamp-3 sm:text-sm">
												{plugin.shortDescription || plugin.description}
											</p>
										</div>

										<div className="flex items-center justify-between pt-2">
											<div className="flex items-center gap-2 sm:gap-4">
												<div className="flex items-center gap-1 font-medium text-green-600">
													<Download className="h-3 w-3 sm:h-4 sm:w-4" />
													<span className="text-xs sm:text-sm">
														{plugin.downloadCount}
													</span>
												</div>
												<div className="flex items-center gap-1 text-muted-foreground">
													<Star className="h-3 w-3 fill-yellow-400 text-yellow-400 sm:h-4 sm:w-4" />
													<span className="text-xs sm:text-sm">
														{plugin.rating.toFixed(1)}
													</span>
												</div>
											</div>
											<Button
												size="sm"
												asChild
												className="h-8 px-2 text-xs transition-colors group-hover:bg-green-600 group-hover:text-white sm:px-3 sm:text-sm"
											>
												<Link href={`/plugins/${plugin.slug}`}>Подробнее</Link>
											</Button>
										</div>
									</div>
								);
							},
						)}
					</div>
				) : (
					<div className="rounded-2xl border border-border/70 border-dashed bg-card/30 p-8 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
							<Zap className="h-8 w-8 text-muted-foreground/70" />
						</div>
						<h3 className="mb-2 font-medium text-xl">
							Скоро здесь появятся популярные плагины
						</h3>
						<p className="mx-auto max-w-md text-muted-foreground text-sm">
							Пока пользователи только начинают скачивать плагины. Посмотрите
							все доступные плагины или загрузите свой.
						</p>
						<div className="mt-6 flex flex-wrap justify-center gap-4">
							<Link href="/plugins">
								<Button className="bg-green-600 text-white hover:bg-green-700">
									Смотреть все плагины
								</Button>
							</Link>
							<Link href="/upload">
								<Button
									variant="outline"
									className="border-green-500/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10"
								>
									Загрузить плагин
								</Button>
							</Link>
						</div>
					</div>
				)}

				{popularPlugins && popularPlugins.length > 0 && (
					<div className="mt-8 text-center sm:mt-10 md:mt-12">
						<Link href="/plugins?sort=popular">
							<Button
								size="lg"
								variant="outline"
								className="border-2 px-6 py-2 text-base hover:bg-green-50 sm:px-8 sm:py-4 sm:text-lg dark:hover:bg-green-900/10"
							>
								Смотреть все популярные
							</Button>
						</Link>
					</div>
				)}
			</div>
		</section>
	);
}
