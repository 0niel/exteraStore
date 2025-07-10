"use client";

import {
	ArrowLeft,
	Camera,
	Code,
	Download,
	FileText,
	Filter,
	Globe,
	Heart,
	MessageSquare,
	Music,
	Palette,
	Settings,
	Shield,
	Star,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import type { plugins as Plugin } from "~/server/db/schema";
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

const colorMap = {
	blue: "bg-blue-500/20 text-blue-700 border-blue-200",
	green: "bg-green-500/20 text-green-700 border-green-200",
	purple: "bg-purple-500/20 text-purple-700 border-purple-200",
	red: "bg-red-500/20 text-red-700 border-red-200",
	yellow: "bg-yellow-500/20 text-yellow-700 border-yellow-200",
	pink: "bg-pink-500/20 text-pink-700 border-pink-200",
	indigo: "bg-indigo-500/20 text-indigo-700 border-indigo-200",
	orange: "bg-orange-500/20 text-orange-700 border-orange-200",
} as const;

function CategoryHeaderSkeleton() {
	return (
		<div className="bg-muted/20 py-16">
			<div className="container mx-auto px-4">
				<div className="mb-6 flex items-center gap-4">
					<Skeleton className="h-16 w-16 rounded-2xl" />
					<div className="space-y-2">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>
				<Skeleton className="h-6 w-full max-w-2xl" />
			</div>
		</div>
	);
}

function PluginSkeleton() {
	return (
		<Card className="h-full">
			<CardHeader>
				<div className="flex items-center gap-3">
					<Skeleton className="h-12 w-12 rounded-lg" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-5 w-3/4" />
						<Skeleton className="h-4 w-1/2" />
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<Skeleton className="mb-2 h-4 w-full" />
				<Skeleton className="mb-4 h-4 w-2/3" />
				<div className="flex items-center justify-between">
					<Skeleton className="h-6 w-20" />
					<Skeleton className="h-8 w-24" />
				</div>
			</CardContent>
		</Card>
	);
}

export default function CategoryPage() {
	const params = useParams();
	const slug = params.slug as string;

	const { data: category, isLoading } = api.categories.getBySlug.useQuery({
		slug,
	});

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<CategoryHeaderSkeleton />
				<section className="py-16">
					<div className="container mx-auto px-4">
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 6 }).map((_, i) => (
								<PluginSkeleton key={i} />
							))}
						</div>
					</div>
				</section>
			</div>
		);
	}

	if (!category) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="text-center">
					<div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
						<Code className="h-12 w-12 text-muted-foreground" />
					</div>
					<h1 className="mb-2 font-bold text-2xl text-foreground">
						Категория не найдена
					</h1>
					<p className="mb-6 text-muted-foreground">
						Запрашиваемая категория не существует или была удалена.
					</p>
					<Link href="/categories">
						<Button>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Вернуться к категориям
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	const IconComponent = iconMap[category.icon as keyof typeof iconMap] || Code;
	const colorClass =
		colorMap[category.color as keyof typeof colorMap] || colorMap.blue;

	return (
		<div className="min-h-screen bg-background">
			{/* Category Header */}
			<section className="bg-muted/20 py-16">
				<div className="container mx-auto px-4">
					<div className="mb-6 flex items-center gap-2">
						<Link href="/categories">
							<Button variant="ghost" size="sm">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Категории
							</Button>
						</Link>
					</div>

					<div className="mb-6 flex items-center gap-6">
						<div className={`rounded-2xl border-2 p-4 ${colorClass}`}>
							<IconComponent className="h-8 w-8" />
						</div>
						<div>
							<h1 className="mb-2 font-bold text-4xl text-foreground md:text-5xl">
								{category.name}
							</h1>
							<Badge variant="secondary" className="text-sm">
								{category.plugins.length} плагинов
							</Badge>
						</div>
					</div>

					{category.description && (
						<p className="max-w-2xl text-muted-foreground text-xl">
							{category.description}
						</p>
					)}
				</div>
			</section>

			{/* Plugins Section */}
			<section className="py-16">
				<div className="container mx-auto px-4">
					{category.plugins.length > 0 ? (
						<>
							<div className="mb-8 flex items-center justify-between">
								<h2 className="font-bold text-2xl text-foreground">
									Плагины в категории
								</h2>
								<Button variant="outline" size="sm">
									<Filter className="mr-2 h-4 w-4" />
									Фильтры
								</Button>
							</div>

							<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
								{category.plugins.map((plugin: typeof Plugin.$inferSelect) => (
															<PluginCard
							key={plugin.id}
							plugin={plugin}
						/>
								))}
							</div>
						</>
					) : (
						<div className="py-16 text-center">
							<div
								className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${colorClass}`}
							>
								<IconComponent className="h-12 w-12" />
							</div>
							<h3 className="mb-2 font-semibold text-foreground text-xl">
								Пока нет плагинов
							</h3>
							<p className="mb-6 text-muted-foreground">
								В этой категории пока что нет опубликованных плагинов.
							</p>
							<div className="flex justify-center gap-4">
								<Link href="/upload">
									<Button>Загрузить плагин</Button>
								</Link>
								<Link href="/categories">
									<Button variant="outline">Другие категории</Button>
								</Link>
							</div>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
