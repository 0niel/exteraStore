import { Bot, Code, Download, Shield, Star, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { type plugins as Plugin } from "~/server/db/schema";
import { api } from "~/trpc/react";

export function PopularPlugins() {
	const { data: popularPlugins, isLoading } = api.plugins.getPopular.useQuery({
		limit: 6,
	});
	const icons = [Bot, Shield, Zap, Code, Download, Star];

	return (
		<section className="py-20">
			<div className="container mx-auto px-4">
				<div className="mb-16 text-center">
					<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 font-medium text-green-700 text-sm dark:bg-green-900/20 dark:text-green-400">
						<Zap className="h-4 w-4" />
						Популярные
					</div>
					<h2 className="mb-4 font-bold text-4xl sm:text-5xl">
						Популярные плагины
					</h2>
					<p className="mx-auto max-w-2xl text-muted-foreground text-xl">
						Самые скачиваемые плагины этого месяца
					</p>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="space-y-4 rounded-2xl border bg-card p-6">
								<div className="flex items-center gap-3">
									<div className="h-12 w-12 rounded-xl bg-muted" />
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
					<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						{popularPlugins.map((plugin: typeof Plugin.$inferSelect, i: number) => {
							const IconComponent = icons[i % icons.length];
							return (
								<div
									key={plugin.id}
									className="group hover:-translate-y-1 relative space-y-4 overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-green-500/20 hover:shadow-green-500/5 hover:shadow-xl"
								>
									<div className="absolute top-4 right-4">
										<div className="rounded-full bg-green-100 px-2 py-1 font-bold text-green-700 text-xs dark:bg-green-900/20 dark:text-green-400">
											#{i + 1}
										</div>
									</div>

									<div className="flex items-center gap-3">
										<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
											{IconComponent && (
												<IconComponent className="h-6 w-6 text-green-600" />
											)}
										</div>
										<div className="flex-1">
											<h3 className="font-semibold text-lg">{plugin.name}</h3>
											<p className="text-muted-foreground text-sm">
												v{plugin.version}
											</p>
										</div>
									</div>

									<div className="space-y-2">
										<p className="line-clamp-3 text-muted-foreground text-sm">
											{plugin.shortDescription || plugin.description}
										</p>
									</div>

									<div className="flex items-center justify-between pt-2">
										<div className="flex items-center gap-4">
											<div className="flex items-center gap-1 font-medium text-green-600">
												<Download className="h-4 w-4" />
												<span className="text-sm">{plugin.downloadCount}</span>
											</div>
											<div className="flex items-center gap-1 text-muted-foreground">
												<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
												<span className="text-sm">
													{plugin.rating.toFixed(1)}
												</span>
											</div>
										</div>
										<Button
											size="sm"
											asChild
											className="transition-colors group-hover:bg-green-600 group-hover:text-white"
										>
											<Link href={`/plugins/${plugin.slug}`}>Подробнее</Link>
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="py-12 text-center">
						<p className="text-muted-foreground">
							Популярные плагины не найдены
						</p>
					</div>
				)}

				<div className="mt-12 text-center">
					<Link href="/plugins?sort=popular">
						<Button
							size="lg"
							variant="outline"
							className="border-2 px-8 py-4 text-lg hover:bg-green-50 dark:hover:bg-green-900/10"
						>
							Смотреть все популярные
						</Button>
					</Link>
				</div>
			</div>
		</section>
	);
}
