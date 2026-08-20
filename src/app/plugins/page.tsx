"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";
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
				<div
					key={index}
					className={cn(
						"skeleton-shimmer rounded-xl",
						compact ? "h-24" : "h-104",
					)}
				/>
			))}
		</div>
	);
}

function PluginsContent() {
	const t = useTranslations("PluginsPage");
	const searchParams = useSearchParams();
	const router = useRouter();
	const prefersReducedMotion = useReducedMotion();
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

	const clearFilters = () => {
		setSearch("");
		setCategory("");
		setSortBy("newest");
		setPage(1);
		router.replace("/plugins", { scroll: false });
	};

	const selectCategory = (slug: string) => {
		setCategory(slug);
		setPage(1);
	};

	const sortOptions: Array<{ value: SortOption; label: string }> = [
		{ value: "newest", label: t("sort_newest") },
		{ value: "popular", label: t("sort_popular") },
		{ value: "rating", label: t("sort_rating") },
		{ value: "downloads", label: t("sort_downloads") },
	];

	return (
		<div className="min-h-[60dvh]">
			<header className="border-b bg-muted/20">
				<div className="container mx-auto animate-fade-up px-4 py-8 sm:py-12">
					<p className="font-medium text-primary text-sm">{t("badge")}</p>
					<h1 className="mt-2 text-balance font-bold text-3xl tracking-tight sm:text-5xl">
						{t("title")}
					</h1>
					<p className="mt-3 max-w-2xl text-muted-foreground sm:text-lg">
						{t("subtitle")}
					</p>
				</div>
			</header>

			<div className="container mx-auto px-4 py-6 sm:py-8">
				<div className="glass sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 mb-7 border-b px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border sm:p-4">
					<div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_13rem_13rem_auto]">
						<label className="relative block">
							<span className="sr-only">{t("search_label")}</span>
							<Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder={t("search_placeholder")}
								className="h-11 pr-11 pl-10"
							/>
							{search && (
								<button
									type="button"
									onClick={() => {
										setSearch("");
										setPage(1);
									}}
									className="press-scale absolute top-1/2 right-0 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									aria-label={t("clear_search")}
								>
									<X className="size-4" />
								</button>
							)}
						</label>

						<Select
							value={category || "all"}
							onValueChange={(value) =>
								selectCategory(value === "all" ? "" : value)
							}
						>
							<SelectTrigger
								className="hidden h-11 w-full md:flex"
								aria-label={t("category_label")}
							>
								<SelectValue placeholder={t("all_categories")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t("all_categories")}</SelectItem>
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
							<SelectTrigger
								className="h-11 w-full"
								aria-label={t("sort_label")}
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{sortOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{hasFilters && (
							<Button
								variant="ghost"
								className="min-h-11"
								onClick={clearFilters}
							>
								<X />
								{t("reset_filters")}
							</Button>
						)}
					</div>

					<fieldset className="scrollbar-hide -mx-4 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 md:hidden">
						<legend className="sr-only">{t("category_label")}</legend>
						<button
							type="button"
							onClick={() => selectCategory("")}
							className={cn(
								"press-scale min-h-11 shrink-0 snap-start rounded-full border px-4 font-medium text-sm transition-colors",
								category === ""
									? "border-contrast bg-contrast text-contrast-foreground"
									: "bg-background/70 backdrop-blur hover:border-primary/40",
							)}
							aria-pressed={category === ""}
						>
							{t("all_categories")}
						</button>
						{categories?.map((item: PluginCategory) => (
							<button
								key={item.id}
								type="button"
								onClick={() => selectCategory(item.slug)}
								className={cn(
									"press-scale min-h-11 shrink-0 snap-start rounded-full border px-4 font-medium text-sm transition-colors",
									category === item.slug
										? "border-contrast bg-contrast text-contrast-foreground"
										: "bg-background/70 backdrop-blur hover:border-primary/40",
								)}
								aria-pressed={category === item.slug}
							>
								{item.name}
							</button>
						))}
					</fieldset>
				</div>

				<div className="mb-5 flex min-h-11 items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-2 text-muted-foreground text-sm">
						<SlidersHorizontal className="size-4 shrink-0" />
						<span className="truncate" aria-live="polite">
							{isLoading
								? t("loading")
								: t("results_count", { count: pluginsData?.totalCount ?? 0 })}
						</span>
						{isFetching && !isLoading && (
							<span className="size-2 animate-pulse-dot rounded-full bg-primary" />
						)}
					</div>
					<fieldset className="flex rounded-xl border p-1">
						<legend className="sr-only">{t("view_label")}</legend>
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							className={cn(
								"press-scale flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors",
								viewMode === "grid"
									? "bg-primary text-primary-foreground"
									: "hover:bg-muted",
							)}
							aria-label={t("view_grid")}
							aria-pressed={viewMode === "grid"}
						>
							<Grid2X2 className="size-4" />
						</button>
						<button
							type="button"
							onClick={() => setViewMode("list")}
							className={cn(
								"press-scale flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors",
								viewMode === "list"
									? "bg-primary text-primary-foreground"
									: "hover:bg-muted",
							)}
							aria-label={t("view_list")}
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
						title={t("error_title")}
						description={t("error_description")}
						actionLabel={t("retry")}
						onAction={() => void refetch()}
					/>
				) : pluginsData?.plugins.length === 0 ? (
					<EmptyState
						icon="⌕"
						title={t("empty_title")}
						description={t("empty_description")}
						actionLabel={t("reset_filters")}
						onAction={clearFilters}
					/>
				) : (
					<motion.div
						layout={!prefersReducedMotion}
						className={cn(
							viewMode === "grid"
								? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
								: "space-y-3",
						)}
					>
						<AnimatePresence mode="popLayout" initial={false}>
							{pluginsData?.plugins.map((plugin, index) => (
								<motion.div
									key={plugin.id}
									layout={!prefersReducedMotion}
									initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
									animate={{ opacity: 1, y: 0 }}
									exit={
										prefersReducedMotion
											? undefined
											: { opacity: 0, scale: 0.97 }
									}
									transition={{
										duration: 0.4,
										ease: [0.16, 1, 0.3, 1],
										delay: Math.min(index * 0.04, 0.32),
									}}
								>
									<PluginCard
										plugin={plugin}
										compact={viewMode === "list"}
										className="h-full"
									/>
								</motion.div>
							))}
						</AnimatePresence>
					</motion.div>
				)}

				{pluginsData && pluginsData.totalPages > 1 && (
					<nav
						className="mt-8 flex items-center justify-between gap-3 border-t pt-6"
						aria-label={t("pagination_label")}
					>
						<Button
							variant="outline"
							className="press-scale min-h-11"
							disabled={page === 1}
							onClick={() => {
								setPage((current) => Math.max(1, current - 1));
								window.scrollTo({ top: 0, behavior: "smooth" });
							}}
							aria-label={t("prev_page")}
						>
							<ChevronLeft />
							<span className="hidden sm:inline">{t("prev_page")}</span>
						</Button>
						<span className="text-center text-muted-foreground text-sm">
							{t("page_of", { page, total: pluginsData.totalPages })}
						</span>
						<Button
							variant="outline"
							className="press-scale min-h-11"
							disabled={page === pluginsData.totalPages}
							onClick={() => {
								setPage((current) =>
									Math.min(pluginsData.totalPages, current + 1),
								);
								window.scrollTo({ top: 0, behavior: "smooth" });
							}}
							aria-label={t("next_page")}
						>
							<span className="hidden sm:inline">{t("next_page")}</span>
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
