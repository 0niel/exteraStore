"use client";

import {
	ChevronLeft,
	ChevronRight,
	Grid2X2,
	List,
	Search,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { PluginCard } from "~/components/plugin-card";
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
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type SortOption = "newest" | "popular" | "rating" | "downloads";

interface PluginCategory {
	id: number;
	slug: string;
	name: string;
}

const isSortOption = (value: string | null): value is SortOption =>
	value === "newest" ||
	value === "popular" ||
	value === "rating" ||
	value === "downloads";

function CatalogSkeleton({ compact = false }: { compact?: boolean }) {
	return (
		<div
			className={cn(
				compact ? "space-y-3" : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3",
			)}
		>
			{Array.from({ length: compact ? 6 : 9 }).map((_, index) => (
				<Skeleton
					key={index}
					className={cn("rounded-xl", compact ? "h-28" : "h-104")}
				/>
			))}
		</div>
	);
}

function PluginsContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const initialSort = searchParams.get("sort");
	const featuredOnly = searchParams.get("featured") === "true";
	const currentQuery = searchParams.toString();
	const [search, setSearch] = useState(searchParams.get("search") || "");
	const [category, setCategory] = useState(searchParams.get("category") || "");
	const [sortBy, setSortBy] = useState<SortOption>(
		isSortOption(initialSort) ? initialSort : "newest",
	);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [page, setPage] = useState(1);
	const [debouncedSearch] = useDebounce(search.trim(), 250);

	const {
		data: pluginsData,
		isLoading,
		isFetching,
		isError,
		refetch,
	} = api.plugins.getAll.useQuery({
		page,
		limit: 12,
		search: debouncedSearch || undefined,
		category: category || undefined,
		sortBy,
		featured: featuredOnly || undefined,
	});
	const { data: categories } = api.plugins.getCategories.useQuery();

	useEffect(() => {
		const params = new URLSearchParams();
		if (debouncedSearch) params.set("search", debouncedSearch);
		if (category) params.set("category", category);
		if (sortBy !== "newest") params.set("sort", sortBy);
		if (featuredOnly) params.set("featured", "true");
		const queryString = params.toString();
		if (queryString !== currentQuery) {
			router.replace(queryString ? `/plugins?${queryString}` : "/plugins", {
				scroll: false,
			});
		}
	}, [category, currentQuery, debouncedSearch, featuredOnly, router, sortBy]);

	const hasFilters =
		Boolean(search) || Boolean(category) || sortBy !== "newest" || featuredOnly;

	const pageLabel = useMemo(() => {
		if (!pluginsData) return "";
		const from = (page - 1) * 12 + 1;
		const to = Math.min(page * 12, pluginsData.totalCount);
		return `${from}–${to} из ${pluginsData.totalCount}`;
	}, [page, pluginsData]);

	const clearFilters = () => {
		setSearch("");
		setCategory("");
		setSortBy("newest");
		setPage(1);
		router.replace("/plugins", { scroll: false });
	};

	return (
		<div className="min-h-[70vh]">
			<header className="border-b bg-muted/20">
				<div className="container mx-auto px-4 py-8 sm:py-12">
					<p className="font-medium text-primary text-sm">Каталог exteraGram</p>
					<h1 className="mt-2 text-balance font-bold text-3xl tracking-tight sm:text-5xl">
						Найдите плагин под свою задачу
					</h1>
					<p className="mt-3 max-w-2xl text-muted-foreground sm:text-lg">
						Ищите по названию, выбирайте категорию и сортируйте по реальным
						оценкам сообщества.
					</p>
				</div>
			</header>

			<div className="container mx-auto px-4 py-6 sm:py-8">
				<div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 mb-7 border-b bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:p-4">
					<div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_13rem_13rem_auto]">
						<label className="relative block">
							<span className="sr-only">Поиск по каталогу</span>
							<Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Название плагина"
								className="h-11 pr-11 pl-10"
							/>
							{search && (
								<button
									type="button"
									onClick={() => {
										setSearch("");
										setPage(1);
									}}
									className="absolute top-1/2 right-0 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									aria-label="Очистить поиск"
								>
									<X className="size-4" />
								</button>
							)}
						</label>

						<Select
							value={category || "all"}
							onValueChange={(value) => {
								setCategory(value === "all" ? "" : value);
								setPage(1);
							}}
						>
							<SelectTrigger className="h-11 w-full" aria-label="Категория">
								<SelectValue placeholder="Все категории" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Все категории</SelectItem>
								{categories?.map((item: PluginCategory) => (
									<SelectItem key={item.id} value={item.slug}>
										{item.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={sortBy}
							onValueChange={(value) => {
								setSortBy(value as SortOption);
								setPage(1);
							}}
						>
							<SelectTrigger className="h-11 w-full" aria-label="Сортировка">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="newest">Сначала новые</SelectItem>
								<SelectItem value="popular">Популярные</SelectItem>
								<SelectItem value="rating">По рейтингу</SelectItem>
								<SelectItem value="downloads">По загрузкам</SelectItem>
							</SelectContent>
						</Select>

						{hasFilters && (
							<Button variant="ghost" onClick={clearFilters}>
								<X />
								Сбросить
							</Button>
						)}
					</div>
				</div>

				<div className="mb-5 flex min-h-11 items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-2 text-muted-foreground text-sm">
						<SlidersHorizontal className="size-4 shrink-0" />
						<span className="truncate">
							{isLoading ? "Загружаем каталог" : pageLabel}
						</span>
						{isFetching && !isLoading && (
							<span className="size-2 animate-pulse rounded-full bg-primary" />
						)}
					</div>
					<fieldset className="flex rounded-xl border p-1">
						<legend className="sr-only">Вид каталога</legend>
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							className={cn(
								"flex size-11 items-center justify-center rounded-lg transition-colors",
								viewMode === "grid"
									? "bg-primary text-primary-foreground"
									: "hover:bg-muted",
							)}
							aria-label="Сетка"
							aria-pressed={viewMode === "grid"}
						>
							<Grid2X2 className="size-4" />
						</button>
						<button
							type="button"
							onClick={() => setViewMode("list")}
							className={cn(
								"flex size-11 items-center justify-center rounded-lg transition-colors",
								viewMode === "list"
									? "bg-primary text-primary-foreground"
									: "hover:bg-muted",
							)}
							aria-label="Список"
							aria-pressed={viewMode === "list"}
						>
							<List className="size-4" />
						</button>
					</fieldset>
				</div>

				{isLoading ? (
					<CatalogSkeleton compact={viewMode === "list"} />
				) : isError ? (
					<EmptyState
						icon="↻"
						title="Не удалось загрузить каталог"
						description="Проверьте соединение и повторите попытку."
						actionLabel="Повторить"
						onAction={() => void refetch()}
					/>
				) : pluginsData?.plugins.length === 0 ? (
					<EmptyState
						icon="⌕"
						title="Плагины не найдены"
						description="Измените запрос или сбросьте фильтры."
						actionLabel="Сбросить фильтры"
						onAction={clearFilters}
					/>
				) : (
					<div
						className={cn(
							viewMode === "grid"
								? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
								: "space-y-3",
						)}
					>
						{pluginsData?.plugins.map((plugin) => (
							<PluginCard
								key={plugin.id}
								plugin={plugin}
								compact={viewMode === "list"}
							/>
						))}
					</div>
				)}

				{pluginsData && pluginsData.totalPages > 1 && (
					<nav
						className="mt-8 flex items-center justify-between gap-3 border-t pt-6"
						aria-label="Страницы каталога"
					>
						<Button
							variant="outline"
							disabled={page === 1}
							onClick={() => {
								setPage((current) => Math.max(1, current - 1));
								window.scrollTo({ top: 0, behavior: "smooth" });
							}}
							aria-label="Предыдущая страница"
						>
							<ChevronLeft />
							<span className="hidden sm:inline">Назад</span>
						</Button>
						<span className="text-center text-muted-foreground text-sm">
							<span className="font-medium text-foreground">{page}</span> из{" "}
							{pluginsData.totalPages}
						</span>
						<Button
							variant="outline"
							disabled={page === pluginsData.totalPages}
							onClick={() => {
								setPage((current) =>
									Math.min(pluginsData.totalPages, current + 1),
								);
								window.scrollTo({ top: 0, behavior: "smooth" });
							}}
							aria-label="Следующая страница"
						>
							<span className="hidden sm:inline">Дальше</span>
							<ChevronRight />
						</Button>
					</nav>
				)}
			</div>
		</div>
	);
}

export default function PluginsPage() {
	return (
		<Suspense fallback={<CatalogSkeleton />}>
			<PluginsContent />
		</Suspense>
	);
}
