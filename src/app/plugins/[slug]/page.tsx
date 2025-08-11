"use client";

import {
	AlertTriangle,
	Calendar,
	ChevronLeft,
	Code,
	Download,
	Edit,
	ExternalLink,
	FileText,
	Github,
	Globe,
	Heart,
	MessageSquare,
	Share2,
	Shield,
	Star,
	Tag,
	ThumbsUp,
	User,
	Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

import { toast } from "sonner";
import { ImageGallery } from "~/components/image-gallery";
import { PluginPipeline } from "~/components/plugin-pipeline";
import { PluginSubscription } from "~/components/plugin-subscription";
import { PluginVersions } from "~/components/plugin-versions";
import {
	BotIntegrationStatus,
	TelegramBotIntegration,
} from "~/components/telegram-bot-integration";
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
import { SecurityWarning } from "~/components/ui/security-warning";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { cn, formatDate, formatNumber } from "~/lib/utils";
import { api } from "~/trpc/react";

export default function PluginDetailPage() {
	const params = useParams();
	const router = useRouter();
	const slug = params.slug as string;
	const { data: session } = useSession();
	const t = useTranslations("PluginDetailPage");

	const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
	const [reviewRating, setReviewRating] = useState(5);
	const [reviewComment, setReviewComment] = useState("");
	const [isFavorited, setIsFavorited] = useState(false);

	const { data: plugin, isLoading } = api.plugins.getBySlug.useQuery({ slug });
	const { data: reviewsData, refetch: refetchReviews } =
		api.plugins.getReviews.useQuery(
			{ pluginId: plugin?.id ?? 0, page: 1, limit: 10 },
			{ enabled: !!plugin?.id },
		);
	const { data: favoriteData } = api.favorites.check.useQuery(
		{ pluginId: plugin?.id ?? 0 },
		{ enabled: !!plugin?.id && !!session },
	);
	const { data: versions } = api.pluginVersions.getVersions.useQuery(
		{ pluginSlug: slug },
		{ enabled: !!slug },
	);
	const { data: categories } = api.categories.getAll.useQuery();
	const { data: authorData } = api.users.getPublicProfile.useQuery(
		{ id: plugin?.authorId || "" },
		{ enabled: !!plugin?.authorId },
	);

	const downloadMutation = api.plugins.download.useMutation({
		onSuccess: (data) => {
			if (data.securityCheck && data.securityCheck.status !== "passed" && data.securityCheck.details) {
				const details = JSON.parse(data.securityCheck.details);
				if (details.classification === "critical" || details.classification === "unsafe") {
					toast.error("🛡️ Плагин не прошел проверку безопасности", {
						description: "Обнаружены критические проблемы. Используйте на свой страх и риск.",
						duration: 6000,
					});
				} else if (details.classification === "potentially_unsafe") {
					toast.warning("⚠️ Потенциальные проблемы безопасности", {
						description: "В плагине обнаружены потенциальные проблемы. Будьте осторожны.",
						duration: 4000,
					});
				}
			}
		},
		onError: (error) => {
			toast.error("❌ Ошибка при скачивании", {
				description: error.message,
				duration: 4000,
			});
		},
	});

	const addReviewMutation = api.plugins.addReview.useMutation({
		onSuccess: () => {
			toast.success("Отзыв добавлен!");
			setReviewDialogOpen(false);
			setReviewComment("");
			setReviewRating(5);
			refetchReviews();
		},
		onError: (error) => {
			toast.error(`Ошибка при добавлении отзыва: ${error.message}`);
		},
	});

	const toggleFavoriteMutation = api.favorites.toggle.useMutation({
		onSuccess: (data) => {
			setIsFavorited(data.isFavorited);
			toast.success(
				data.isFavorited ? "Добавлено в избранное" : "Удалено из избранного",
			);
		},
		onError: (error) => {
			toast.error(`Ошибка: ${error.message}`);
		},
	});

	const handleDownload = () => {
		if (!plugin) return;

		downloadMutation.mutate({
			pluginId: plugin.id,
			userAgent: navigator.userAgent,
			ipAddress: undefined,
		});
	};

	const handleAddReview = () => {
		if (!plugin) return;

		addReviewMutation.mutate({
			pluginId: plugin.id,
			rating: reviewRating,
			comment: reviewComment || undefined,
		});
	};

	const handleToggleFavorite = () => {
		if (!session) {
			toast.error("Войдите в систему, чтобы добавить в избранное");
			return;
		}

		if (!plugin) return;

		toggleFavoriteMutation.mutate({ pluginId: plugin.id });
	};

	React.useEffect(() => {
		if (favoriteData) {
			setIsFavorited(favoriteData.isFavorited);
		}
	}, [favoriteData]);

	const handleShare = async () => {
		const url = window.location.href;
		const title = `${plugin?.name} - Плагин для exteraGram`;
		const text = `Посмотрите на этот потрясающий плагин: ${plugin?.shortDescription || plugin?.description}`;

		if (navigator.share) {
			try {
				await navigator.share({
					title,
					text,
					url,
				});
				toast.success("Ссылка поделена!");
			} catch (error) {
				if ((error as Error).name !== "AbortError") {
					fallbackShare(url, title);
				}
			}
		} else {
			fallbackShare(url, title);
		}
	};

	const fallbackShare = (url: string, title: string) => {
		navigator.clipboard
			.writeText(url)
			.then(() => {
				toast.success("Ссылка скопирована в буфер обмена!");
			})
			.catch(() => {
				toast.error("Не удалось скопировать ссылку");
			});
	};

	if (isLoading) {
		return (
			<div className="bg-background">
				<div className="container mx-auto max-w-4xl px-4 py-4">
					<div className="space-y-6">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="aspect-video w-full" />
						<div className="space-y-4">
							<Skeleton className="h-8 w-3/4" />
							<Skeleton className="h-4 w-1/2" />
							<Skeleton className="h-20 w-full" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!plugin) {
		return (
			<div className="flex items-center justify-center bg-background py-16">
				<div className="px-4 text-center">
					<div className="mb-4 text-6xl">😕</div>
					<h1 className="mb-2 font-bold text-2xl">Плагин не найден</h1>
					<p className="mb-4 text-muted-foreground">
						Возможно, плагин был удален или ссылка неверна
					</p>
					<Link href="/plugins">
						<Button>Вернуться к каталогу</Button>
					</Link>
				</div>
			</div>
		);
	}

	const screenshots = plugin.screenshots
		? (JSON.parse(plugin.screenshots) as string[])
		: [];
	const tags = plugin.tags ? (JSON.parse(plugin.tags) as string[]) : [];
	const requirements = plugin.requirements
		? JSON.parse(plugin.requirements)
		: {};

	const latestVersion = versions?.[0];
	const latestChangelog = latestVersion?.changelog || plugin.changelog;
	const categoryName =
		categories?.find((c) => c.slug === plugin.category)?.name ||
		plugin.category;
  const hasLinks = Boolean(plugin.githubUrl || plugin.documentationUrl);

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
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={handleToggleFavorite}
							className={cn("h-8 w-8", isFavorited && "text-red-500")}
						>
							<Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleShare}
							className="h-8 w-8"
						>
							<Share2 className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			<div className="container mx-auto max-w-4xl px-4 py-4 lg:py-8">
				{/* Desktop Back Button */}
				<div className="mb-6 hidden lg:block">
					<Button
						variant="ghost"
						onClick={() => router.back()}
						className="gap-2"
					>
						<ChevronLeft className="h-4 w-4" />
						Назад к каталогу
					</Button>
				</div>

				<div className="space-y-6">
					{/* Hero Section */}
					<div className="space-y-4">
						{/* Plugin Icon & Title */}
						<div className="flex items-start gap-4">
							<div
								className={cn(
									"flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg",
									plugin.category === "ui" &&
										"bg-gradient-to-br from-purple-500 to-pink-500",
									plugin.category === "utility" &&
										"bg-gradient-to-br from-blue-500 to-cyan-500",
									plugin.category === "security" &&
										"bg-gradient-to-br from-red-500 to-orange-500",
									plugin.category === "automation" &&
										"bg-gradient-to-br from-green-500 to-emerald-500",
									plugin.category === "development" &&
										"bg-gradient-to-br from-indigo-500 to-purple-500",
									![
										"ui",
										"utility",
										"security",
										"automation",
										"development",
									].includes(plugin.category) &&
										"bg-gradient-to-br from-gray-500 to-slate-500",
								)}
							>
								<Code className="h-8 w-8 text-white" />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-start justify-between gap-4">
									<div className="min-w-0">
										<h1 className="font-bold text-2xl leading-tight lg:text-3xl">
											{plugin.name}
										</h1>
										<p className="mt-1 text-muted-foreground">
											{plugin.shortDescription || plugin.description}
										</p>
									</div>
									<div className="hidden items-center gap-2 lg:flex">
										<Button
											variant="outline"
											size="icon"
											onClick={handleToggleFavorite}
											className={cn(
												isFavorited && "border-red-500 text-red-500",
											)}
										>
											<Heart
												className={cn("h-4 w-4", isFavorited && "fill-current")}
											/>
										</Button>
										<Button variant="outline" size="icon" onClick={handleShare}>
											<Share2 className="h-4 w-4" />
										</Button>
									</div>
								</div>

								{/* Meta Info */}
                                <div className="mt-3 flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
                                    <Link href={`/developers/${plugin.authorId}`} className="group inline-flex items-center gap-1 hover:text-foreground">
                                        <Avatar className="h-5 w-5">
                                            <AvatarImage src={authorData?.image || undefined} />
                                            <AvatarFallback className="text-xs">
                                                {plugin.author.slice(0, 1).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium group-hover:underline">{authorData?.name || plugin.author}</span>
                                    </Link>
									<Badge variant="outline" className="text-xs">
										{categoryName}
									</Badge>
									<div className="flex items-center gap-1">
										<Tag className="h-3 w-3" />
										<span>v{plugin.version}</span>
									</div>
									{plugin.verified && (
										<Badge className="bg-blue-600 text-xs">
											<Shield className="mr-1 h-3 w-3" />
											Проверен
										</Badge>
									)}
								</div>

								{/* Tags */}
								{tags.length > 0 && (
									<div className="mt-3 flex flex-wrap gap-1">
										{tags.slice(0, 4).map((tag) => (
											<Badge key={tag} variant="secondary" className="text-xs">
												{tag}
											</Badge>
										))}
										{tags.length > 4 && (
											<Badge variant="secondary" className="text-xs">
												+{tags.length - 4}
											</Badge>
										)}
									</div>
								)}
							</div>
						</div>

						{/* Quick Stats */}
						<div className="grid grid-cols-3 gap-4 rounded-xl bg-muted/50 p-4">
							<div className="text-center">
								<div className="flex items-center justify-center gap-1 font-bold text-lg text-primary">
									<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
									{plugin.rating.toFixed(1)}
								</div>
								<div className="text-muted-foreground text-xs">
									{plugin.ratingCount} отзывов
								</div>
							</div>
							<div className="text-center">
								<div className="font-bold text-lg text-primary">
									{formatNumber(plugin.downloadCount)}
								</div>
								<div className="text-muted-foreground text-xs">Скачиваний</div>
							</div>
							<div className="text-center">
								<div className="font-bold text-lg text-primary">
									{versions?.length || 1}
								</div>
								<div className="text-muted-foreground text-xs">
									{versions?.length === 1 ? "Версия" : "Версий"}
								</div>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="space-y-3">
							<TelegramBotIntegration
								pluginId={plugin.id}
								pluginName={plugin.name}
								telegramBotDeeplink={plugin.telegramBotDeeplink}
								price={0}
								onDownload={handleDownload}
							/>
							{session?.user?.id === plugin.authorId && (
								<Button variant="outline" asChild className="w-full">
									<Link href={`/my-plugins/${plugin.slug}/manage`}>
										<Edit className="mr-2 h-4 w-4" />
										Управление плагином
									</Link>
								</Button>
							)}
						</div>
					</div>

					{/* Security Warning */}
					{plugin.latestSecurityCheck && plugin.latestSecurityCheck.status !== "passed" && plugin.latestSecurityCheck.details && (
						<div className="mb-6">
							<SecurityWarning
								securityResult={{
									status: plugin.latestSecurityCheck.classification as "safe" | "warning" | "danger",
									classification: plugin.latestSecurityCheck.classification as "safe" | "potentially_unsafe" | "unsafe" | "critical",
									shortDescription: plugin.latestSecurityCheck.shortDescription,
									issues: JSON.parse(plugin.latestSecurityCheck.details).issues || [],
								}}
								variant="banner"
								showDetails={true}
							/>
						</div>
					)}

					{/* Screenshots */}
					{screenshots.length > 0 && (
						<div className="space-y-4">
							<h2 className="font-semibold text-xl">Скриншоты</h2>
							<ImageGallery
								images={screenshots}
								alt={`Скриншоты плагина ${plugin.name}`}
								category={plugin.category}
								verified={plugin.verified}
							/>
						</div>
					)}

					{/* Content Tabs */}
					<Tabs defaultValue="description" className="w-full">
						<div className="overflow-x-auto">
							<TabsList className="inline-flex h-auto w-max min-w-full justify-start">
								<TabsTrigger value="description" className="whitespace-nowrap">
									{t("description")}
								</TabsTrigger>
								<TabsTrigger value="versions" className="whitespace-nowrap">
									{t("versions")}{" "}
									{versions && versions.length > 0 && `(${versions.length})`}
								</TabsTrigger>
								<TabsTrigger value="reviews" className="whitespace-nowrap">
									{t("reviews")} ({plugin.ratingCount})
								</TabsTrigger>
								<TabsTrigger value="changelog" className="whitespace-nowrap">
									Изменения
								</TabsTrigger>
								<TabsTrigger value="pipeline" className="whitespace-nowrap">
									Проверки
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent value="description" className="mt-6">
							<div className="prose prose-neutral dark:prose-invert max-w-none">
								<ReactMarkdown>{plugin.description}</ReactMarkdown>
							</div>

							{/* Additional Info Cards */}
                            <div className={cn("mt-8 grid gap-4", hasLinks ? "sm:grid-cols-2" : "sm:grid-cols-1") }>
                                {/* Author Card */}
                                <Link href={`/developers/${plugin.authorId}`} className="group">
                                    <Card className="transition-colors group-hover:border-primary/30">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={authorData?.image || undefined} />
                                                    <AvatarFallback className="text-sm">
                                                        {(authorData?.name || plugin.author).slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="truncate font-semibold">
                                                            {authorData?.name || plugin.author}
                                                        </h3>
                                                        {authorData?.isVerified && (
                                                            <Badge className="bg-blue-600 text-xs">
                                                                <Shield className="mr-1 h-3 w-3" />
                                                                Проверен
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {authorData?.telegramUsername && (
                                                        <p className="text-primary text-sm">@{authorData.telegramUsername}</p>
                                                    )}
                                                    {authorData?.bio && (
                                                        <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                                                            {authorData.bio}
                                                        </p>
                                                    )}
                                                    {authorData?.stats && (
                                                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                                            <div>
                                                                <div className="font-semibold text-sm">{authorData.stats.totalPlugins || 0}</div>
                                                                <div className="text-muted-foreground text-xs">Плагинов</div>
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-sm">{formatNumber(Number(authorData.stats.totalDownloads) || 0)}</div>
                                                                <div className="text-muted-foreground text-xs">Скачиваний</div>
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center justify-center gap-1 font-semibold text-sm">
                                                                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                                                    {(Number(authorData.stats.averageRating) || 0).toFixed(1)}
                                                                </div>
                                                                <div className="text-muted-foreground text-xs">Рейтинг</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                {authorData?.githubUsername && (
                                                    <Button asChild variant="outline" size="sm">
                                                        <a href={`https://github.com/${authorData.githubUsername}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                                                            <Github className="h-4 w-4" /> GitHub
                                                        </a>
                                                    </Button>
                                                )}
                                                {authorData?.website && (
                                                    <Button asChild variant="outline" size="sm">
                                                        <a href={authorData.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                                                            <Globe className="h-4 w-4" /> Веб-сайт
                                                        </a>
                                                    </Button>
                                                )}
                                                {authorData?.telegramUsername && (
                                                    <Button asChild variant="outline" size="sm">
                                                        <a href={`https://t.me/${authorData.telegramUsername}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                                                            <MessageSquare className="h-4 w-4" /> Telegram
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>

                                {/* Links Card */}
                                {(plugin.githubUrl || plugin.documentationUrl) && (
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex flex-wrap gap-2">
                                                {plugin.githubUrl && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button asChild variant="outline" size="sm">
                                                                <a href={plugin.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                                                                    <Github className="h-4 w-4" /> Исходный код <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Открыть репозиторий GitHub</TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {plugin.documentationUrl && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button asChild variant="outline" size="sm">
                                                                <a href={plugin.documentationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                                                                    <FileText className="h-4 w-4" /> Документация <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Открыть документацию</TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
						</TabsContent>

						<TabsContent value="versions" className="mt-6">
							<PluginVersions pluginSlug={plugin.slug} />
						</TabsContent>

						<TabsContent value="reviews" className="mt-6">
							<div className="space-y-6">
								{/* Review Form */}
								{session && (
									<Card className="border-primary/20">
										<CardContent className="p-4">
											<div className="space-y-4">
												<div className="flex items-center gap-3">
													<Avatar className="h-8 w-8">
														<AvatarImage
															src={session.user?.image || undefined}
														/>
														<AvatarFallback>
															{session.user?.name?.slice(0, 2).toUpperCase() ||
																"??"}
														</AvatarFallback>
													</Avatar>
													<div className="flex-1">
														<p className="font-medium text-sm">
															{session.user?.name}
														</p>
														<div className="mt-1 flex gap-1">
															{[1, 2, 3, 4, 5].map((star) => (
																<button
																	key={star}
																	onClick={() => setReviewRating(star)}
																	className="transition-colors"
																>
																	<Star
																		className={cn(
																			"h-4 w-4",
																			star <= reviewRating
																				? "fill-yellow-400 text-yellow-400"
																				: "text-muted-foreground",
																		)}
																	/>
																</button>
															))}
														</div>
													</div>
												</div>
												<Textarea
													value={reviewComment}
													onChange={(e) => setReviewComment(e.target.value)}
													placeholder="Поделитесь своим мнением о плагине..."
													rows={3}
													className="resize-none"
												/>
												<div className="flex justify-end">
													<Button
														onClick={handleAddReview}
														disabled={
															addReviewMutation.isPending ||
															!reviewComment.trim()
														}
														size="sm"
													>
														{addReviewMutation.isPending
															? "Отправка..."
															: "Отправить отзыв"}
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								)}

								{/* Reviews List */}
								<div className="space-y-4">
									{reviewsData?.reviews.map(
										(review: {
											id: number;
											rating: number;
											title: string | null;
											comment: string | null;
											helpful: number;
											createdAt: string | Date;
											user: {
												name: string | null;
												image: string | null;
											} | null;
										}) => (
											<Card key={review.id}>
												<CardContent className="p-4">
													<div className="flex items-start gap-3">
														<Avatar className="h-8 w-8">
															<AvatarImage
																src={review.user?.image || undefined}
															/>
															<AvatarFallback>
																{review.user?.name?.slice(0, 2).toUpperCase() ||
																	"??"}
															</AvatarFallback>
														</Avatar>
														<div className="flex-1 space-y-2">
															<div className="flex items-center gap-2">
																<span className="font-medium text-sm">
																	{review.user?.name}
																</span>
																<div className="flex">
																	{[1, 2, 3, 4, 5].map((star) => (
																		<Star
																			key={star}
																			className={cn(
																				"h-3 w-3",
																				star <= review.rating
																					? "fill-yellow-400 text-yellow-400"
																					: "text-muted-foreground",
																			)}
																		/>
																	))}
																</div>
																<span className="text-muted-foreground text-xs">
																	{formatDate(review.createdAt)}
																</span>
															</div>
															{review.comment && (
																<p className="text-muted-foreground text-sm">
																	{review.comment}
																</p>
															)}
														</div>
													</div>
												</CardContent>
											</Card>
										),
									)}
								</div>
							</div>
						</TabsContent>

						<TabsContent value="changelog" className="mt-6">
							<div className="space-y-6">
								{latestChangelog ? (
									<div className="prose prose-neutral dark:prose-invert max-w-none">
										<ReactMarkdown>{latestChangelog}</ReactMarkdown>
									</div>
								) : (
									<div className="rounded-lg border border-dashed p-8 text-center">
										<FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
										<h4 className="mb-2 font-medium">
											История изменений не найдена
										</h4>
										<p className="text-muted-foreground text-sm">
											Автор плагина пока не добавил описание изменений.
										</p>
									</div>
								)}
							</div>
						</TabsContent>

						<TabsContent value="pipeline" className="mt-6">
							<PluginPipeline pluginSlug={plugin.slug} />
						</TabsContent>
					</Tabs>

					{/* Subscription - показывать только если пользователь вошел */}
					{session && (
						<PluginSubscription pluginId={plugin.id} pluginName={plugin.name} />
					)}
				</div>
			</div>
		</div>
	);
}
