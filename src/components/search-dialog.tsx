"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	Clock3,
	Download,
	Filter,
	Search,
	Star,
	TrendingUp,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { cn, formatNumber, safeJsonParse } from "~/lib/utils";
import { api } from "~/trpc/react";

interface SearchDialogProps {
	trigger?: React.ReactNode;
	placeholder?: string;
	className?: string;
	isMobile?: boolean;
}

type SortOption = "relevance" | "newest" | "popular" | "rating" | "downloads";

interface SearchFilters {
	category: string;
	minRating: number | null;
	sortBy: SortOption;
}

interface SearchResult {
	id: number;
	name: string;
	slug: string;
	shortDescription: string | null;
	author: string;
	category: string;
	rating: number;
	downloadCount: number;
	featured: boolean;
}

interface PopularPlugin {
	id: number;
	name: string;
	slug: string;
	rating: number;
	downloadCount: number;
}

function Highlight({ text, query }: { text: string; query: string }) {
	const normalizedQuery = query.trim().toLocaleLowerCase();
	if (!normalizedQuery) return text;

	const index = text.toLocaleLowerCase().indexOf(normalizedQuery);
	if (index < 0) return text;

	return (
		<>
			{text.slice(0, index)}
			<mark className="rounded-sm bg-primary/10 font-medium text-primary">
				{text.slice(index, index + normalizedQuery.length)}
			</mark>
			{text.slice(index + normalizedQuery.length)}
		</>
	);
}

export function SearchDialog({
	trigger,
	placeholder,
	className,
}: SearchDialogProps) {
	const t = useTranslations("SearchDialog");
	const prefersReducedMotion = useReducedMotion();
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const [showFilters, setShowFilters] = useState(false);
	const [filters, setFilters] = useState<SearchFilters>({
		category: "",
		minRating: null,
		sortBy: "relevance",
	});
	const [debouncedQuery] = useDebounce(query.trim(), 180);

	const {
		data: searchResults,
		isLoading: isSearching,
		isError,
		refetch,
	} = api.plugins.advancedSearch.useQuery(
		{
			query: debouncedQuery,
			limit: 12,
			categories: filters.category ? [filters.category] : undefined,
			minRating: filters.minRating || undefined,
			sortBy: filters.sortBy,
			includeContent: false,
		},
		{ enabled: open && debouncedQuery.length > 0 },
	);
	const { data: popularPlugins, isLoading: isLoadingPopular } =
		api.plugins.getTrending.useQuery(
			{ limit: 5 },
			{ enabled: open && query.trim().length === 0 },
		);
	const { data: categories } = api.categories.getAll.useQuery(undefined, {
		enabled: open,
	});

	useEffect(() => {
		try {
			const saved = localStorage.getItem("recent-searches");
			const parsed = saved ? safeJsonParse<unknown>(saved, []) : [];
			if (Array.isArray(parsed)) {
				setRecentSearches(
					parsed
						.filter((item): item is string => typeof item === "string")
						.slice(0, 6),
				);
			}
		} catch {
			setRecentSearches([]);
		}
	}, []);

	useEffect(() => {
		const handleShortcut = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setOpen(true);
			}
		};
		window.addEventListener("keydown", handleShortcut);
		return () => window.removeEventListener("keydown", handleShortcut);
	}, []);

	useEffect(() => {
		if (open) {
			window.setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [open]);

	const hasActiveFilters =
		Boolean(filters.category) ||
		filters.minRating !== null ||
		filters.sortBy !== "relevance";

	const saveSearch = useCallback(
		(value: string) => {
			const normalized = value.trim();
			if (!normalized) return;
			const updated = [
				normalized,
				...recentSearches.filter(
					(item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase(),
				),
			].slice(0, 6);
			setRecentSearches(updated);
			try {
				localStorage.setItem("recent-searches", JSON.stringify(updated));
			} catch {}
		},
		[recentSearches],
	);

	const buildCatalogUrl = useCallback(
		(value: string) => {
			const params = new URLSearchParams();
			if (value.trim()) params.set("search", value.trim());
			if (filters.category) params.set("category", filters.category);
			if (filters.sortBy !== "relevance") {
				params.set("sort", filters.sortBy);
			}
			return `/plugins${params.size ? `?${params.toString()}` : ""}`;
		},
		[filters],
	);

	const submitSearch = useCallback(
		(value = query) => {
			const normalized = value.trim();
			if (!normalized) return;
			saveSearch(normalized);
			setOpen(false);
			router.push(buildCatalogUrl(normalized));
		},
		[buildCatalogUrl, query, router, saveSearch],
	);

	const clearRecent = () => {
		setRecentSearches([]);
		try {
			localStorage.removeItem("recent-searches");
		} catch {}
	};

	const resetFilters = () =>
		setFilters({ category: "", minRating: null, sortBy: "relevance" });

	const defaultTrigger = (
		<Button
			variant="outline"
			className={cn("justify-start text-muted-foreground", className)}
		>
			<Search />
			<span className="truncate">{placeholder || t("search_plugins")}</span>
		</Button>
	);

	const sortOptions: Array<{ value: SortOption; label: string }> = [
		{ value: "relevance", label: t("relevance") },
		{ value: "newest", label: t("newest") },
		{ value: "popular", label: t("popular") },
		{ value: "rating", label: t("rating") },
		{ value: "downloads", label: t("downloads_sort") },
	];

	const resultCount = searchResults?.plugins.length || 0;
	const statusText = useMemo(() => {
		if (!debouncedQuery) return "";
		if (isSearching) return t("searching");
		if (isError) return t("search_failed");
		return t("results_found", { count: resultCount });
	}, [debouncedQuery, isError, isSearching, resultCount, t]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
			<DialogContent
				showCloseButton={false}
				className="top-0 left-0 grid h-dvh w-screen max-w-none translate-x-0 translate-y-0 grid-rows-[auto_auto_1fr] gap-0 rounded-none border-0 p-0 sm:top-1/2 sm:left-1/2 sm:h-[min(80vh,48rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
			>
				<div className="flex min-h-16 items-center gap-3 border-b px-4 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-5">
					<div className="min-w-0 flex-1">
						<DialogTitle>{t("title")}</DialogTitle>
						<DialogDescription className="truncate">
							{t("subtitle")}
						</DialogDescription>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="press-scale size-11"
						onClick={() => setOpen(false)}
						aria-label={t("close")}
					>
						<X />
					</Button>
				</div>

				<div className="border-b p-3 sm:p-4">
					<form
						onSubmit={(event) => {
							event.preventDefault();
							submitSearch();
						}}
						className="flex gap-2"
					>
						<div className="relative min-w-0 flex-1">
							<Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
							<Input
								ref={inputRef}
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder={placeholder || t("search_plugins")}
								className="h-12 rounded-xl pr-12 pl-12 text-base"
								autoComplete="off"
								aria-label={t("query_label")}
							/>
							{query && (
								<button
									type="button"
									onClick={() => setQuery("")}
									className="press-scale absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									aria-label={t("clear_query")}
								>
									<X className="size-4" />
								</button>
							)}
						</div>
						<Button
							type="button"
							variant={hasActiveFilters ? "default" : "outline"}
							size="icon"
							className="press-scale size-11"
							onClick={() => setShowFilters((value) => !value)}
							aria-label={t("filters")}
							aria-expanded={showFilters}
						>
							<Filter />
						</Button>
					</form>

					{showFilters && (
						<div className="mt-3 space-y-3 rounded-xl bg-muted/50 p-3">
							<div>
								<div className="mb-2 font-medium text-sm">{t("sort_by")}</div>
								<div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
									{sortOptions.map((option) => (
										<button
											key={option.value}
											type="button"
											onClick={() =>
												setFilters((current) => ({
													...current,
													sortBy: option.value,
												}))
											}
											className={cn(
												"min-h-11 shrink-0 rounded-full border px-4 font-medium text-sm transition-colors",
												filters.sortBy === option.value
													? "border-primary bg-primary text-primary-foreground"
													: "bg-background hover:border-primary/50",
											)}
											aria-pressed={filters.sortBy === option.value}
										>
											{option.label}
										</button>
									))}
								</div>
							</div>
							<div className="grid gap-3 sm:grid-cols-[1fr_auto]">
								<label className="grid gap-1 font-medium text-sm">
									{t("category")}
									<select
										value={filters.category}
										onChange={(event) =>
											setFilters((current) => ({
												...current,
												category: event.target.value,
											}))
										}
										className="h-11 rounded-lg border bg-background px-3 font-normal"
									>
										<option value="">{t("all_categories")}</option>
										{categories?.map((category) => (
											<option key={category.id} value={category.slug}>
												{category.name}
											</option>
										))}
									</select>
								</label>
								<div>
									<div className="mb-1 font-medium text-sm">{t("rating")}</div>
									<div className="flex gap-2">
										{[4, 3].map((rating) => (
											<button
												key={rating}
												type="button"
												onClick={() =>
													setFilters((current) => ({
														...current,
														minRating:
															current.minRating === rating ? null : rating,
													}))
												}
												className={cn(
													"min-h-11 rounded-lg border px-3 text-sm",
													filters.minRating === rating &&
														"border-primary bg-primary text-primary-foreground",
												)}
												aria-pressed={filters.minRating === rating}
											>
												{rating}+ ★
											</button>
										))}
									</div>
								</div>
							</div>
							{hasActiveFilters && (
								<Button
									variant="ghost"
									className="min-h-11"
									onClick={resetFilters}
								>
									{t("clear_filters")}
								</Button>
							)}
						</div>
					)}
				</div>

				<div
					className="min-h-0 overflow-y-auto px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5"
					aria-busy={isSearching}
				>
					<p className="sr-only" aria-live="polite">
						{statusText}
					</p>
					{query.trim() ? (
						isSearching ? (
							<div className="space-y-2">
								{Array.from({ length: 5 }).map((_, index) => (
									<div key={index} className="flex items-center gap-3 p-3">
										<Skeleton className="size-11 rounded-xl" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-4 w-1/2" />
											<Skeleton className="h-3 w-4/5" />
										</div>
									</div>
								))}
							</div>
						) : isError ? (
							<EmptyState
								icon="↻"
								title={t("search_error_title")}
								description={t("search_error_description")}
								actionLabel={t("retry")}
								onAction={() => void refetch()}
							/>
						) : resultCount === 0 ? (
							<EmptyState
								icon="⌕"
								title={t("no_results")}
								description={t("no_results_hint", { query: query.trim() })}
								actionLabel={hasActiveFilters ? t("clear_filters") : undefined}
								onAction={hasActiveFilters ? resetFilters : undefined}
							/>
						) : (
							<div className="space-y-2">
								<div className="mb-2 flex items-center justify-between gap-3">
									<h3 className="font-medium text-muted-foreground text-sm">
										{t("results_found", { count: resultCount })}
									</h3>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => submitSearch()}
									>
										{t("show_all")}
									</Button>
								</div>
								{searchResults?.plugins.map(
									(plugin: SearchResult, index: number) => (
										<motion.div
											key={plugin.id}
											initial={
												prefersReducedMotion ? false : { opacity: 0, y: 8 }
											}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												ease: [0.16, 1, 0.3, 1],
												delay: Math.min(index * 0.03, 0.24),
											}}
										>
											<Link
												href={`/plugins/${plugin.slug}`}
												onClick={() => {
													saveSearch(query);
													setOpen(false);
												}}
												className="flex min-h-19 items-center gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												<div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
													{plugin.featured ? (
														<Star className="size-5 fill-current" />
													) : (
														<Search className="size-5" />
													)}
												</div>
												<div className="min-w-0 flex-1">
													<div className="truncate font-semibold">
														<Highlight text={plugin.name} query={query} />
													</div>
													<div className="line-clamp-1 text-muted-foreground text-sm">
														<Highlight
															text={plugin.shortDescription || plugin.author}
															query={query}
														/>
													</div>
												</div>
												<div className="hidden shrink-0 text-right text-muted-foreground text-xs sm:block">
													<div className="flex items-center justify-end gap-1">
														<Star className="size-3.5" />
														{plugin.rating.toFixed(1)}
													</div>
													<div className="mt-1 flex items-center gap-1">
														<Download className="size-3.5" />
														{formatNumber(plugin.downloadCount)}
													</div>
												</div>
											</Link>
										</motion.div>
									),
								)}
							</div>
						)
					) : (
						<div className="space-y-7">
							<section aria-labelledby="quick-discovery">
								<h3 id="quick-discovery" className="mb-3 font-semibold">
									{t("quick_start")}
								</h3>
								<div className="grid grid-cols-3 gap-2">
									{["Python", "Xposed", "Limitless"].map((item) => (
										<button
											key={item}
											type="button"
											onClick={() => {
												setQuery(item);
												inputRef.current?.focus();
											}}
											className="press-scale min-h-12 rounded-xl border bg-primary/5 px-2 font-medium text-sm transition-colors hover:border-primary/40 hover:bg-primary/10"
										>
											{item}
										</button>
									))}
								</div>
							</section>

							{recentSearches.length > 0 && (
								<section aria-labelledby="recent-searches">
									<div className="mb-3 flex items-center justify-between">
										<h3
											id="recent-searches"
											className="flex items-center gap-2 font-semibold"
										>
											<Clock3 className="size-4 text-primary" />
											{t("recent_searches")}
										</h3>
										<Button variant="ghost" size="sm" onClick={clearRecent}>
											{t("clear")}
										</Button>
									</div>
									<div className="flex flex-wrap gap-2">
										{recentSearches.map((item) => (
											<button
												key={item}
												type="button"
												onClick={() => {
													setQuery(item);
													inputRef.current?.focus();
												}}
												className="press-scale min-h-11 rounded-full border bg-background px-4 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
											>
												{item}
											</button>
										))}
									</div>
								</section>
							)}

							<section aria-labelledby="popular-searches">
								<h3
									id="popular-searches"
									className="mb-3 flex items-center gap-2 font-semibold"
								>
									<TrendingUp className="size-4 text-primary" />
									{t("trending_now")}
								</h3>
								{isLoadingPopular ? (
									<div className="grid gap-2 sm:grid-cols-2">
										{Array.from({ length: 4 }).map((_, index) => (
											<Skeleton key={index} className="h-16 rounded-xl" />
										))}
									</div>
								) : (
									<div className="grid gap-2 sm:grid-cols-2">
										{popularPlugins?.map((plugin: PopularPlugin) => (
											<Link
												key={plugin.id}
												href={`/plugins/${plugin.slug}`}
												onClick={() => setOpen(false)}
												className="flex min-h-16 items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												<div className="min-w-0 flex-1">
													<div className="truncate font-medium">
														{plugin.name}
													</div>
													<div className="text-muted-foreground text-xs">
														{t("downloads", {
															count: formatNumber(plugin.downloadCount),
														})}
													</div>
												</div>
												<span className="flex items-center gap-1 text-sm">
													<Star className="size-3.5 fill-warning text-warning" />
													{plugin.rating.toFixed(1)}
												</span>
											</Link>
										))}
									</div>
								)}
							</section>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
