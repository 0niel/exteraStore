"use client";

import {
	Award,
	Crown,
	Download,
	ExternalLink,
	Filter,
	Github,
	Globe,
	Package,
	Search,
	Sparkles,
	Star,
	Target,
	TrendingUp,
	Trophy,
	Users,
	Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import { cn, formatNumber } from "~/lib/utils";
import { api } from "~/trpc/react";

function getDeveloperTier(downloads: number, rating: number, plugins: number) {
	const score = downloads * 0.6 + rating * plugins * 20;

	if (score >= 10000)
		return {
			name: "Legend",
			color: "from-yellow-400 to-orange-500",
			icon: Crown,
			bgColor: "from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20",
		};
	if (score >= 5000)
		return {
			name: "Master",
			color: "from-purple-400 to-pink-500",
			icon: Trophy,
			bgColor: "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
		};
	if (score >= 2000)
		return { 
			name: "Expert", 
			color: "from-blue-400 to-cyan-500", 
			icon: Award,
			bgColor: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
		};
	if (score >= 500)
		return {
			name: "Pro",
			color: "from-green-400 to-emerald-500",
			icon: Target,
			bgColor: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
		};
	return {
		name: "Rising",
		color: "from-gray-400 to-slate-500",
		icon: Sparkles,
		bgColor: "from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20",
	};
}

function getTierProgress(downloads: number, rating: number, plugins: number) {
	const score = downloads * 0.6 + rating * plugins * 20;
	const tiers = [0, 500, 2000, 5000, 10000];
	const tierNames = ["Rising", "Pro", "Expert", "Master", "Legend"];

	let currentTier = 0;
	for (let i = 0; i < tiers.length; i++) {
		if (score >= tiers[i]!) currentTier = i;
	}

	if (currentTier === tiers.length - 1) return { progress: 100, nextTier: null };

	const currentTierScore = tiers[currentTier]!;
	const nextTierScore = tiers[currentTier + 1]!;
	const current = score - currentTierScore;
	const next = nextTierScore - currentTierScore;
	const progress = Math.min((current / next) * 100, 100);

	return { 
		progress, 
		nextTier: tierNames[currentTier + 1] || null,
		scoreNeeded: nextTierScore - score
	};
}

export default function DevelopersPage() {
	const t = useTranslations("Developers");
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);

	const { data: developersData, isLoading } =
		api.developers.getDevelopers.useQuery({
			page,
			limit: 12,
			search: searchQuery,
		});

	const filteredDevelopers = developersData?.developers || [];

	return (
		<div className="bg-background">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8 text-center">
					<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-medium text-primary text-sm">
						<Users className="h-4 w-4" />
						Сообщество разработчиков
					</div>
					<h1 className="mb-4 font-bold text-3xl tracking-tight sm:text-4xl">
						Разработчики exteraGram
					</h1>
					<p className="mx-auto max-w-2xl text-muted-foreground">
						Познакомьтесь с талантливыми разработчиками, создающими удивительные
						плагины для exteraGram
					</p>
				</div>

				<div className="mb-6">
					<div className="relative mx-auto max-w-md">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Поиск разработчиков..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<Card key={i} className="overflow-hidden">
								<CardContent className="p-6">
									<div className="flex items-start gap-4">
										<Skeleton className="h-12 w-12 rounded-full" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-5 w-24" />
											<Skeleton className="h-4 w-16" />
										</div>
									</div>
									<div className="mt-4 space-y-2">
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-3/4" />
									</div>
									<div className="mt-4 grid grid-cols-3 gap-2">
										<Skeleton className="h-8 w-full" />
										<Skeleton className="h-8 w-full" />
										<Skeleton className="h-8 w-full" />
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				) : filteredDevelopers.length === 0 ? (
					<Card>
						<CardContent className="py-12 text-center">
							<div className="mb-4 text-6xl">👥</div>
							<h3 className="mb-2 font-semibold text-lg">
								{searchQuery
									? "Разработчики не найдены"
									: "Пока нет разработчиков"}
							</h3>
							<p className="text-muted-foreground">
								{searchQuery
									? "Попробуйте изменить поисковый запрос"
									: "Станьте первым разработчиком в нашем сообществе!"}
							</p>
							{searchQuery && (
								<Button
									variant="outline"
									onClick={() => setSearchQuery("")}
									className="mt-4"
								>
									Очистить поиск
								</Button>
							)}
						</CardContent>
					</Card>
				) : (
					<>
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
														{filteredDevelopers.map((developer: any) => {
								const tier = getDeveloperTier(
									developer.totalDownloads || 0,
									developer.averageRating || 0,
									developer.pluginCount || 0,
								);
								const progress = getTierProgress(
									developer.totalDownloads || 0,
									developer.averageRating || 0,
									developer.pluginCount || 0,
								);
								const TierIcon = tier.icon;

								return (
									<Card
										key={developer.id}
										className="group relative h-full cursor-pointer overflow-hidden bg-gradient-to-br from-card to-card/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
										onClick={() =>
											(window.location.href = `/developers/${developer.id}`)
										}
									>
										{/* Tier accent border */}
										<div className={cn(
											"absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
											tier.color
										)} />
										
										<CardContent className="relative p-6 h-full flex flex-col">
											{/* Header with avatar and tier */}
											<div className="flex items-start gap-4 mb-4">
												<div className="relative">
													<Avatar className="h-14 w-14 border-2 border-background shadow-lg">
														<AvatarImage
															src={developer.image || undefined}
															alt={developer.name || ""}
															className="object-cover"
														/>
														<AvatarFallback className={cn(
															"bg-gradient-to-br font-medium text-sm text-white",
															tier.color
														)}>
															{(developer.name || "??")
																.slice(0, 2)
																.toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<div
														className={cn(
															"-bottom-1 -right-1 absolute flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r shadow-lg border-2 border-background",
															tier.color,
														)}
													>
														<TierIcon className="h-3.5 w-3.5 text-white" />
													</div>
												</div>

												<div className="min-w-0 flex-1">
													<h3 className="truncate font-bold text-lg transition-colors group-hover:text-primary">
														{developer.name || "Anonymous"}
													</h3>
													<div className="mt-2">
														<Badge
															className={cn(
																"border-0 bg-gradient-to-r text-white text-xs shadow-md px-3 py-1",
																tier.color,
															)}
														>
															<TierIcon className="mr-1.5 h-3 w-3" />
															{tier.name} Developer
														</Badge>
													</div>
												</div>
											</div>

											{developer.bio && (
												<p className="mb-4 line-clamp-2 text-muted-foreground text-sm">
													{developer.bio}
												</p>
											)}

											{/* Progress to next tier */}
											{progress.nextTier && progress.progress < 100 && (
												<div className="mb-4">
													<div className="mb-2 flex items-center justify-between text-xs">
														<span className="text-muted-foreground">
															Прогресс до {progress.nextTier}
														</span>
														<span className="font-medium text-primary">
															{Math.round(progress.progress)}%
														</span>
													</div>
													<Progress 
														value={progress.progress} 
														className="h-1.5"
													/>
												</div>
											)}

											<div className="mb-4 grid grid-cols-3 gap-2 text-center">
												<div className="rounded-lg bg-muted/30 p-2 transition-colors group-hover:bg-muted/50">
													<div className="flex items-center justify-center gap-1">
														<Package className="h-3 w-3 text-blue-600" />
														<span className="font-medium text-sm">
															{developer.pluginCount || 0}
														</span>
													</div>
													<div className="text-muted-foreground text-xs">
														Plugins
													</div>
												</div>

												<div className="rounded-lg bg-muted/30 p-2 transition-colors group-hover:bg-muted/50">
													<div className="flex items-center justify-center gap-1">
														<Download className="h-3 w-3 text-green-600" />
														<span className="font-medium text-sm">
															{formatNumber(developer.totalDownloads || 0)}
														</span>
													</div>
													<div className="text-muted-foreground text-xs">
														Downloads
													</div>
												</div>

												<div className="rounded-lg bg-muted/30 p-2 transition-colors group-hover:bg-muted/50">
													<div className="flex items-center justify-center gap-1">
														<Star className="h-3 w-3 text-yellow-600" />
														<span className="font-medium text-sm">
															{developer.averageRating?.toFixed(1) || "0.0"}
														</span>
													</div>
													<div className="text-muted-foreground text-xs">
														Rating
													</div>
												</div>
											</div>

											<div className="mt-auto flex items-center justify-between">
												<div className="flex items-center gap-1">
													{developer.githubUsername && (
														<Button
															variant="ghost"
															size="sm"
															className="h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
															onClick={(e) => {
																e.stopPropagation();
																window.open(
																	`https://github.com/${developer.githubUsername}`,
																	"_blank",
																);
															}}
														>
															<Github className="h-4 w-4" />
														</Button>
													)}
													{developer.website && (
														<Button
															variant="ghost"
															size="sm"
															className="h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
															onClick={(e) => {
																e.stopPropagation();
																window.open(developer.website, "_blank");
															}}
														>
															<Globe className="h-4 w-4" />
														</Button>
													)}
												</div>

												<Button
													size="sm"
													variant="ghost"
													className="h-8 w-8 p-0 hover:bg-primary/10 transition-colors opacity-60 group-hover:opacity-100"
												>
													<ExternalLink className="h-4 w-4" />
												</Button>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>

						{developersData && developersData.pagination.totalPages > 1 && (
							<div className="mt-8 flex justify-center gap-2">
								<Button
									variant="outline"
									onClick={() => setPage(page - 1)}
									disabled={page === 1}
								>
									Предыдущая
								</Button>
								<span className="flex items-center px-4 text-muted-foreground text-sm">
									Страница {page} из {developersData.pagination.totalPages}
								</span>
								<Button
									variant="outline"
									onClick={() => setPage(page + 1)}
									disabled={page === developersData.pagination.totalPages}
								>
									Следующая
								</Button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
