"use client";

import {
	Camera,
	Code,
	FileText,
	Globe,
	Heart,
	MessageSquare,
	Music,
	Palette,
	Settings,
	Shield,
	Tag,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "~/components/page-header";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
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

function CategorySkeleton() {
	return (
		<Card className="border bg-card/50 backdrop-blur-sm">
			<CardHeader className="pb-4">
				<div className="flex items-center gap-3">
					<Skeleton className="h-10 w-10 rounded-lg" />
					<div className="space-y-2">
						<Skeleton className="h-5 w-24" />
						<Skeleton className="h-3 w-16" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<Skeleton className="mb-2 h-4 w-full" />
				<Skeleton className="h-4 w-3/4" />
			</CardContent>
		</Card>
	);
}

export default function CategoriesPage() {
	const { data: categories, isLoading } = api.categories.getAll.useQuery();

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8">
				<PageHeader
					badge="Категории"
					title="Категории плагинов"
					description="Найдите плагины по категориям для расширения функциональности exteraGram"
					icon={Tag}
				/>

				<div className="mb-8">
					{isLoading ? (
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<CategorySkeleton key={i} />
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{categories?.map((category) => {
								const IconComponent =
									iconMap[category.icon as keyof typeof iconMap] || Code;

								return (
									<Link
										key={category.id}
										href={`/categories/${category.slug}`}
										className="group"
									>
										<Card className="hover:-translate-y-1 border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/20">
											<CardHeader className="pb-4">
												<div className="flex items-center gap-3">
													<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
														<IconComponent className="h-5 w-5 text-primary" />
													</div>
													<div>
														<CardTitle className="text-lg transition-colors group-hover:text-primary">
															{category.name}
														</CardTitle>
														<Badge variant="secondary" className="text-xs">
															{category.pluginCount} плагинов
														</Badge>
													</div>
												</div>
											</CardHeader>
											<CardContent className="pt-0">
												<CardDescription className="text-sm leading-relaxed">
													{category.description || "Описание категории"}
												</CardDescription>
											</CardContent>
										</Card>
									</Link>
								);
							})}
						</div>
					)}

					{!isLoading && (!categories || categories.length === 0) && (
						<div className="py-16 text-center">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
								<Tag className="h-8 w-8 text-primary" />
							</div>
							<h3 className="mb-2 font-semibold text-xl">
								Категории не найдены
							</h3>
							<p className="text-muted-foreground">
								Пока что категории плагинов не добавлены в систему.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
