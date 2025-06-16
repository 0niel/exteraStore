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
	return (
		<section className="bg-muted/10 py-20">
			<div className="container mx-auto px-4">
				<div className="mb-16 text-center">
					<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-medium text-primary text-sm">
						<Star className="h-4 w-4" />
						Рекомендуемые
					</div>
					<h2 className="mb-4 font-bold text-4xl sm:text-5xl">
						Рекомендуемые плагины
					</h2>
					<p className="mx-auto max-w-2xl text-muted-foreground text-xl">
						Лучшие плагины, отобранные нашей командой
					</p>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="space-y-4 rounded-2xl border bg-card p-6">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="h-12 w-12 rounded-xl bg-muted" />
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
				) : featuredPlugins && featuredPlugins.length > 0 ? (
					<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						{featuredPlugins.map((plugin: typeof Plugin.$inferSelect) => (
							<div
								key={plugin.id}
								className="group hover:-translate-y-1 space-y-4 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-primary/5 hover:shadow-xl"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
											<Code className="h-6 w-6 text-primary" />
										</div>
										<div>
											<h3 className="font-semibold text-lg">{plugin.name}</h3>
											<p className="text-muted-foreground text-sm">
												v{plugin.version}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 dark:bg-yellow-900/20">
										<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
										<span className="font-medium text-sm">
											{plugin.rating.toFixed(1)}
										</span>
									</div>
								</div>
								<div className="space-y-2">
									<p className="line-clamp-3 text-muted-foreground text-sm">
										{plugin.shortDescription || plugin.description}
									</p>
								</div>
								<div className="flex items-center justify-between pt-2">
									<div className="flex items-center gap-4">
										<div className="flex items-center gap-1 text-muted-foreground">
											<Download className="h-4 w-4" />
											<span className="font-medium text-sm">
												{plugin.downloadCount}
											</span>
										</div>
										<Badge variant="secondary" className="text-xs">
											{plugin.category}
										</Badge>
									</div>
									<Button
										size="sm"
										asChild
										className="transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
									>
										<Link href={`/plugins/${plugin.slug}`}>Подробнее</Link>
									</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="py-12 text-center">
						<p className="text-muted-foreground">
							Рекомендуемые плагины не найдены
						</p>
					</div>
				)}

				<div className="mt-12 text-center">
					<Link href="/plugins?featured=true">
						<Button
							size="lg"
							variant="outline"
							className="border-2 px-8 py-4 text-lg hover:bg-primary/5"
						>
							Смотреть все рекомендуемые
						</Button>
					</Link>
				</div>
			</div>
		</section>
	);
}
