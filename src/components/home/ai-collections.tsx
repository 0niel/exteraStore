"use client";

import { ArrowRight, Calendar, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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

const collectionIcons = {
	"Полезные инструменты": "🛠️",
	"Удиви друзей": "✨",
	"Для продуктивности": "📈",
	"Социальные фишки": "👥",
	"Любимчики сообщества": "❤️",
	"Скрытые жемчужины": "💎",
} as const;

function CollectionPreview({ collection }: { collection: AICollection }) {
	const emoji =
		collectionIcons[collection.name as keyof typeof collectionIcons] || "🔮";

	return (
		<Card className="group overflow-hidden border bg-card transition-shadow duration-200 hover:shadow-md">
			<div className="relative">
				<div className="relative h-24 border-b">
					<div className="flex h-full flex-col justify-between p-4">
						<div className="flex items-start justify-between">
							<Badge variant="secondary" className="font-medium text-xs">
								<Sparkles className="mr-1 h-3 w-3" />
								ИИ подборка
							</Badge>
							<div className="flex items-center gap-1 text-muted-foreground text-xs">
								<Calendar className="h-3 w-3" />
								<span>{formatDate(collection.generatedAt)}</span>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
								<span className="text-lg">{emoji}</span>
							</div>
							<div className="min-w-0 flex-1">
								<h3 className="truncate font-bold text-lg leading-tight">
									{collection.name}
								</h3>
								<div className="flex items-center gap-1 text-muted-foreground text-sm">
									<span>{collection.plugins.length} плагинов</span>
								</div>
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
									<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
									<span>{plugin.rating.toFixed(1)}</span>
								</div>
							</div>
						</Link>
					))}
				</div>

				<Button variant="ghost" size="sm" className="w-full" asChild>
					<Link href={`/collections/${collection.id}`}>
						<span>Смотреть все {collection.plugins.length} плагинов</span>
						<ArrowRight className="ml-1 h-3 w-3" />
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}

export function AiCollections() {
	const t = useTranslations("Home");
	const { data: collections, isLoading } =
		api.aiCollections.getAICollections.useQuery({
			limit: 3,
		});

	return (
		<section className="py-12 sm:py-16" aria-labelledby="collections-title">
			<div className="container mx-auto px-4">
				<div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
					<div>
						<div className="mb-2 inline-flex items-center gap-2 font-medium text-primary text-sm">
							<Sparkles className="h-4 w-4" />
							{t("aiCollections")}
						</div>
						<h2
							id="collections-title"
							className="font-bold text-3xl tracking-tight sm:text-4xl"
						>
							Плагины под вашу задачу
						</h2>
						<p className="mt-2 max-w-2xl text-muted-foreground">
							Готовые тематические наборы на основе рейтингов и описаний.
						</p>
					</div>
					<Button variant="outline" asChild>
						<Link href="/collections">
							Все подборки
							<ArrowRight />
						</Link>
					</Button>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Card
								key={i}
								className="overflow-hidden border bg-card/50 backdrop-blur-sm"
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
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{collections.map((collection: AICollection) => (
							<CollectionPreview key={collection.id} collection={collection} />
						))}
					</div>
				) : (
					<div className="py-16 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-2xl">
							🤖
						</div>
						<h3 className="mb-2 font-semibold text-xl">
							Подборки скоро появятся
						</h3>
						<p className="text-muted-foreground">
							ИИ анализирует плагины и создает тематические подборки. Загляните
							позже!
						</p>
					</div>
				)}
			</div>
		</section>
	);
}
