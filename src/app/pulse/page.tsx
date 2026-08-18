"use client";

import { Activity, MessageSquare, Package, Star, Tag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "~/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";

function formatTimeAgo(tsSec: number) {
	const diffMs = Date.now() - tsSec * 1000;
	const sec = Math.floor(diffMs / 1000);
	if (sec < 60) return `${sec}с назад`;
	const min = Math.floor(sec / 60);
	if (min < 60) return `${min}м назад`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}ч назад`;
	const d = Math.floor(hr / 24);
	return `${d}д назад`;
}

function formatDayLabel(tsSec: number) {
	const d = new Date(tsSec * 1000);
	const today = new Date();
	const startOfToday = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
	);
	const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	const diffDays = Math.round(
		(startOfToday.getTime() - startOfDay.getTime()) / (1000 * 60 * 60 * 24),
	);
	if (diffDays === 0) return "Сегодня";
	if (diffDays === 1) return "Вчера";
	return d.toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

export default function PulsePage() {
	const [page, setPage] = useState(1);
	const [tab, setTab] = useState<
		"all" | "plugin.created" | "version.released" | "review.added"
	>("all");

	const activeTypes = tab === "all" ? undefined : [tab];
	const { data, isLoading, isFetching } = api.pulse.get.useQuery({
		page,
		limit: 20,
		types: activeTypes,
	});

	const items = data?.items ?? [];
	const totalPages = data?.pagination.totalPages ?? 1;

	const groups = useMemo(() => {
		const g: Record<string, any[]> = {};
		for (const it of items) {
			const key = formatDayLabel(it.createdAt);
			g[key] = g[key] || [];
			g[key].push(it);
		}
		return g;
	}, [items]);

	const renderIcon = (type: string) => {
		if (type === "plugin.created")
			return <Package className="h-4 w-4 text-white" />;
		if (type === "version.released")
			return <Tag className="h-4 w-4 text-white" />;
		return <Star className="h-4 w-4 text-white" />;
	};

	const bubbleClass = (type: string) =>
		type === "plugin.created"
			? "bg-gradient-to-br from-emerald-500 to-teal-500"
			: type === "version.released"
				? "bg-gradient-to-br from-violet-500 to-fuchsia-500"
				: "bg-gradient-to-br from-amber-500 to-orange-500";

	return (
		<div className="bg-background">
			<div className="container mx-auto px-4 py-8">
				<PageHeader
					badge="Активность"
					title="Пульс экстератора"
					description="Живая лента событий: публикации плагинов, релизы версий и отзывы"
					icon={Activity}
				/>

				<Card className="mb-6 overflow-hidden">
					<CardContent className="p-3 sm:p-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<Tabs
								value={tab}
								onValueChange={(v) => {
									setTab(v as any);
									setPage(1);
								}}
								className="w-full sm:w-auto"
							>
								<TabsList className="grid w-full grid-cols-4">
									<TabsTrigger value="all" className="text-xs sm:text-sm">
										Все
									</TabsTrigger>
									<TabsTrigger
										value="plugin.created"
										className="text-xs sm:text-sm"
									>
										<Package className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
										<span className="hidden sm:inline">Плагины</span>
									</TabsTrigger>
									<TabsTrigger
										value="version.released"
										className="text-xs sm:text-sm"
									>
										<Tag className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
										<span className="hidden sm:inline">Релизы</span>
									</TabsTrigger>
									<TabsTrigger
										value="review.added"
										className="text-xs sm:text-sm"
									>
										<Star className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
										<span className="hidden sm:inline">Отзывы</span>
									</TabsTrigger>
								</TabsList>
							</Tabs>
							<div className="flex items-center gap-2">
								{!isLoading && (
									<Badge variant="secondary" className="text-xs">
										{data?.pagination.total ?? 0}{" "}
										{tab === "all"
											? "событий"
											: tab === "plugin.created"
												? "плагинов"
												: tab === "version.released"
													? "релизов"
													: "отзывов"}
									</Badge>
								)}
								{isLoading && (
									<span className="text-muted-foreground text-xs">
										Загрузка...
									</span>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				{isLoading ? (
					<div className="space-y-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Card key={i}>
								<CardContent className="p-0">
									<div className="flex items-start gap-3 p-3 sm:p-4">
										<Skeleton className="h-8 w-8 shrink-0 rounded-full" />
										<div className="min-w-0 flex-1 space-y-2">
											<div className="flex items-center justify-between gap-2">
												<div className="flex items-center gap-2">
													<Skeleton className="h-6 w-6 rounded-full" />
													<Skeleton className="h-4 w-24" />
												</div>
												<Skeleton className="h-3 w-16" />
											</div>
											<Skeleton className="h-4 w-3/4" />
											<div className="flex gap-2">
												<Skeleton className="h-5 w-16" />
												<Skeleton className="h-5 w-20" />
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				) : items.length === 0 ? (
					<EmptyState
						icon={
							tab === "plugin.created"
								? "📦"
								: tab === "version.released"
									? "🏷️"
									: tab === "review.added"
										? "⭐"
										: "🫧"
						}
						title={
							tab === "plugin.created"
								? "Новых плагинов пока нет"
								: tab === "version.released"
									? "Новых релизов пока нет"
									: tab === "review.added"
										? "Новых отзывов пока нет"
										: "Пока пусто"
						}
						description={
							tab === "plugin.created"
								? "Здесь появятся новые плагины от разработчиков"
								: tab === "version.released"
									? "Здесь появятся обновления плагинов"
									: tab === "review.added"
										? "Здесь появятся отзывы пользователей"
										: "Новые события появятся здесь. Загляните позже."
						}
					/>
				) : (
					<div className="relative">
						{Object.entries(groups).map(([day, list]) => (
							<div key={day} className="mb-8">
								<div className="mb-3 flex items-center gap-2">
									<div className="h-px flex-1 bg-border" />
									<span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
										{day}
									</span>
									<div className="h-px flex-1 bg-border" />
								</div>
								<div className="space-y-3">
									{list.map((it: any, idx: number) => (
										<Card
											key={it.id}
											className="group overflow-hidden transition-shadow hover:shadow-md"
										>
											<CardContent className="p-0">
												<div className="flex items-start gap-3 p-3 sm:p-4">
													<div
														className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${bubbleClass(it.type)} shadow-sm`}
													>
														{renderIcon(it.type)}
													</div>

													<div className="min-w-0 flex-1 space-y-2">
														<div className="flex items-start justify-between gap-2">
															<div className="flex items-center gap-2">
																<Avatar className="h-6 w-6 border">
																	<AvatarImage
																		src={it.actor?.image ?? undefined}
																	/>
																	<AvatarFallback className="text-xs">
																		{(it.actor?.name ?? "??")
																			.slice(0, 2)
																			.toUpperCase()}
																	</AvatarFallback>
																</Avatar>
																<span className="font-medium text-sm">
																	{it.actor?.name ?? "Unknown"}
																</span>
															</div>
															<span className="whitespace-nowrap text-muted-foreground text-xs">
																{formatTimeAgo(it.createdAt)}
															</span>
														</div>

														<div className="space-y-1.5">
															{it.type === "plugin.created" && (
																<>
																	<div className="flex items-center gap-2 text-sm">
																		<span className="text-muted-foreground">
																			Опубликовал новый плагин
																		</span>
																	</div>
																	<Link
																		className="group/link inline-flex items-baseline gap-2 hover:underline"
																		href={`/plugins/${it.plugin?.slug}`}
																	>
																		<span className="font-bold text-base leading-tight">
																			{it.plugin?.name}
																		</span>
																		{it.plugin &&
																			JSON.parse(it.data || "{}").version && (
																				<Badge
																					variant="outline"
																					className="text-xs"
																				>
																					v{JSON.parse(it.data || "{}").version}
																				</Badge>
																			)}
																	</Link>
																	{it.message && (
																		<p className="line-clamp-2 text-muted-foreground text-sm">
																			{it.message}
																		</p>
																	)}
																</>
															)}

															{it.type === "version.released" && (
																<>
																	<div className="flex items-center gap-2 text-sm">
																		<span className="text-muted-foreground">
																			Обновление для
																		</span>
																		<Link
																			className="font-medium hover:underline"
																			href={`/plugins/${it.plugin?.slug}`}
																		>
																			{it.plugin?.name}
																		</Link>
																	</div>
																	<div className="flex flex-wrap items-center gap-2">
																		<Badge
																			variant="default"
																			className="gap-1 px-2.5 py-1"
																		>
																			<Tag className="h-3 w-3" />v
																			{it.version?.version}
																		</Badge>
																		{JSON.parse(it.data || "{}").isStable ===
																		false ? (
																			<Badge
																				variant="outline"
																				className="border-amber-500/50 text-amber-600 text-xs dark:text-amber-400"
																			>
																				🧪 Бета-версия
																			</Badge>
																		) : (
																			<Badge
																				variant="outline"
																				className="border-green-500/50 text-green-600 text-xs dark:text-green-400"
																			>
																				✓ Стабильная
																			</Badge>
																		)}
																	</div>
																	{it.message &&
																		it.message !==
																			`v${it.version?.version}` && (
																			<div className="rounded-md border-violet-400 border-l-2 bg-muted/50 py-1.5 pr-2 pl-3 text-sm">
																				<p className="line-clamp-2">
																					{it.message}
																				</p>
																			</div>
																		)}
																</>
															)}

															{it.type === "review.added" && (
																<>
																	<div className="text-sm">
																		<span className="text-muted-foreground">
																			Оставил отзыв на плагин
																		</span>{" "}
																		<Link
																			className="font-medium hover:underline"
																			href={`/plugins/${it.plugin?.slug}`}
																		>
																			{it.plugin?.name}
																		</Link>
																	</div>

																	{(() => {
																		const displayRating =
																			it.review?.rating ?? it.rating;
																		return (
																			displayRating !== null &&
																			displayRating !== undefined && (
																				<div className="flex items-center gap-2">
																					<div className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 py-1.5 dark:from-amber-950/30 dark:to-orange-950/30">
																						{Array.from({ length: 5 }).map(
																							(_, i) => (
																								<Star
																									key={i}
																									className={`h-4 w-4 ${
																										i < displayRating
																											? "fill-amber-500 text-amber-500"
																											: "fill-muted-foreground/30 text-muted-foreground/30"
																									}`}
																								/>
																							),
																						)}
																						<span className="ml-1.5 font-bold text-amber-600 text-sm dark:text-amber-400">
																							{displayRating}/5
																						</span>
																					</div>
																					{it.review?.comment && (
																						<Badge
																							variant="outline"
																							className="gap-1 text-xs"
																						>
																							<MessageSquare className="h-3 w-3" />
																							С комментарием
																						</Badge>
																					)}
																				</div>
																			)
																		);
																	})()}

																	{it.review?.title && (
																		<div className="font-medium text-sm">
																			{it.review.title}
																		</div>
																	)}

																	{it.review?.comment && (
																		<div className="rounded-lg border bg-muted/30 p-3 text-sm">
																			<div className="mb-1 flex items-center gap-1.5 text-muted-foreground text-xs">
																				<MessageSquare className="h-3.5 w-3.5" />
																				<span>Комментарий:</span>
																			</div>
																			<p className="line-clamp-4 leading-relaxed">
																				{it.review.comment}
																			</p>
																			<Link
																				href={`/plugins/${it.plugin?.slug}`}
																				className="mt-2 inline-flex text-primary text-xs hover:underline"
																			>
																				Читать полностью →
																			</Link>
																		</div>
																	)}

																	{!it.review?.comment && !it.review?.title && (
																		<div className="text-muted-foreground text-xs italic">
																			Отзыв без комментария
																		</div>
																	)}
																</>
															)}
														</div>
													</div>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							</div>
						))}
					</div>
				)}

				{totalPages > 1 && (
					<div className="mt-6 flex justify-center gap-2">
						<Button
							variant="outline"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1 || isFetching}
						>
							← Назад
						</Button>
						<Button
							variant="outline"
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							disabled={page === totalPages || isFetching}
						>
							Вперед →
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
