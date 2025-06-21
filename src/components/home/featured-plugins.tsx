import { ArrowRight, Sparkles, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { plugins as Plugin } from "~/server/db/schema";
import { api } from "~/trpc/react";

function FeaturedPluginCard({
	plugin,
	index,
}: { plugin: typeof Plugin.$inferSelect; index: number }) {
	const { data: categories } = api.categories.getAll.useQuery();
	const { data: authorData } = api.users.getPublicProfile.useQuery(
		{ id: plugin.authorId || "" },
		{ enabled: !!plugin.authorId },
	);

	const categoryName =
		categories?.find((c) => c.slug === plugin.category)?.name ||
		plugin.category;
	const screenshots = plugin.screenshots
		? (JSON.parse(plugin.screenshots) as string[])
		: [];

	const gradients = [
		"from-violet-600 to-indigo-600",
		"from-blue-600 to-cyan-600",
		"from-emerald-600 to-teal-600",
		"from-orange-600 to-red-600",
		"from-pink-600 to-rose-600",
		"from-amber-600 to-yellow-600",
	];

	const gradient = gradients[index % gradients.length];

	return (
		<Link href={`/plugins/${plugin.slug}`} className="group relative block">
			<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-[1px]">
				<div className="relative overflow-hidden rounded-2xl bg-background">
					{screenshots.length > 0 ? (
						<div className="relative aspect-[16/10] overflow-hidden">
							<img
								src={screenshots[0]}
								alt={plugin.name}
								className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
						</div>
					) : (
						<div
							className={cn(
								"relative aspect-[16/10] overflow-hidden bg-gradient-to-br",
								gradient,
							)}
						>
							<div className="absolute inset-0 bg-black/20" />
							<div className="absolute inset-0 flex items-center justify-center">
								<Sparkles className="h-20 w-20 text-white/20" />
							</div>
							<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
						</div>
					)}

					<div className="absolute right-0 bottom-0 left-0 p-6">
						<div className="flex items-start justify-between gap-4">
							<div className="flex-1">
								<div className="mb-2 flex items-center gap-2">
									<span className="rounded-full bg-white/10 px-3 py-1 text-white/80 text-xs backdrop-blur-sm">
										{categoryName}
									</span>
									{plugin.verified && (
										<span className="rounded-full bg-blue-500/20 px-3 py-1 text-blue-300 text-xs backdrop-blur-sm">
											Проверен
										</span>
									)}
								</div>
								<h3 className="mb-1 font-bold text-white text-xl">
									{plugin.name}
								</h3>
								<p className="line-clamp-2 text-sm text-white/70">
									{plugin.shortDescription || plugin.description}
								</p>
							</div>
							<div className="flex flex-col items-end gap-2">
								<div className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-3 py-1 backdrop-blur-sm">
									<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
									<span className="font-medium text-sm text-white">
										{plugin.rating.toFixed(1)}
									</span>
								</div>
								<span className="text-white/60 text-xs">
									{plugin.downloadCount.toLocaleString()} загрузок
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
}

export function FeaturedPlugins() {
	const { data: featuredPlugins, isLoading } = api.plugins.getFeatured.useQuery(
		{ limit: 6 },
	);

	const { data: popularPlugins } = api.plugins.getPopular.useQuery(
		{ limit: 6 },
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
		<section className="relative overflow-hidden py-16 sm:py-24">
			<div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
			<div className="container relative mx-auto px-4">
				<div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
					<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-medium text-primary text-sm">
						{isShowingPopular ? (
							<TrendingUp className="h-4 w-4" />
						) : (
							<Star className="h-4 w-4" />
						)}
						{isShowingPopular ? "Популярные плагины" : "Рекомендуемые плагины"}
					</div>
					<h2 className="mb-4 font-bold text-4xl tracking-tight sm:text-5xl md:text-6xl">
						{isShowingPopular ? "Самые популярные" : "Лучшие плагины"}
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
						{isShowingPopular
							? "Плагины, которые выбирают тысячи пользователей"
							: "Тщательно отобранные плагины высочайшего качества"}
					</p>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="animate-pulse">
								<div className="aspect-[16/10] rounded-2xl bg-muted" />
							</div>
						))}
					</div>
				) : displayPlugins && displayPlugins.length > 0 ? (
					<>
						<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{displayPlugins
								.slice(0, 6)
								.map((plugin: typeof Plugin.$inferSelect, index: number) => (
									<FeaturedPluginCard
										key={plugin.id}
										plugin={plugin}
										index={index}
									/>
								))}
						</div>

						<div className="mt-12 text-center">
							<Link
								href={
									isShowingPopular
										? "/plugins?sort=popular"
										: "/plugins?featured=true"
								}
							>
								<Button size="lg" className="group h-12 px-8 text-base">
									Смотреть все{" "}
									{isShowingPopular ? "популярные" : "рекомендуемые"}
									<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Button>
							</Link>
						</div>
					</>
				) : (
					<div className="mx-auto max-w-md text-center">
						<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
							<Sparkles className="h-10 w-10 text-muted-foreground" />
						</div>
						<h3 className="mb-3 font-semibold text-2xl">
							Плагины скоро появятся
						</h3>
						<p className="mb-6 text-muted-foreground">
							Мы работаем над добавлением лучших плагинов для вас
						</p>
						<Link href="/plugins">
							<Button size="lg">
								Смотреть все плагины
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</Link>
					</div>
				)}
			</div>
		</section>
	);
}
