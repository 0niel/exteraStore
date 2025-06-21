import { ArrowRight, Download, Flame, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { plugins as Plugin } from "~/server/db/schema";
import { api } from "~/trpc/react";

function PopularPluginCard({
	plugin,
	rank,
}: { plugin: typeof Plugin.$inferSelect; rank: number }) {
	const { data: categories } = api.categories.getAll.useQuery();
	const { data: authorData } = api.users.getPublicProfile.useQuery(
		{ id: plugin.authorId || "" },
		{ enabled: !!plugin.authorId },
	);

	const categoryName =
		categories?.find((c) => c.slug === plugin.category)?.name ||
		plugin.category;

	return (
		<Link href={`/plugins/${plugin.slug}`} className="group block">
			<div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-6 transition-all duration-300 hover:border-primary/20 hover:bg-card/80 hover:shadow-lg">
				<div className="absolute top-4 right-4">
					<div
						className={cn(
							"flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm",
							rank === 1 && "bg-yellow-500/20 text-yellow-600",
							rank === 2 && "bg-gray-500/20 text-gray-600",
							rank === 3 && "bg-orange-500/20 text-orange-600",
							rank > 3 && "bg-muted text-muted-foreground",
						)}
					>
						{rank}
					</div>
				</div>

				<div className="space-y-4">
					<div className="flex items-start gap-4">
						<div
							className={cn(
								"flex h-12 w-12 items-center justify-center rounded-lg",
								plugin.category === "ui" &&
									"bg-purple-100 dark:bg-purple-900/20",
								plugin.category === "utility" &&
									"bg-blue-100 dark:bg-blue-900/20",
								plugin.category === "security" &&
									"bg-red-100 dark:bg-red-900/20",
								plugin.category === "automation" &&
									"bg-green-100 dark:bg-green-900/20",
								plugin.category === "development" &&
									"bg-indigo-100 dark:bg-indigo-900/20",
								![
									"ui",
									"utility",
									"security",
									"automation",
									"development",
								].includes(plugin.category) &&
									"bg-gray-100 dark:bg-gray-900/20",
							)}
						>
							<TrendingUp
								className={cn(
									"h-6 w-6",
									plugin.category === "ui" &&
										"text-purple-600 dark:text-purple-400",
									plugin.category === "utility" &&
										"text-blue-600 dark:text-blue-400",
									plugin.category === "security" &&
										"text-red-600 dark:text-red-400",
									plugin.category === "automation" &&
										"text-green-600 dark:text-green-400",
									plugin.category === "development" &&
										"text-indigo-600 dark:text-indigo-400",
									![
										"ui",
										"utility",
										"security",
										"automation",
										"development",
									].includes(plugin.category) &&
										"text-gray-600 dark:text-gray-400",
								)}
							/>
						</div>
						<div className="min-w-0 flex-1">
							<h3 className="font-semibold text-lg transition-colors group-hover:text-primary">
								{plugin.name}
							</h3>
							<p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
								{plugin.shortDescription || plugin.description}
							</p>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Avatar className="h-6 w-6">
								<AvatarImage src={authorData?.image || undefined} />
								<AvatarFallback className="text-xs">
									{plugin.author.slice(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<span className="text-muted-foreground text-sm">
								{plugin.author}
							</span>
						</div>
						<Badge variant="outline" className="text-xs">
							{categoryName}
						</Badge>
					</div>

					<div className="flex items-center justify-between border-t pt-2">
						<div className="flex items-center gap-4 text-sm">
							<div className="flex items-center gap-1 font-medium text-primary">
								<Download className="h-4 w-4" />
								<span>{plugin.downloadCount.toLocaleString()}</span>
							</div>
							<div className="flex items-center gap-1 text-muted-foreground">
								<span>⭐</span>
								<span>{plugin.rating.toFixed(1)}</span>
							</div>
						</div>
						{plugin.verified && (
							<Badge className="border-blue-500/20 bg-blue-500/10 text-blue-600 text-xs">
								Проверен
							</Badge>
						)}
					</div>
				</div>
			</div>
		</Link>
	);
}

export function PopularPlugins() {
	const { data: popularPlugins, isLoading } = api.plugins.getPopular.useQuery({
		limit: 6,
	});

	return (
		<section className="py-16 sm:py-24">
			<div className="container mx-auto px-4">
				<div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
					<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 font-medium text-orange-700 text-sm dark:bg-orange-900/20 dark:text-orange-400">
						<Flame className="h-4 w-4" />
						Популярные сейчас
					</div>
					<h2 className="mb-4 font-bold text-4xl tracking-tight sm:text-5xl md:text-6xl">
						Топ плагинов месяца
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
						Самые скачиваемые и высокооцененные плагины
					</p>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="animate-pulse">
								<div className="h-48 rounded-xl bg-muted" />
							</div>
						))}
					</div>
				) : popularPlugins && popularPlugins.length > 0 ? (
					<>
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
							{popularPlugins.map(
								(plugin: typeof Plugin.$inferSelect, index: number) => (
									<PopularPluginCard
										key={plugin.id}
										plugin={plugin}
										rank={index + 1}
									/>
								),
							)}
						</div>

						<div className="mt-12 text-center">
							<Link href="/plugins?sort=popular">
								<Button
									size="lg"
									variant="outline"
									className="group h-12 px-8 text-base"
								>
									Смотреть все популярные
									<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Button>
							</Link>
						</div>
					</>
				) : (
					<div className="mx-auto max-w-md text-center">
						<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
							<Flame className="h-10 w-10 text-muted-foreground" />
						</div>
						<h3 className="mb-3 font-semibold text-2xl">
							Скоро здесь появятся популярные плагины
						</h3>
						<p className="mb-6 text-muted-foreground">
							Пока пользователи только начинают скачивать плагины
						</p>
						<div className="flex flex-wrap justify-center gap-4">
							<Link href="/plugins">
								<Button size="lg">
									Смотреть все плагины
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</Link>
							<Link href="/upload">
								<Button size="lg" variant="outline">
									Загрузить плагин
								</Button>
							</Link>
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
