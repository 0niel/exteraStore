"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Grid2X2, List, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { CatalogPagination } from "~/components/catalog-pagination";
import { PageHeader } from "~/components/page-header";
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

const parsePage = (value: string | null) => {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

function CatalogSkeleton({ compact = false }: { compact?: boolean }) {
	return (
		<div
			className={cn(
				compact
					? "space-y-3"
					: "grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3",
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
	const resultsRef = useRef<HTMLDivElement>(null);
	const initialSort = searchParams.get("sort");
	const featuredOnly = searchParams.get("featured") === "true";
	const currentQuery = searchParams.toString();
	const [search, setSearch] = useState(searchParams.get("search") || "");
	const [category, setCategory] = useState(searchParams.get("category") || "");
	const [sortBy, setSortBy] = useState<SortOption>(
		isSortOption(initialSort) ? initialSort : "newest",
	);
	const [exteralessOnly, setExteralessOnly] = useState(
		searchParams.get("exteraless") === "1",
	);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const page = parsePage(searchParams.get("page"));
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
		exteralessOnly: exteralessOnly || undefined,
	});
	const { data: categories } = api.plugins.getCategories.useQuery();

	useEffect(() => {
		const params = new URLSearchParams();
		if (debouncedSearch) params.set("search", debouncedSearch);
		if (category) params.set("category", category);
		if (sortBy !== "newest") params.set("sort", sortBy);
		if (featuredOnly) params.set("featured", "true");
		if (exteralessOnly) params.set("exteraless", "1");
		const filtersMatchUrl =
			(searchParams.get("search") || "") === debouncedSearch &&
			(searchParams.get("category") || "") === category &&
			(searchParams.get("sort") || "newest") === sortBy &&
			(searchParams.get("exteraless") === "1") === exteralessOnly;
		if (filtersMatchUrl && page > 1) params.set("page", String(page));
		const queryString = params.toString();
		if (queryString !== currentQuery) {
			router.replace(queryString ? `/plugins?${queryString}` : "/plugins", {
				scroll: false,
			});
		}
	}, [
		category,
		currentQuery,
		debouncedSearch,
		exteralessOnly,
		featuredOnly,
		page,
		router,
		searchParams,
		sortBy,
	]);

	useEffect(() => {
		if (!pluginsData || pluginsData.totalPages < 1) return;
		if (page <= pluginsData.totalPages) return;
		const params = new URLSearchParams(currentQuery);
		if (pluginsData.totalPages === 1) params.delete("page");
		else params.set("page", String(pluginsData.totalPages));
		const query = params.toString();
		router.replace(query ? `/plugins?${query}` : "/plugins", { scroll: false });
	}, [currentQuery, page, pluginsData, router]);

	const hasFilters =
		Boolean(search) ||
		Boolean(category) ||
		sortBy !== "newest" ||
		featuredOnly ||
		exteralessOnly;

	const clearFilters = () => {
		setSearch("");
		setCategory("");
		setSortBy("newest");
		setExteralessOnly(false);
		router.replace("/plugins", { scroll: false });
	};

	const selectCategory = (slug: string) => {
		setCategory(slug);
	};

	const getPageHref = (targetPage: number) => {
		const params = new URLSearchParams(currentQuery);
		if (targetPage <= 1) params.delete("page");
		else params.set("page", String(targetPage));
		const query = params.toString();
		return query ? `/plugins?${query}` : "/plugins";
	};

	const handlePageNavigate = () => {
		window.requestAnimationFrame(() => {
			resultsRef.current?.scrollIntoView({
				behavior: prefersReducedMotion ? "auto" : "smooth",
				block: "start",
			});
		});
	};

	const sortOptions: Array<{ value: SortOption; label: string }> = [
		{ value: "newest", label: t("sort_newest") },
		{ value: "popular", label: t("sort_popular") },
		{ value: "rating", label: t("sort_rating") },
		{ value: "downloads", label: t("sort_downloads") },
	];
	const categoryNames = new Map(
		categories?.map((item: PluginCategory) => [item.slug, item.name]) ?? [],
	);

	return (
		<div className="min-h-[60dvh]">
			<header className="section-band relative overflow-hidden border-t-0">
				<div
					className="pointer-events-none absolute -top-28 left-1/4 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
					aria-hidden="true"
				/>
				<div className="container mx-auto px-4 pt-8 sm:pt-12">
					<PageHeader
						align="left"
						badge={t("badge")}
						title={t("title")}
						description={t("subtitle")}
						icon={Grid2X2}
					/>
				</div>
			</header>

			<div className="container mx-auto px-4 py-6 sm:py-8">
				<div className="sticky top-0 z-20 -mx-4 mb-7 max-w-full overflow-hidden bg-background/96 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:bg-surface sm:p-4">
					<div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(16rem,1fr)_13rem_auto]">
						<label className="relative block">
							<span className="sr-only">{t("search_label")}</span>
							<Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
								}}
								placeholder={t("search_placeholder")}
								className="h-11 rounded-2xl bg-background/80 pr-11 pl-10"
							/>
							{search && (
								<button
									type="button"
									onClick={() => {
										setSearch("");
									}}
									className="press-scale absolute top-1/2 right-0 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									aria-label={t("clear_search")}
								>
									<X className="size-4" />
								</button>
							)}
						</label>

						<Select
							value={sortBy}
							onValueChange={(value) => {
								setSortBy(value as SortOption);
							}}
						>
							<SelectTrigger
								className="h-11 w-full rounded-2xl bg-background/80"
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

					<fieldset className="scrollbar-hide -mx-4 mt-3 flex w-auto min-w-0 max-w-[calc(100%+2rem)] snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:flex-wrap sm:overflow-visible sm:px-0">
						<legend className="sr-only">{t("category_label")}</legend>
						<button
							type="button"
							onClick={() => selectCategory("")}
							className={cn(
								"press-scale min-h-11 shrink-0 snap-start rounded-full border px-4 font-medium text-sm transition-all duration-200 ease-[var(--ease-spring)]",
								category === ""
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-background/70 backdrop-blur hover:border-primary/40 hover:bg-primary/5",
							)}
							aria-pressed={category === ""}
						>
							{t("all_categories")}
							{category === "" && pluginsData && (
								<span className="ml-2 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 font-mono text-xs">
									{pluginsData.totalCount}
								</span>
							)}
						</button>
						{categories?.map((item: PluginCategory) => (
							<button
								key={item.id}
								type="button"
								onClick={() => selectCategory(item.slug)}
								className={cn(
									"press-scale min-h-11 shrink-0 snap-start rounded-full border px-4 font-medium text-sm transition-all duration-200 ease-[var(--ease-spring)]",
									category === item.slug
										? "border-primary bg-primary text-primary-foreground"
										: "border-border bg-background/70 backdrop-blur hover:border-primary/40 hover:bg-primary/5",
								)}
								aria-pressed={category === item.slug}
							>
								{item.name}
								{category === item.slug && pluginsData && (
									<span className="ml-2 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 font-mono text-xs">
										{pluginsData.totalCount}
									</span>
								)}
							</button>
						))}
						<button
							type="button"
							onClick={() => {
								setExteralessOnly((current) => !current);
							}}
							className={cn(
								"press-scale min-h-11 shrink-0 snap-start rounded-full border px-4 font-medium text-sm transition-all duration-200 ease-[var(--ease-spring)]",
								exteralessOnly
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-background/70 backdrop-blur hover:border-primary/40 hover:bg-primary/5",
							)}
							aria-pressed={exteralessOnly}
						>
							{t("exteraless_only")}
						</button>
					</fieldset>
				</div>

				<div
					ref={resultsRef}
					className="mb-5 flex min-h-11 scroll-mt-28 items-center justify-between gap-3"
				>
					<div className="flex min-w-0 items-center gap-2">
						<span className="eyebrow truncate" aria-live="polite">
							{isLoading
								? t("loading")
								: t("results_count", { count: pluginsData?.totalCount ?? 0 })}
						</span>
						{isFetching && !isLoading && (
							<span className="size-2 animate-pulse-dot rounded-full bg-primary" />
						)}
					</div>
					<fieldset className="flex min-w-0 rounded-2xl bg-surface p-1">
						<legend className="sr-only">{t("view_label")}</legend>
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							className={cn(
								"press-scale flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-colors",
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
								"press-scale flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-colors",
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
								? "grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3"
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
										categoryLabel={categoryNames.get(plugin.category)}
										compact={viewMode === "list"}
										className="h-full min-w-0 max-w-full"
									/>
								</motion.div>
							))}
						</AnimatePresence>
					</motion.div>
				)}

				{pluginsData && pluginsData.totalPages > 1 && (
					<CatalogPagination
						currentPage={page}
						totalPages={pluginsData.totalPages}
						totalItems={pluginsData.totalCount}
						pageSize={12}
						getHref={getPageHref}
						onNavigate={handlePageNavigate}
					/>
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
