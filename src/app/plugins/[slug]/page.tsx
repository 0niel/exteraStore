"use client";

import {
	AlertTriangle,
	Calendar,
	Code,
	Download,
	Edit,
	ExternalLink,
	FileText,
	Github,
	Heart,
	MessageSquare,
	Share2,
	Shield,
	Star,
	Tag,
	ThumbsUp,
	User,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useState } from "react";

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
import { formatDate, formatNumber } from "~/lib/utils";
import { api } from "~/trpc/react";

export default function PluginDetailPage() {
	const params = useParams();
	const slug = params.slug as string;
	const { data: session } = useSession();

	const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
	const [reviewRating, setReviewRating] = useState(5);
	const [reviewTitle, setReviewTitle] = useState("");
	const [reviewComment, setReviewComment] = useState("");
	const [isFavorited, setIsFavorited] = useState(false);

	const { data: plugin, isLoading } = api.plugins.getBySlug.useQuery({ slug });
	const { data: reviewsData } = api.plugins.getReviews.useQuery(
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

	const downloadMutation = api.plugins.download.useMutation({
		onSuccess: (data) => {
			if (data.telegramBotDeeplink) {
				window.open(data.telegramBotDeeplink, "_blank");
			} else {
				toast.success("Плагин скачан!");
			}
		},
		onError: (error) => {
			toast.error(`Ошибка при скачивании: ${error.message}`);
		},
	});

	const addReviewMutation = api.plugins.addReview.useMutation({
		onSuccess: () => {
			toast.success("Отзыв добавлен!");
			setReviewDialogOpen(false);
			setReviewTitle("");
			setReviewComment("");
			setReviewRating(5);
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
			title: reviewTitle || undefined,
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
			<div className="min-h-screen bg-background">
				<div className="container mx-auto px-4 py-8">
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
						<div className="space-y-6 lg:col-span-2">
							<Skeleton className="aspect-video w-full" />
							<div className="space-y-4">
								<Skeleton className="h-8 w-3/4" />
								<Skeleton className="h-4 w-1/2" />
								<Skeleton className="h-20 w-full" />
							</div>
						</div>
						<div className="space-y-6">
							<Skeleton className="h-64 w-full" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!plugin) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="text-center">
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

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 md:py-8">
				<div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 lg:grid-cols-3">
					{/* Main Content */}
					<div className="space-y-4 sm:space-y-6 lg:col-span-2">
						{/* Header */}
						<div className="space-y-3 sm:space-y-4">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
								<div className="space-y-1 sm:space-y-2">
									<div className="flex flex-wrap items-center gap-2">
										<h1 className="font-bold text-xl sm:text-2xl md:text-3xl">
											{plugin.name}
										</h1>
										{plugin.verified && (
											<Badge className="bg-blue-600 text-xs sm:text-sm">
												<Shield className="mr-1 h-3 w-3" />
												Проверен
											</Badge>
										)}
										{plugin.featured && (
											<Badge className="bg-yellow-500 text-xs sm:text-sm">
												⭐ Рекомендуемый
											</Badge>
										)}
									</div>
									<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs sm:gap-4 sm:text-sm">
										<div className="flex items-center gap-1">
											<User className="h-3 w-3 sm:h-4 sm:w-4" />
											<span>{plugin.author}</span>
										</div>
										<div className="flex items-center gap-1">
											<Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
											<span>{formatDate(new Date(plugin.createdAt))}</span>
										</div>
										<div className="flex items-center gap-1">
											<Tag className="h-3 w-3 sm:h-4 sm:w-4" />
											<span>v{plugin.version}</span>
										</div>
									</div>
								</div>

								<div className="flex items-center gap-2">
									{session?.user?.id === plugin.authorId && (
										<Button
											variant="outline"
											size="sm"
											asChild
											className="h-8 text-xs"
										>
											<Link href={`/my-plugins/${plugin.slug}/manage`}>
												<Edit className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
												<span className="xs:inline hidden">Редактировать</span>
												<span className="xs:hidden">Ред.</span>
											</Link>
										</Button>
									)}
									<Button
										variant="outline"
										size="icon"
										onClick={handleToggleFavorite}
										className={`h-8 w-8 ${isFavorited ? "border-red-500 text-red-500" : ""}`}
									>
										<Heart
											className={`h-4 w-4 ${isFavorited ? "fill-red-500" : ""}`}
										/>
									</Button>
									<Button
										variant="outline"
										size="icon"
										onClick={handleShare}
										className="h-8 w-8"
									>
										<Share2 className="h-4 w-4" />
									</Button>
								</div>
							</div>

							<p className="text-muted-foreground text-sm sm:text-base md:text-lg">
								{plugin.shortDescription || plugin.description}
							</p>

							{/* Tags */}
							{tags.length > 0 && (
								<div className="flex flex-wrap gap-1 sm:gap-2">
									{tags.map((tag) => (
										<Badge
											key={tag}
											variant="outline"
											className="h-5 py-0 text-xs sm:h-6 sm:text-sm"
										>
											{tag}
										</Badge>
									))}
								</div>
							)}
						</div>

						{/* Plugin Preview */}
						<div className="space-y-4">
							<h2 className="font-semibold text-xl">Превью плагина</h2>

							{screenshots.length > 0 ? (
								<ImageGallery
									images={screenshots}
									alt={`Скриншоты плагина ${plugin.name}`}
									category={plugin.category}
									verified={plugin.verified}
								/>
							) : (
								<div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-muted/30 to-muted/60">
									<div className="relative aspect-video">
										<div
											className={`absolute inset-0 bg-gradient-to-br ${
												plugin.category.toLowerCase() === "ui"
													? "from-purple-500 to-pink-500"
													: plugin.category.toLowerCase() === "utility"
														? "from-blue-500 to-cyan-500"
														: plugin.category.toLowerCase() === "security"
															? "from-red-500 to-orange-500"
															: plugin.category.toLowerCase() === "automation"
																? "from-green-500 to-emerald-500"
																: plugin.category.toLowerCase() ===
																		"development"
																	? "from-indigo-500 to-purple-500"
																	: "from-gray-500 to-slate-500"
											}`}
										/>

										<div className="absolute inset-0 bg-black/20" />
										<div className="-translate-y-32 absolute top-0 right-0 h-64 w-64 translate-x-32 rounded-full bg-white/10" />
										<div className="-translate-x-24 absolute bottom-0 left-0 h-48 w-48 translate-y-24 rounded-full bg-white/5" />

										<div className="absolute inset-0 flex items-center justify-center">
											<div className="text-center text-white">
												<div className="mb-4 inline-block rounded-3xl bg-white/20 p-8 backdrop-blur-sm">
													<Code className="h-16 w-16 text-white drop-shadow-lg" />
												</div>
												<h3 className="mb-2 font-bold text-2xl drop-shadow-lg">
													{plugin.name}
												</h3>
												<p className="text-lg opacity-90 drop-shadow-md">
													v{plugin.version}
												</p>
											</div>
										</div>

										<div className="absolute bottom-4 left-4 flex gap-2">
											<Badge className="border-0 bg-white/20 text-white backdrop-blur-sm">
												{plugin.category}
											</Badge>
											{plugin.verified && (
												<Badge className="border-0 bg-blue-500/80 text-white backdrop-blur-sm">
													<Shield className="mr-1 h-3 w-3" />
													Проверен
												</Badge>
											)}
										</div>
									</div>
								</div>
							)}

							<div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
								<div className="rounded-lg bg-muted/30 p-3">
									<div className="font-bold text-2xl text-primary">
										{formatNumber(plugin.downloadCount)}
									</div>
									<div className="text-muted-foreground text-sm">
										Скачиваний
									</div>
								</div>
								<div className="rounded-lg bg-muted/30 p-3">
									<div className="flex items-center justify-center gap-1 font-bold text-2xl text-primary">
										<Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
										{plugin.rating.toFixed(1)}
									</div>
									<div className="text-muted-foreground text-sm">
										{plugin.ratingCount} отзывов
									</div>
								</div>
								<div className="rounded-lg bg-muted/30 p-3">
									<div className="font-bold text-2xl text-primary">
										v{latestVersion?.version || plugin.version}
									</div>
									<div className="text-muted-foreground text-sm">
										{latestVersion ? "Последняя версия" : "Версия"}
									</div>
								</div>
								<div className="rounded-lg bg-muted/30 p-3">
									<div className="font-bold text-2xl text-primary">
										{plugin.price > 0 ? `$${plugin.price}` : "FREE"}
									</div>
									<div className="text-muted-foreground text-sm">Цена</div>
								</div>
							</div>
						</div>

						<Tabs defaultValue="description" className="w-full">
							<div className="scrollbar-hide overflow-x-auto">
								<TabsList className="inline-flex h-auto w-max min-w-full justify-start p-1">
									<TabsTrigger
										value="description"
										className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
									>
										Описание
									</TabsTrigger>
									<TabsTrigger
										value="versions"
										className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
									>
										Версии{" "}
										{versions && versions.length > 0 && `(${versions.length})`}
									</TabsTrigger>
									<TabsTrigger
										value="pipeline"
										className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
									>
										Проверки
									</TabsTrigger>
									<TabsTrigger
										value="reviews"
										className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
									>
										Отзывы ({plugin.ratingCount})
									</TabsTrigger>
									<TabsTrigger
										value="changelog"
										className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
									>
										Изменения
									</TabsTrigger>
									<TabsTrigger
										value="requirements"
										className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
									>
										Требования
									</TabsTrigger>
								</TabsList>
							</div>

							<TabsContent value="description" className="mt-6">
								<div className="prose prose-neutral dark:prose-invert max-w-none">
									<div className="whitespace-pre-wrap">
										{plugin.description}
									</div>
								</div>
							</TabsContent>

							<TabsContent value="versions" className="mt-6">
								<PluginVersions pluginSlug={plugin.slug} />
							</TabsContent>

							<TabsContent value="pipeline" className="mt-6">
								<PluginPipeline pluginSlug={plugin.slug} />
							</TabsContent>

							<TabsContent value="reviews" className="mt-6">
								<div className="space-y-6">
									<div className="flex items-center justify-between">
										<h3 className="font-semibold text-lg">
											Отзывы пользователей
										</h3>
										<Dialog
											open={reviewDialogOpen}
											onOpenChange={setReviewDialogOpen}
										>
											<DialogTrigger asChild>
												<Button>Написать отзыв</Button>
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle>Написать отзыв</DialogTitle>
													<DialogDescription>
														Поделитесь своим мнением о плагине {plugin.name}
													</DialogDescription>
												</DialogHeader>
												<div className="space-y-4">
													<div>
														<Label>Рейтинг</Label>
														<div className="mt-2 flex gap-1">
															{[1, 2, 3, 4, 5].map((star) => (
																<button
																	key={star}
																	onClick={() => setReviewRating(star)}
																	className="text-2xl transition-colors"
																>
																	<Star
																		className={`h-6 w-6 ${
																			star <= reviewRating
																				? "fill-yellow-400 text-yellow-400"
																				: "text-muted-foreground"
																		}`}
																	/>
																</button>
															))}
														</div>
													</div>
													<div>
														<Label htmlFor="review-title">
															Заголовок (необязательно)
														</Label>
														<Input
															id="review-title"
															value={reviewTitle}
															onChange={(e) => setReviewTitle(e.target.value)}
															placeholder="Краткое описание вашего опыта"
														/>
													</div>
													<div>
														<Label htmlFor="review-comment">
															Комментарий (необязательно)
														</Label>
														<Textarea
															id="review-comment"
															value={reviewComment}
															onChange={(e) => setReviewComment(e.target.value)}
															placeholder="Расскажите подробнее о плагине..."
															rows={4}
														/>
													</div>
													<div className="flex justify-end gap-2">
														<Button
															variant="outline"
															onClick={() => setReviewDialogOpen(false)}
														>
															Отмена
														</Button>
														<Button
															onClick={handleAddReview}
															disabled={addReviewMutation.isPending}
														>
															{addReviewMutation.isPending
																? "Отправка..."
																: "Отправить"}
														</Button>
													</div>
												</div>
											</DialogContent>
										</Dialog>
									</div>

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
												<CardContent className="pt-6">
													<div className="flex items-start gap-4">
														<Avatar>
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
																<span className="font-medium">
																	{review.user?.name}
																</span>
																<div className="flex">
																	{[1, 2, 3, 4, 5].map((star) => (
																		<Star
																			key={star}
																			className={`h-4 w-4 ${
																				star <= review.rating
																					? "fill-yellow-400 text-yellow-400"
																					: "text-muted-foreground"
																			}`}
																		/>
																	))}
																</div>
																<span className="text-muted-foreground text-sm">
																	{formatDate(new Date(review.createdAt))}
																</span>
															</div>
															{review.title && (
																<h4 className="font-medium">{review.title}</h4>
															)}
															{review.comment && (
																<p className="text-muted-foreground">
																	{review.comment}
																</p>
															)}
															<div className="flex items-center gap-4 text-sm">
																<button className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
																	<ThumbsUp className="h-4 w-4" />
																	<span>Полезно ({review.helpful})</span>
																</button>
															</div>
														</div>
													</div>
												</CardContent>
											</Card>
										),
									)}
								</div>
							</TabsContent>

							<TabsContent value="changelog" className="mt-6">
								<div className="space-y-6">
									<div className="flex items-center justify-between">
										<h3 className="font-semibold text-lg">История изменений</h3>
										{latestVersion && (
											<Badge variant="outline">
												Последняя: v{latestVersion.version}
											</Badge>
										)}
									</div>

									{latestChangelog ? (
										<div className="prose prose-neutral dark:prose-invert max-w-none">
											<div className="whitespace-pre-wrap">
												{latestChangelog}
											</div>
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

							<TabsContent value="requirements" className="mt-6">
								<div className="space-y-4">
									<h3 className="font-semibold text-lg">
										Системные требования
									</h3>
									<div className="grid gap-4">
										{Object.entries(requirements).length > 0 ? (
											Object.entries(requirements).map(([key, value]) => (
												<div
													key={key}
													className="flex justify-between border-b py-2"
												>
													<span className="font-medium capitalize">{key}:</span>
													<span className="text-muted-foreground">
														{String(value)}
													</span>
												</div>
											))
										) : (
											<p className="text-muted-foreground">
												Особых требований не указано.
											</p>
										)}
									</div>
								</div>
							</TabsContent>
						</Tabs>
					</div>

					{/* Sidebar - show at the top on mobile, and on the side on desktop */}
					<div className="order-first mb-4 space-y-4 sm:space-y-6 lg:order-none lg:mb-0">
						{/* Telegram Bot Integration */}
						<TelegramBotIntegration
							pluginId={plugin.id}
							pluginName={plugin.name}
							telegramBotDeeplink={plugin.telegramBotDeeplink}
							price={plugin.price}
							onDownload={handleDownload}
						/>

						{/* Plugin Stats */}
						<Card>
							<CardHeader>
								<CardTitle className="text-base sm:text-lg">
									Статистика
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 pt-0 sm:space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground text-xs sm:text-sm">
										Загрузки:
									</span>
									<span className="font-medium text-xs sm:text-sm">
										{formatNumber(plugin.downloadCount)}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground text-xs sm:text-sm">
										Рейтинг:
									</span>
									<div className="flex items-center gap-1">
										<Star className="h-3 w-3 fill-yellow-400 text-yellow-400 sm:h-4 sm:w-4" />
										<span className="font-medium text-xs sm:text-sm">
											{plugin.rating.toFixed(1)} ({plugin.ratingCount})
										</span>
									</div>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground text-xs sm:text-sm">
										Категория:
									</span>
									<Badge
										variant="outline"
										className="h-5 py-0 text-xs sm:text-sm"
									>
										{plugin.category}
									</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground text-xs sm:text-sm">
										Интеграция:
									</span>
									<BotIntegrationStatus
										hasIntegration={!!plugin.telegramBotDeeplink}
									/>
								</div>
							</CardContent>
						</Card>

						{/* Author Info */}
						<Card>
							<CardHeader>
								<CardTitle className="text-base sm:text-lg">Автор</CardTitle>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="flex items-center gap-3">
									<Avatar className="h-8 w-8 sm:h-10 sm:w-10">
										<AvatarFallback className="text-xs sm:text-sm">
											{plugin.author.slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div>
										<div className="font-medium text-sm sm:text-base">
											{plugin.author}
										</div>
										<div className="text-muted-foreground text-xs sm:text-sm">
											Разработчик
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Subscription - показывать только если пользователь вошел */}
						{session && (
							<PluginSubscription
								pluginId={plugin.id}
								pluginName={plugin.name}
							/>
						)}

						{/* Links - показывать только если есть ссылки */}
						{(plugin.githubUrl || plugin.documentationUrl) && (
							<Card>
								<CardHeader>
									<CardTitle className="text-base sm:text-lg">Ссылки</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2 pt-0 sm:space-y-3">
									{plugin.githubUrl && (
										<Link
											href={plugin.githubUrl}
											target="_blank"
											className="flex items-center gap-2 text-xs hover:text-primary sm:text-sm"
										>
											<Github className="h-3 w-3 sm:h-4 sm:w-4" />
											<span>Исходный код</span>
											<ExternalLink className="h-2 w-2 sm:h-3 sm:w-3" />
										</Link>
									)}
									{plugin.documentationUrl && (
										<Link
											href={plugin.documentationUrl}
											target="_blank"
											className="flex items-center gap-2 text-xs hover:text-primary sm:text-sm"
										>
											<FileText className="h-3 w-3 sm:h-4 sm:w-4" />
											<span>Документация</span>
											<ExternalLink className="h-2 w-2 sm:h-3 sm:w-3" />
										</Link>
									)}
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
