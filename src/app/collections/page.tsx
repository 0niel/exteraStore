"use client";

import {
	ArrowRight,
	Calendar,
	Heart,
	Sparkles,
	Star,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "~/components/page-header";
import { PluginCard } from "~/components/plugin-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn, formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

const collectionIcons = {
	"Полезные инструменты": Zap,
	"Удиви друзей": Sparkles,
	"Для продуктивности": TrendingUp,
	"Социальные фишки": Users,
	"Любимчики сообщества": Heart,
	"Скрытые жемчужины": Star,
} as const;

const collectionColors = {
	"Полезные инструменты": "from-blue-500 to-cyan-500",
	"Удиви друзей": "from-purple-500 to-pink-500",
	"Для продуктивности": "from-green-500 to-emerald-500",
	"Социальные фишки": "from-orange-500 to-red-500",
	"Любимчики сообщества": "from-red-500 to-pink-500",
	"Скрытые жемчужины": "from-indigo-500 to-purple-500",
} as const;

function CollectionSkeleton() {
	return (
		<Card className="overflow-hidden border bg-card/50 backdrop-blur-sm">
			<div className="relative">
				<Skeleton className="h-32 w-full" />
				<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
				<div className="absolute right-4 bottom-4 left-4">
					<Skeleton className="mb-2 h-6 w-3/4" />
					<Skeleton className="h-4 w-full" />
				</div>
			</div>
			<CardContent className="p-4">
				<div className="mb-3 flex items-center justify-between">
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-4 w-16" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			</CardContent>
		</Card>
	);
}

function CollectionCard({ collection }: { collection: any }) {
	const IconComponent =
		collectionIcons[collection.name as keyof typeof collectionIcons] ||
		Sparkles;
	const gradientColor =
		collectionColors[collection.name as keyof typeof collectionColors] || "";

	const pluginData = collection.plugins || [];

	return (
		<Card className="group overflow-hidden border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
			<div className="relative">
				{/* Gradient Header */}
				<div className={cn("h-32 bg-gradient-to-br", gradientColor)}>
					<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
					<div className="absolute right-4 bottom-4 left-4 text-white">
						<div className="mb-2 flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
								<IconComponent className="h-4 w-4" />
							</div>
							<Badge
								variant="secondary"
								className="bg-white/20 text-white backdrop-blur-sm"
							>
								ИИ подборка
							</Badge>
						</div>
						<h3 className="font-bold text-lg leading-tight">
							{collection.name}
						</h3>
						<p className="mt-1 line-clamp-2 text-sm text-white/90">
							{collection.description}
						</p>
					</div>
				</div>
			</div>

			<CardContent className="p-4">
				<div className="mb-3 flex items-center justify-between text-muted-foreground text-sm">
					<div className="flex items-center gap-1">
						<Calendar className="h-3 w-3" />
						<span>{formatDate(collection.createdAt)}</span>
					</div>
					<span>{pluginData.length} плагинов</span>
				</div>

				{/* Preview plugins */}
				<div className="space-y-2">
					{pluginData.slice(0, 2).map((plugin: any) => (
						<Link
							key={plugin.id}
							href={`/plugins/${plugin.slug}`}
							className="block rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
						>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<Zap className="h-4 w-4 text-primary" />
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

				{pluginData.length > 2 && (
					<div className="mt-3 text-center">
						<Button variant="ghost" size="sm" className="w-full" asChild>
							<Link href={`/collections/${collection.id}`}>
								<span>Еще {pluginData.length - 2} плагинов</span>
								<ArrowRight className="ml-1 h-3 w-3" />
							</Link>
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default function CollectionsPage() {
	const [activeTab, setActiveTab] = useState("all");

	const { data: collections, isLoading } =
		api.aiCollections.getAICollections.useQuery({ limit: 20 });

	const filteredCollections =
		collections?.filter((collection: any) => {
			if (activeTab === "all") return true;
			if (activeTab === "recent") {
				const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
				return new Date(collection.createdAt).getTime() > weekAgo;
			}
			if (activeTab === "popular") {
				return collection.plugins && collection.plugins.length >= 5;
			}
			return true;
		}) || [];

	return (
		<div className="bg-background">
			<div className="container mx-auto px-4 py-8">
				<PageHeader
					badge="ИИ Подборки"
					title="Подборки плагинов от ИИ"
					description="Еженедельно обновляемые коллекции лучших плагинов, подобранные искусственным интеллектом специально для вас"
					icon={Sparkles}
				/>

				{/* Stats Cards */}
				<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
					<Card className="border bg-card/50 backdrop-blur-sm">
						<CardContent className="flex items-center gap-3 p-4">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
								<Sparkles className="h-5 w-5 text-purple-500" />
							</div>
							<div>
								<p className="font-bold text-lg">{collections?.length || 0}</p>
								<p className="text-muted-foreground text-sm">
									Активных подборок
								</p>
							</div>
						</CardContent>
					</Card>

					<Card className="border bg-card/50 backdrop-blur-sm">
						<CardContent className="flex items-center gap-3 p-4">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
								<Zap className="h-5 w-5 text-blue-500" />
							</div>
							<div>
								<p className="font-bold text-lg">
									{collections?.reduce(
										(acc: number, c: any) => acc + (c.plugins?.length || 0),
										0,
									) || 0}
								</p>
								<p className="text-muted-foreground text-sm">
									Плагинов в подборках
								</p>
							</div>
						</CardContent>
					</Card>

					<Card className="border bg-card/50 backdrop-blur-sm">
						<CardContent className="flex items-center gap-3 p-4">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
								<Calendar className="h-5 w-5 text-green-500" />
							</div>
							<div>
								<p className="font-bold text-lg">Еженедельно</p>
								<p className="text-muted-foreground text-sm">
									Обновление подборок
								</p>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Filters */}
				<Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
					<div className="rounded-lg border bg-card/50 p-4 backdrop-blur-sm">
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="all">Все подборки</TabsTrigger>
							<TabsTrigger value="recent">Недавние</TabsTrigger>
							<TabsTrigger value="popular">Популярные</TabsTrigger>
						</TabsList>
					</div>

					<TabsContent value="all" className="mt-6">
						{isLoading ? (
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
								{Array.from({ length: 6 }).map((_, i) => (
									<CollectionSkeleton key={i} />
								))}
							</div>
						) : filteredCollections.length === 0 ? (
							<EmptyState
								icon="🤖"
								title="Подборки не найдены"
								description="ИИ еще не создал подборки плагинов. Они появятся в ближайшее время!"
							/>
						) : (
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
								{filteredCollections.map((collection: any) => (
									<CollectionCard key={collection.id} collection={collection} />
								))}
							</div>
						)}
					</TabsContent>

					<TabsContent value="recent" className="mt-6">
						{isLoading ? (
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<CollectionSkeleton key={i} />
								))}
							</div>
						) : filteredCollections.length === 0 ? (
							<EmptyState
								icon="📅"
								title="Нет недавних подборок"
								description="За последнюю неделю новых подборок не создавалось"
							/>
						) : (
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
								{filteredCollections.map((collection: any) => (
									<CollectionCard key={collection.id} collection={collection} />
								))}
							</div>
						)}
					</TabsContent>

					<TabsContent value="popular" className="mt-6">
						{isLoading ? (
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<CollectionSkeleton key={i} />
								))}
							</div>
						) : filteredCollections.length === 0 ? (
							<EmptyState
								icon="⭐"
								title="Нет популярных подборок"
								description="Популярные подборки появятся после накопления достаточного количества плагинов"
							/>
						) : (
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
								{filteredCollections.map((collection: any) => (
									<CollectionCard key={collection.id} collection={collection} />
								))}
							</div>
						)}
					</TabsContent>
				</Tabs>

				{/* Info Section */}
				<Card className="mt-12 border bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm">
					<CardContent className="p-6">
						<div className="flex items-start gap-4">
							<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
								<Sparkles className="h-6 w-6 text-purple-500" />
							</div>
							<div>
								<h3 className="mb-2 font-bold text-lg">
									Как работают ИИ-подборки?
								</h3>
								<p className="mb-4 text-muted-foreground">
									Наш искусственный интеллект анализирует тысячи плагинов, их
									рейтинги, отзывы и популярность, чтобы создать тематические
									подборки лучших решений. Подборки обновляются еженедельно,
									чтобы всегда предлагать вам самые актуальные и качественные
									плагины.
								</p>
								<div className="flex flex-wrap gap-2">
									<Badge variant="secondary">Анализ рейтингов</Badge>
									<Badge variant="secondary">Изучение отзывов</Badge>
									<Badge variant="secondary">Отслеживание трендов</Badge>
									<Badge variant="secondary">Еженедельные обновления</Badge>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
