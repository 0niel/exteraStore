"use client";

import { Sparkles, Calendar, ArrowLeft, Star, Download, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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
import { cn, formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

const collectionIcons = {
	"Полезные инструменты": "🛠️",
	"Удиви друзей": "✨",
	"Для продуктивности": "📈",
	"Социальные фишки": "👥",
	"Любимчики сообщества": "❤️",
	"Скрытые жемчужины": "💎",
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
		<div className="space-y-6">
			<div className="space-y-4">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-12 w-3/4" />
				<Skeleton className="h-6 w-full" />
				<Skeleton className="h-6 w-2/3" />
			</div>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="space-y-4 rounded-lg border p-4">
						<Skeleton className="h-32 w-full" />
						<div className="space-y-2">
							<Skeleton className="h-5 w-3/4" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default function CollectionDetailPage() {
	const params = useParams();
	const router = useRouter();
	const collectionId = parseInt(params.id as string);

	const { data: collections, isLoading } = api.aiCollections.getAICollections.useQuery({ limit: 20 });
	
	const collection = collections?.find((c: any) => c.id === collectionId);
	const plugins = collection?.plugins || [];

	const gradientColor = collectionColors[collection?.name as keyof typeof collectionColors] || "";
	const emoji = collectionIcons[collection?.name as keyof typeof collectionIcons] || "🔮";

	if (isLoading) {
		return (
			<div className="bg-background">
				<div className="container mx-auto px-4 py-8">
					<CollectionSkeleton />
				</div>
			</div>
		);
	}

	if (!collection) {
		return (
			<div className="flex items-center justify-center bg-background py-16">
				<div className="px-4 text-center">
					<div className="mb-4 text-6xl">🤖</div>
					<h1 className="mb-2 font-bold text-2xl">Подборка не найдена</h1>
					<p className="mb-4 text-muted-foreground">
						Возможно, подборка была удалена или ссылка неверна
					</p>
					<Link href="/collections">
						<Button>Вернуться к подборкам</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-background">
			{/* Mobile Header */}
			<div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
				<div className="flex items-center justify-between px-4 py-3">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.back()}
						className="h-8 w-8"
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div className="flex items-center gap-2">
						<span className="text-lg">{emoji}</span>
						<span className="font-medium text-sm">{collection.name}</span>
					</div>
					<div className="w-8" /> {/* Spacer */}
				</div>
			</div>

			<div className="container mx-auto px-4 py-4 lg:py-8">
				{/* Desktop Back Button */}
				<div className="mb-6 hidden lg:block">
					<Button
						variant="ghost"
						onClick={() => router.back()}
						className="gap-2"
					>
						<ArrowLeft className="h-4 w-4" />
						Назад к подборкам
					</Button>
				</div>

				{/* Hero Section */}
				<div className="mb-8 space-y-6">
					{/* Collection Header */}
					<div className="relative overflow-hidden rounded-2xl">
						<div className={cn("h-48 bg-gradient-to-br", gradientColor)}>
							<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
							<div className="absolute bottom-6 left-6 right-6 text-white">
								<div className="mb-3 flex items-center gap-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-2xl">
										{emoji}
									</div>
									<Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm">
										ИИ подборка
									</Badge>
								</div>
								<h1 className="mb-2 font-bold text-3xl leading-tight lg:text-4xl">
									{collection.name}
								</h1>
								<p className="text-lg text-white/90 lg:text-xl">
									{collection.description}
								</p>
							</div>
						</div>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-3 gap-4 rounded-xl bg-muted/50 p-4">
						<div className="text-center">
							<div className="flex items-center justify-center gap-1 font-bold text-lg text-primary">
								<Sparkles className="h-4 w-4" />
								{plugins.length}
							</div>
							<div className="text-muted-foreground text-xs">Плагинов</div>
						</div>
						<div className="text-center">
							<div className="flex items-center justify-center gap-1 font-bold text-lg text-primary">
								<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
								{plugins.length > 0 ? (plugins.reduce((acc: number, p: any) => acc + p.rating, 0) / plugins.length).toFixed(1) : "0.0"}
							</div>
							<div className="text-muted-foreground text-xs">Средний рейтинг</div>
						</div>
						<div className="text-center">
							<div className="flex items-center justify-center gap-1 font-bold text-lg text-primary">
								<Calendar className="h-4 w-4" />
								{formatDate(collection.generatedAt).split(' ')[0]}
							</div>
							<div className="text-muted-foreground text-xs">Создана</div>
						</div>
					</div>
				</div>

				{/* Plugins Grid */}
				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<h2 className="font-bold text-2xl">Плагины в подборке</h2>
						<Badge variant="outline" className="text-sm">
							{plugins.length} {plugins.length === 1 ? "плагин" : plugins.length < 5 ? "плагина" : "плагинов"}
						</Badge>
					</div>

					{plugins.length === 0 ? (
						<EmptyState
							icon="🔍"
							title="Плагины не найдены"
							description="В этой подборке пока нет плагинов"
						/>
					) : (
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
							{plugins.map((plugin: any) => (
								<PluginCard
									key={plugin.id}
									plugin={plugin}
									className="h-full"
								/>
							))}
						</div>
					)}
				</div>

				{/* Info Section */}
				<Card className="mt-12 border bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm">
					<CardContent className="p-6">
						<div className="flex items-start gap-4">
							<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-2xl">
								🤖
							</div>
							<div>
								<h3 className="mb-2 font-bold text-lg">Создано искусственным интеллектом</h3>
								<p className="mb-4 text-muted-foreground">
									Эта подборка была автоматически создана нашим ИИ на основе анализа рейтингов, 
									отзывов пользователей и популярности плагинов. Подборки обновляются еженедельно, 
									чтобы всегда предлагать самые актуальные и качественные решения.
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