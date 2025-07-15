"use client";

import { Filter, Grid, List, Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { PageHeader } from "~/components/page-header";
import { PluginCard } from "~/components/plugin-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import type { pluginCategories } from "~/server/db/schema";
import { api } from "~/trpc/react";

function PluginsContent() {
	const searchParams = useSearchParams();
	const [search, setSearch] = useState(searchParams.get("search") || "");
	const [category, setCategory] = useState(searchParams.get("category") || "");
	const [sortBy, setSortBy] = useState<
		"newest" | "popular" | "rating" | "downloads"
	>((searchParams.get("sort") as any) || "newest");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [page, setPage] = useState(1);

	const { data: pluginsData, isLoading } = api.plugins.getAll.useQuery({
		page,
		limit: 12,
		search: search || undefined,
		category: category || undefined,
		sortBy,
		featured: searchParams.get("featured") === "true" || undefined,
	});

	const { data: categories } = api.plugins.getCategories.useQuery();

	const handleSearch = (value: string) => {
		setSearch(value);
		setPage(1);
	};

	const handleCategoryChange = (value: string) => {
		setCategory(value === "all" ? "" : value);
		setPage(1);
	};

	const handleSortChange = (
		value: "newest" | "popular" | "rating" | "downloads",
	) => {
		setSortBy(value);
		setPage(1);
	};

	return (
		<div className="bg-background">
			<div className="container mx-auto px-4 py-8">
				<PageHeader
					badge="Каталог"
					title="Каталог плагинов"
					description="Откройте для себя тысячи плагинов для exteraGram"
					icon={Grid}
				/>

				{/* Search and Filters */}
				<div className="mb-8 space-y-6">
					{/* Search Bar */}
					<div className="relative mx-auto max-w-2xl">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 transform text-muted-foreground" />
						<Input
							placeholder="Поиск плагинов..."
							value={search}
							onChange={(e) => handleSearch(e.target.value)}
							className="h-12 pl-10"
						/>
					</div>

					{/* Filters Row */}
					<div className="rounded-lg border bg-card/50 p-4 backdrop-blur-sm">
						<div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
							<div className="flex flex-wrap gap-3">
								{/* Category Filter */}
								<div className="space-y-1">
									<label className="font-medium text-muted-foreground text-xs">
										Категория
									</label>
									<Select
										value={category || "all"}
										onValueChange={handleCategoryChange}
									>
										<SelectTrigger className="w-40">
											<SelectValue placeholder="Все категории" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">Все категории</SelectItem>
											{categories?.map(
												(cat: typeof pluginCategories.$inferSelect) => (
													<SelectItem key={cat.id} value={cat.slug}>
														{cat.name}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</div>

								{/* Sort Filter */}
								<div className="space-y-1">
									<label className="font-medium text-muted-foreground text-xs">
										Сортировка
									</label>
									<Select value={sortBy} onValueChange={handleSortChange}>
										<SelectTrigger className="w-40">
											<SelectValue placeholder="Сортировка" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="newest">Новые</SelectItem>
											<SelectItem value="popular">Популярные</SelectItem>
											<SelectItem value="rating">По рейтингу</SelectItem>
											<SelectItem value="downloads">По загрузкам</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							{/* Mobile Filters */}
							<Sheet>
								<SheetTrigger asChild>
									<Button variant="outline" className="sm:hidden">
										<SlidersHorizontal className="mr-2 h-4 w-4" />
										Фильтры
									</Button>
								</SheetTrigger>
								<SheetContent>
									<SheetHeader>
										<SheetTitle>Фильтры</SheetTitle>
										<SheetDescription>
											Настройте параметры поиска плагинов
										</SheetDescription>
									</SheetHeader>
									<div className="mt-6 space-y-4">
										{/* Mobile filters content */}
										<div>
											<label className="mb-2 block font-medium text-sm">
												Категория
											</label>
											<Select
												value={category || "all"}
												onValueChange={handleCategoryChange}
											>
												<SelectTrigger>
													<SelectValue placeholder="Выберите категорию" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="all">Все категории</SelectItem>
													{categories?.map(
														(cat: typeof pluginCategories.$inferSelect) => (
															<SelectItem key={cat.id} value={cat.slug}>
																{cat.name}
															</SelectItem>
														),
													)}
												</SelectContent>
											</Select>
										</div>
									</div>
								</SheetContent>
							</Sheet>
						</div>

						{/* View Mode and Results Count */}
						<div className="mt-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
							<div className="text-muted-foreground text-sm">
								{pluginsData && (
									<>
										<span className="font-medium">
											{pluginsData.plugins.length}
										</span>
										<span> из </span>
										<span className="font-medium">
											{pluginsData.totalCount}
										</span>
										<span> плагинов</span>
									</>
								)}
							</div>

							<div className="flex items-center gap-1">
								<Button
									variant={viewMode === "grid" ? "default" : "ghost"}
									size="sm"
									onClick={() => setViewMode("grid")}
									className="h-8 w-8 p-0"
								>
									<Grid className="h-4 w-4" />
								</Button>
								<Button
									variant={viewMode === "list" ? "default" : "ghost"}
									size="sm"
									onClick={() => setViewMode("list")}
									className="h-8 w-8 p-0"
								>
									<List className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>

					{/* Active Filters */}
					{(search || category || searchParams.get("featured")) && (
						<div className="mt-4 flex flex-wrap gap-2">
							<span className="text-muted-foreground text-sm">
								Активные фильтры:
							</span>
							{search && (
								<Badge
									variant="secondary"
									className="cursor-pointer"
									onClick={() => handleSearch("")}
								>
									Поиск: {search} ×
								</Badge>
							)}
							{category && (
								<Badge
									variant="secondary"
									className="cursor-pointer"
									onClick={() => handleCategoryChange("all")}
								>
									Категория:{" "}
									{
										categories?.find(
											(c: typeof pluginCategories.$inferSelect) =>
												c.slug === category,
										)?.name
									}{" "}
									×
								</Badge>
							)}
							{searchParams.get("featured") && (
								<Badge variant="secondary">Рекомендуемые</Badge>
							)}
						</div>
					)}
				</div>

				{/* Results */}
				<div className="mb-8">
					{isLoading ? (
						<div
							className={`${
								viewMode === "grid"
									? "grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
									: "flex flex-col gap-4"
							}`}
						>
							{Array.from({ length: 12 }).map((_, i) => (
								<div
									key={i}
									className="overflow-hidden rounded-lg border bg-card/50 backdrop-blur-sm"
								>
									<Skeleton className="h-32 w-full" />
									<div className="space-y-2 p-4">
										<Skeleton className="h-5 w-3/4" />
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-2/3" />
										<div className="flex items-center justify-between pt-2">
											<Skeleton className="h-4 w-16" />
											<Skeleton className="h-8 w-20" />
										</div>
									</div>
								</div>
							))}
						</div>
					) : pluginsData?.plugins.length === 0 ? (
						<EmptyState
							icon="🔍"
							title="Плагины не найдены"
							description="Попробуйте изменить параметры поиска или фильтры"
							actionLabel="Сбросить фильтры"
							onAction={() => {
								setSearch("");
								setCategory("");
								setPage(1);
							}}
						/>
					) : (
						<div
							className={`${
								viewMode === "grid"
									? "grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
									: "flex flex-col gap-4"
							}`}
						>
							{pluginsData?.plugins.map((plugin: any) => (
								<PluginCard
									key={plugin.id}
									plugin={plugin}
									compact={viewMode === "list"}
									className={viewMode === "list" ? "max-w-none" : ""}
								/>
							))}
						</div>
					)}
				</div>

				{/* Pagination */}
				{pluginsData && pluginsData.totalPages > 1 && (
					<div className="rounded-lg border bg-card/50 p-4 backdrop-blur-sm">
						<div className="flex items-center justify-center gap-2">
							<Button
								variant="outline"
								disabled={page === 1}
								onClick={() => setPage(page - 1)}
								size="sm"
							>
								← Предыдущая
							</Button>

							<div className="flex items-center gap-1">
								{Array.from(
									{ length: Math.min(5, pluginsData.totalPages) },
									(_, i) => {
										const pageNum = i + 1;
										return (
											<Button
												key={pageNum}
												variant={page === pageNum ? "default" : "outline"}
												size="sm"
												onClick={() => setPage(pageNum)}
												className="h-8 w-8 p-0"
											>
												{pageNum}
											</Button>
										);
									},
								)}
								{pluginsData.totalPages > 5 && (
									<>
										<span className="px-1 text-muted-foreground text-sm">
											...
										</span>
										<Button
											variant={
												page === pluginsData.totalPages ? "default" : "outline"
											}
											size="sm"
											onClick={() => setPage(pluginsData.totalPages)}
											className="h-8 w-8 p-0"
										>
											{pluginsData.totalPages}
										</Button>
									</>
								)}
							</div>

							<Button
								variant="outline"
								disabled={page === pluginsData.totalPages}
								onClick={() => setPage(page + 1)}
								size="sm"
							>
								Следующая →
							</Button>
						</div>

						<div className="mt-3 text-center text-muted-foreground text-xs">
							Страница {page} из {pluginsData.totalPages}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default function PluginsPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<PluginsContent />
		</Suspense>
	);
}
