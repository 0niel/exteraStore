"use client";

import {
	ArrowLeft,
	Award,
	Check,
	Copy,
	Crown,
	Download,
	ExternalLink,
	Github,
	Globe,
	Mail,
	Package,
	Share2,
	Sparkles,
	Star,
	Target,
	TrendingUp,
	Trophy,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PluginCard } from "~/components/plugin-card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
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
			bgColor:
				"from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20",
		};
	if (score >= 5000)
		return {
			name: "Master",
			color: "from-purple-400 to-pink-500",
			icon: Trophy,
			bgColor:
				"from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
		};
	if (score >= 2000)
		return {
			name: "Expert",
			color: "from-blue-400 to-cyan-500",
			icon: Award,
			bgColor:
				"from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
		};
	if (score >= 500)
		return {
			name: "Pro",
			color: "from-green-400 to-emerald-500",
			icon: Target,
			bgColor:
				"from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
		};
	return {
		name: "Rising",
		color: "from-gray-400 to-slate-500",
		icon: Sparkles,
		bgColor:
			"from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20",
	};
}

function getNextTierProgress(
	downloads: number,
	rating: number,
	plugins: number,
) {
	const score = downloads * 0.6 + rating * plugins * 20;
	const tiers = [
		{ score: 0, name: "Rising" },
		{ score: 500, name: "Pro" },
		{ score: 2000, name: "Expert" },
		{ score: 5000, name: "Master" },
		{ score: 10000, name: "Legend" }
	];

	let currentTierIndex = 0;
	for (let i = 0; i < tiers.length; i++) {
		if (score >= tiers[i]!.score) currentTierIndex = i;
	}

	if (currentTierIndex === tiers.length - 1) {
		return {
			progress: 100,
			currentTier: tiers[currentTierIndex]!,
			nextTier: null,
			currentScore: score,
			scoreNeeded: 0,
		};
	}

	const currentTier = tiers[currentTierIndex]!;
	const nextTier = tiers[currentTierIndex + 1]!;
	const current = score - currentTier.score;
	const next = nextTier.score - currentTier.score;
	const progress = Math.min((current / next) * 100, 100);

	return {
		progress,
		currentTier,
		nextTier,
		currentScore: score,
		scoreNeeded: nextTier.score - score,
	};
}

export default function DeveloperProfilePage() {
	const params = useParams();
	const router = useRouter();
	const id = params?.id as string;
	const t = useTranslations("DeveloperProfile");
	const [copied, setCopied] = useState(false);

	const { data: developerData, isLoading } =
		api.developers.getDeveloper.useQuery({
			id: id,
		});

	const handleShare = async () => {
		const url = window.location.href;
		const title = `${developerData?.developer.name || "Developer"} - exteraGram Developer`;

		if (typeof navigator !== "undefined" && navigator.share) {
			try {
				await navigator.share({ title, url });
				toast.success("Профиль поделен!");
			} catch (error) {
				if ((error as Error).name !== "AbortError") {
					handleCopyLink();
				}
			}
		} else {
			handleCopyLink();
		}
	};

	const handleCopyLink = async () => {
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(window.location.href);
				setCopied(true);
				toast.success("Ссылка скопирована!");
				setTimeout(() => setCopied(false), 2000);
			} else {
				toast.error("Копирование не поддерживается");
			}
		} catch (error) {
			toast.error("Не удалось скопировать ссылку");
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
				<div className="container mx-auto max-w-6xl px-4 py-8">
					<div className="space-y-8">
						<Skeleton className="h-64 w-full rounded-2xl" />
						<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
							<div className="lg:col-span-2">
								<Skeleton className="h-96 w-full rounded-xl" />
							</div>
							<div className="space-y-4">
								<Skeleton className="h-32 w-full rounded-xl" />
								<Skeleton className="h-48 w-full rounded-xl" />
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!developerData) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
				<Card className="w-full max-w-md text-center">
					<CardContent className="p-8">
						<div className="mb-4 text-6xl">😕</div>
						<CardTitle className="mb-2 text-2xl">
							Разработчик не найден
						</CardTitle>
						<CardDescription className="mb-6">
							Возможно, профиль был удален или ссылка неверна
						</CardDescription>
						<Button
							onClick={() => router.push("/developers")}
							className="w-full"
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Вернуться к разработчикам
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const { developer, plugins, stats } = developerData;
	const tier = getDeveloperTier(
		stats?.totalDownloads || 0,
		stats?.averageRating || 0,
		stats?.totalPlugins || 0,
	);
	const tierProgress = getNextTierProgress(
		stats?.totalDownloads || 0,
		stats?.averageRating || 0,
		stats?.totalPlugins || 0,
	);
	const TierIcon = tier.icon;

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
			<div className="container mx-auto max-w-6xl px-4 py-8">
				<div className="space-y-8">
					{/* Hero Section */}
					<div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm dark:from-gray-900/80 dark:to-gray-800/40">
						<div
							className={cn(
								"absolute inset-0 bg-gradient-to-br opacity-10",
								tier.bgColor,
							)}
						/>
						<div className="relative p-8 md:p-12">
							<div className="mb-6 flex items-center justify-between">
								<Button
									variant="ghost"
									onClick={() => router.back()}
									className="gap-2"
								>
									<ArrowLeft className="h-4 w-4" />
									Назад
								</Button>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={handleShare}
										className="gap-2"
									>
										<Share2 className="h-4 w-4" />
										Поделиться
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={handleCopyLink}
										className="gap-2"
									>
										{copied ? (
											<Check className="h-4 w-4" />
										) : (
											<Copy className="h-4 w-4" />
										)}
										{copied ? "Скопировано" : "Ссылка"}
									</Button>
								</div>
							</div>

							<div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
								<div className="relative">
									<Avatar className="h-32 w-32 border-4 border-white shadow-2xl md:h-40 md:w-40 dark:border-gray-800">
										<AvatarImage
											src={developer.image || undefined}
											alt={developer.name || ""}
											className="object-cover"
										/>
										<AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 font-bold text-4xl">
											{(developer.name || "??").slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div
										className={cn(
											"-bottom-2 -right-2 absolute flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r shadow-xl",
											tier.color,
										)}
									>
										<TierIcon className="h-8 w-8 text-white" />
									</div>
								</div>

								<div className="flex-1 text-center md:text-left">
									<div className="mb-4">
										<h1 className="mb-2 font-bold text-4xl tracking-tight md:text-5xl">
											{developer.name || "Anonymous Developer"}
										</h1>
										{developer.telegramUsername && (
											<p className="font-medium text-lg text-primary">
												@{developer.telegramUsername}
											</p>
										)}
									</div>

									<div className="mb-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
										<Badge
											className={cn(
												"border-0 bg-gradient-to-r px-4 py-2 text-sm text-white shadow-lg",
												tier.color,
											)}
										>
											<TierIcon className="mr-2 h-4 w-4" />
											{tier.name} Developer
										</Badge>
									</div>

									{developer.bio && (
										<p className="mb-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
											{developer.bio}
										</p>
									)}

									{/* Stats Grid */}
									<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
										<div className="text-center">
											<div className="mb-1 font-bold text-3xl text-primary">
												{stats?.totalPlugins || 0}
											</div>
											<div className="text-muted-foreground text-sm">
												Плагинов
											</div>
										</div>
										<div className="text-center">
											<div className="mb-1 font-bold text-3xl text-primary">
												{formatNumber(stats?.totalDownloads || 0)}
											</div>
											<div className="text-muted-foreground text-sm">
												Скачиваний
											</div>
										</div>
										<div className="text-center">
											<div className="mb-1 flex items-center justify-center gap-1 font-bold text-3xl text-primary">
												<Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
												{stats?.averageRating?.toFixed(1) || "0.0"}
											</div>
											<div className="text-muted-foreground text-sm">
												Рейтинг
											</div>
										</div>
										<div className="text-center">
											<div className="mb-1 font-bold text-3xl text-primary">
												{Math.round(tierProgress.progress)}%
											</div>
											<div className="text-muted-foreground text-sm">
												До {tier.name === "Legend" ? "Максимум" : "повышения"}
											</div>
										</div>
									</div>

									{tierProgress.progress < 100 && tier.name !== "Legend" && (
										<div className="mt-6">
											<div className="mb-2 flex items-center justify-between text-sm">
												<span className="text-muted-foreground">
													{tierProgress.nextTier ? `Прогресс до ${tierProgress.nextTier.name}` : "Прогресс"}
												</span>
												<span className="font-medium">
													{Math.round(tierProgress.progress)}%
												</span>
											</div>
											<Progress value={tierProgress.progress} className="h-3 bg-muted/30" />
											{tierProgress.nextTier && (
												<div className="mt-2 text-center">
													<div className="text-xs text-muted-foreground">
														Нужно еще <span className="font-medium text-primary">{Math.ceil(tierProgress.scoreNeeded)}</span> очков для ранга <span className="font-medium">{tierProgress.nextTier.name}</span>
													</div>
													<div className="mt-1 text-xs text-muted-foreground">
														Текущий счет: <span className="font-medium">{Math.floor(tierProgress.currentScore)}</span>
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
						{/* Main Content */}
						<div className="lg:col-span-2">
							<div className="space-y-8">
								{/* Portfolio Header */}
								<div className="flex items-center justify-between">
									<div>
										<h2 className="font-bold text-3xl">Портфолио</h2>
										<p className="text-muted-foreground">
											{plugins.length}{" "}
											{plugins.length === 1
												? "плагин"
												: plugins.length < 5
													? "плагина"
													: "плагинов"}{" "}
											создано
										</p>
									</div>
									{stats?.totalDownloads && stats.totalDownloads > 0 && (
										<div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-2">
											<TrendingUp className="h-4 w-4 text-primary" />
											<span className="font-medium text-sm">
												{formatNumber(stats.totalDownloads)} загрузок
											</span>
										</div>
									)}
								</div>

								{/* Plugins Grid */}
								{plugins.length === 0 ? (
									<Card className="border-2 border-dashed">
										<CardContent className="flex flex-col items-center justify-center py-16">
											<div className="mb-4 text-6xl">📦</div>
											<h3 className="mb-2 font-semibold text-xl">
												Пока нет плагинов
											</h3>
											<p className="max-w-md text-center text-muted-foreground">
												Этот разработчик еще не опубликовал ни одного плагина.
												Заходите позже!
											</p>
										</CardContent>
									</Card>
								) : (
									<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
										{plugins.map((plugin: any) => (
											<PluginCard
												key={plugin.id}
												plugin={plugin}
												className="transition-all duration-300 hover:scale-[1.02]"
											/>
										))}
									</div>
								)}
							</div>
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							{/* Quick Actions */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<ExternalLink className="h-5 w-5" />
										Быстрые действия
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{developer.githubUsername && (
										<Button
											asChild
											variant="outline"
											className="w-full justify-start"
										>
											<a
												href={`https://github.com/${developer.githubUsername}`}
												target="_blank"
												rel="noopener noreferrer"
											>
												<Github className="mr-2 h-4 w-4" />
												GitHub профиль
											</a>
										</Button>
									)}
									{developer.website && (
										<Button
											asChild
											variant="outline"
											className="w-full justify-start"
										>
											<a
												href={developer.website}
												target="_blank"
												rel="noopener noreferrer"
											>
												<Globe className="mr-2 h-4 w-4" />
												Веб-сайт
											</a>
										</Button>
									)}
									{developer.telegramUsername && (
										<Button
											asChild
											variant="outline"
											className="w-full justify-start"
										>
											<a
												href={`https://t.me/${developer.telegramUsername}`}
												target="_blank"
												rel="noopener noreferrer"
											>
												<Mail className="mr-2 h-4 w-4" />
												Telegram
											</a>
										</Button>
									)}
								</CardContent>
							</Card>

							{/* Stats Card */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<TrendingUp className="h-5 w-5" />
										Статистика
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Package className="h-4 w-4 text-blue-600" />
												<span className="text-sm">Плагинов</span>
											</div>
											<span className="font-semibold">
												{stats?.totalPlugins || 0}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Download className="h-4 w-4 text-green-600" />
												<span className="text-sm">Скачиваний</span>
											</div>
											<span className="font-semibold">
												{formatNumber(stats?.totalDownloads || 0)}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Star className="h-4 w-4 text-yellow-600" />
												<span className="text-sm">Средний рейтинг</span>
											</div>
											<span className="font-semibold">
												{stats?.averageRating?.toFixed(1) || "0.0"}
											</span>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
