"use client";

import Fuse from "fuse.js";
import {
	Calendar,
	Clock,
	Download,
	ExternalLink,
	Filter,
	Hash,
	Search,
	Star,
	TrendingUp,
	User,
	X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface SearchDialogProps {
	trigger?: React.ReactNode;
	placeholder?: string;
	className?: string;
}

interface SearchFilters {
	categories: string[];
	minRating: number | null;
	sortBy: "relevance" | "newest" | "popular" | "rating" | "downloads";
}

interface SearchResult {
	id: number;
	name: string;
	slug: string;
	shortDescription: string | null;
	description?: string | null;
	author: string;
	category: string;
	tags: string | null;
	rating: number;
	ratingCount: number;
	downloadCount: number;
	featured: boolean;
	screenshots: string | null;
	createdAt: number;
	relevanceScore?: number | null;
}

interface SearchSuggestion {
	type: "plugin" | "category" | "author";
	value: string;
	slug: string;
	extra: string | number;
}

interface Plugin {
	id: number;
	name: string;
	slug: string;
	shortDescription?: string;
	author: string;
	category: string;
	rating: number;
	downloadCount: number;
	featured: boolean;
}

const highlightText = (text: string, query: string): React.ReactNode => {
	if (!query.trim()) return text;
	
	const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
	const parts = text.split(regex);
	
	return parts.map((part, index) => 
		regex.test(part) ? (
			<mark key={index} className="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded">
				{part}
			</mark>
		) : part
	);
};

export function SearchDialog({
	trigger,
	placeholder,
	className,
}: SearchDialogProps) {
	const t = useTranslations("SearchDialog");
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const [showFilters, setShowFilters] = useState(false);
	const [filters, setFilters] = useState<SearchFilters>({
		categories: [],
		minRating: null,
		sortBy: "relevance",
	});
	const router = useRouter();

	const [debouncedQuery] = useDebounce(query, 150);

	const { data: searchResults, isLoading: isSearching } = api.plugins.advancedSearch.useQuery(
		{
			query: debouncedQuery,
			limit: 12,
			categories: filters.categories.length > 0 ? filters.categories : undefined,
			minRating: filters.minRating || undefined,
			sortBy: filters.sortBy,
			includeContent: false,
		},
		{
			enabled: debouncedQuery.length >= 1,
		},
	);

	const { data: suggestions } = api.plugins.searchSuggestions.useQuery(
		{ query: debouncedQuery },
		{
			enabled: debouncedQuery.length > 0 && debouncedQuery.length <= 3 && !isSearching,
		},
	);

	const { data: popularPlugins } = api.plugins.getPopular.useQuery(
		{ limit: 6 },
		{ enabled: query.length === 0 },
	);

	const { data: categories } = api.categories.getAll.useQuery();

	const fuseOptions = {
		keys: [
			{ name: "name", weight: 0.6 },
			{ name: "author", weight: 0.3 },
			{ name: "shortDescription", weight: 0.2 },
			{ name: "category", weight: 0.1 },
		],
		threshold: 0.3,
		includeScore: true,
		includeMatches: true,
	};

	const fuse = useMemo(() => {
		if (popularPlugins) {
			return new Fuse(popularPlugins, fuseOptions);
		}
		return null;
	}, [popularPlugins]);

	const fuzzyResults = useMemo(() => {
		if (query.length > 0 && query.length <= 2 && fuse) {
			return fuse.search(query).slice(0, 4);
		}
		return [];
	}, [query, fuse]);

	useEffect(() => {
		const saved = localStorage.getItem("recent-searches");
		if (saved) {
			setRecentSearches(JSON.parse(saved));
		}
	}, []);

	const saveSearch = useCallback(
		(searchQuery: string) => {
			if (searchQuery.trim().length < 2) return;

			const updated = [
				searchQuery,
				...recentSearches.filter((s) => s !== searchQuery),
			].slice(0, 8);
			setRecentSearches(updated);
			localStorage.setItem("recent-searches", JSON.stringify(updated));
		},
		[recentSearches],
	);

	const handleSearch = (searchQuery: string = query) => {
		if (searchQuery.trim().length < 2) return;

		saveSearch(searchQuery);
		setOpen(false);
		setQuery("");
		const params = new URLSearchParams({
			search: searchQuery,
			...(filters.categories.length > 0 && { categories: filters.categories.join(",") }),
			...(filters.minRating && { minRating: filters.minRating.toString() }),
			...(filters.sortBy !== "relevance" && { sortBy: filters.sortBy }),
		});
		router.push(`/plugins?${params}`);
	};

	const handleSuggestionClick = (suggestion: SearchSuggestion) => {
		setOpen(false);
		setQuery("");
		
		switch (suggestion.type) {
			case "plugin":
				router.push(`/plugins/${suggestion.slug}`);
				break;
			case "category":
				router.push(`/categories/${suggestion.slug}`);
				break;
			case "author":
				router.push(`/developers?search=${encodeURIComponent(suggestion.value)}`);
				break;
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSearch();
		}
		if (e.key === "Escape") {
			setOpen(false);
		}
	};

	const clearRecentSearches = () => {
		setRecentSearches([]);
		localStorage.removeItem("recent-searches");
	};

	const toggleFilter = (type: keyof SearchFilters, value: any) => {
		setFilters(prev => {
			if (type === "categories") {
				const categories = prev.categories.includes(value)
					? prev.categories.filter(c => c !== value)
					: [...prev.categories, value];
				return { ...prev, categories };
			}
			return { ...prev, [type]: prev[type] === value ? null : value };
		});
	};

	const clearFilters = () => {
		setFilters({
			categories: [],
			minRating: null,
			sortBy: "relevance",
		});
	};

	const hasActiveFilters = filters.categories.length > 0 || filters.minRating !== null || filters.sortBy !== "relevance";

	const getResultIcon = (type: string) => {
		switch (type) {
			case "plugin": return <Hash className="h-4 w-4" />;
			case "category": return <Filter className="h-4 w-4" />;
			case "author": return <User className="h-4 w-4" />;
			default: return <Search className="h-4 w-4" />;
		}
	};

	const defaultTrigger = (
		<Button
			variant="outline"
			className={cn("justify-start text-muted-foreground", className)}
		>
			<Search className="mr-2 h-4 w-4" />
			{placeholder || t("search_plugins")}
		</Button>
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
			<DialogContent className="max-w-[95vw] p-0 sm:max-w-2xl md:max-w-3xl">
				<DialogTitle className="sr-only">{t("search_plugins")}</DialogTitle>
				<div className="flex max-h-[85vh] flex-col">
					<div className="border-b p-3 sm:p-4">
						<div className="relative">
							<Search className="-translate-y-1/2 absolute top-1/2 left-2 h-4 w-4 transform text-muted-foreground sm:left-3" />
							<Input
								placeholder={placeholder || t("search_plugins")}
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onKeyDown={handleKeyDown}
								className="h-10 pr-12 pl-8 text-sm sm:h-12 sm:pr-16 sm:pl-10 sm:text-base"
								autoFocus
							/>
							<div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1 sm:right-3">
								{query && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setQuery("")}
										className="h-6 w-6 p-0"
									>
										<X className="h-3 w-3" />
									</Button>
								)}
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setShowFilters(!showFilters)}
									className={cn(
										"h-6 w-6 p-0",
										hasActiveFilters && "text-primary"
									)}
								>
									<Filter className="h-3 w-3" />
								</Button>
							</div>
						</div>

						{showFilters && (
							<div className="mt-3 space-y-3 border-t pt-3">
								<div className="flex flex-wrap gap-2">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium">Сортировка:</span>
										{["relevance", "newest", "popular", "rating", "downloads"].map((sort) => (
											<Badge
												key={sort}
												variant={filters.sortBy === sort ? "default" : "outline"}
												className="cursor-pointer"
												onClick={() => setFilters(prev => ({ ...prev, sortBy: sort as any }))}
											>
												{sort === "relevance" && "Релевантность"}
												{sort === "newest" && "Новые"}
												{sort === "popular" && "Популярные"}
												{sort === "rating" && "Рейтинг"}
												{sort === "downloads" && "Скачивания"}
											</Badge>
										))}
									</div>
								</div>

								<div className="flex flex-wrap gap-2">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium">Рейтинг:</span>
										{[4, 3, 2].map((rating) => (
											<Badge
												key={rating}
												variant={filters.minRating === rating ? "default" : "outline"}
												className="cursor-pointer"
												onClick={() => toggleFilter("minRating", rating)}
											>
												{rating}+ ⭐
											</Badge>
										))}
									</div>
								</div>

								{categories && categories.length > 0 && (
									<div className="flex flex-wrap gap-2">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium">Категории:</span>
											{categories.slice(0, 6).map((category) => (
												<Badge
													key={category.slug}
													variant={filters.categories.includes(category.slug) ? "default" : "outline"}
													className="cursor-pointer"
													onClick={() => toggleFilter("categories", category.slug)}
												>
													{category.name}
												</Badge>
											))}
										</div>
									</div>
								)}

								{hasActiveFilters && (
									<Button
										variant="outline"
										size="sm"
										onClick={clearFilters}
										className="h-7"
									>
										Сбросить фильтры
									</Button>
								)}
							</div>
						)}
					</div>

					<div className="flex-1 overflow-y-auto">
						{query.length >= 1 ? (
							<div className="p-3 sm:p-4">
								{isSearching ? (
									<div className="space-y-2 sm:space-y-3">
										{Array.from({ length: 5 }).map((_, i) => (
											<div
												key={i}
												className="flex items-center gap-2 rounded-lg p-2 sm:gap-3 sm:p-3"
											>
												<Skeleton className="h-8 w-8 rounded-lg sm:h-10 sm:w-10" />
												<div className="flex-1 space-y-1 sm:space-y-2">
													<Skeleton className="h-3 w-3/4 sm:h-4" />
													<Skeleton className="h-2 w-1/2 sm:h-3" />
												</div>
											</div>
										))}
									</div>
								) : searchResults?.plugins.length === 0 ? (
									<>
										<EmptyState
											icon="🔍"
											title={t("no_results")}
											description={t("no_results_for", { query })}
										/>
										{/* Показываем подсказки даже при отсутствии результатов */}
										{suggestions && suggestions.length > 0 && (
											<div className="mt-4 border-t pt-3">
												<h4 className="mb-2 font-medium text-muted-foreground text-xs sm:text-sm">
													Возможно, вы искали:
												</h4>
												<div className="space-y-1">
													{suggestions.map((suggestion: SearchSuggestion, index: number) => (
														<button
															key={index}
															onClick={() => handleSuggestionClick(suggestion)}
															className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-accent sm:gap-3 sm:p-3"
														>
															<div className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted sm:h-8 sm:w-8">
																{getResultIcon(suggestion.type)}
															</div>
															<div className="min-w-0 flex-1">
																<div className="truncate font-medium text-xs sm:text-sm">
																	{suggestion.value}
																</div>
																<div className="text-[10px] text-muted-foreground sm:text-xs">
																	{suggestion.type === "plugin" && `в ${suggestion.extra}`}
																	{suggestion.type === "category" && `${suggestion.extra} плагинов`}
																	{suggestion.type === "author" && `${suggestion.extra} плагинов`}
																</div>
															</div>
														</button>
													))}
												</div>
											</div>
										)}
									</>
								) : (
									<div className="space-y-1 sm:space-y-2">
										<div className="mb-3 flex items-center justify-between">
											<h3 className="font-medium text-muted-foreground text-xs sm:text-sm">
												{t("search_results")} ({searchResults?.plugins.length || 0})
											</h3>
											{searchResults && searchResults.plugins.length > 0 && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleSearch()}
													className="h-7 text-xs"
												>
													{t("show_all")}
													<ExternalLink className="ml-1 h-3 w-3" />
												</Button>
											)}
										</div>

										{searchResults?.plugins.map((plugin: SearchResult) => (
											<Link
												key={plugin.id}
												href={`/plugins/${plugin.slug}`}
												onClick={() => setOpen(false)}
												className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-accent sm:gap-3 sm:p-3"
											>
												<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 sm:h-10 sm:w-10">
													{plugin.featured ? (
														<Star className="h-4 w-4 text-yellow-500 sm:h-5 sm:w-5" />
													) : (
														<Hash className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
													)}
												</div>
												<div className="min-w-0 flex-1">
													<div className="truncate font-medium text-sm sm:text-base">
														{highlightText(plugin.name, query)}
													</div>
													<div className="truncate text-muted-foreground text-xs sm:text-sm">
														{highlightText(plugin.shortDescription || plugin.author, query)}
													</div>
												</div>
												<div className="flex flex-col items-end gap-1">
													<div className="flex items-center gap-1 sm:gap-2">
														<Badge
															variant="secondary"
															className="h-5 py-0 text-[10px] sm:text-xs"
														>
															{plugin.category}
														</Badge>
													</div>
													<div className="flex items-center gap-2 text-[10px] text-muted-foreground sm:text-xs">
														<span className="flex items-center gap-1">
															<Star className="h-3 w-3" />
															{plugin.rating.toFixed(1)}
														</span>
														<span className="flex items-center gap-1">
															<Download className="h-3 w-3" />
															{plugin.downloadCount}
														</span>
													</div>
												</div>
											</Link>
										))}

										{searchResults?.suggestions && searchResults.suggestions.length > 0 && (
											<div className="mt-4 border-t pt-3">
												<h4 className="mb-2 font-medium text-muted-foreground text-xs sm:text-sm">
													Похожие категории
												</h4>
												<div className="flex flex-wrap gap-1 sm:gap-2">
													{searchResults.suggestions.map((suggestion: { type: string; value: string; count: number }, index: number) => (
														<Badge
															key={index}
															variant="outline"
															className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground"
															onClick={() => router.push(`/categories/${suggestion.value}`)}
														>
															{suggestion.value} ({suggestion.count})
														</Badge>
													))}
												</div>
											</div>
										)}
									</div>
								)}
							</div>
						) : query.length <= 3 && fuzzyResults.length > 0 ? (
							<div className="p-3 sm:p-4">
								<h3 className="mb-2 font-medium text-muted-foreground text-xs sm:text-sm">
									Возможно, вы ищете
								</h3>
								<div className="space-y-1">
									{fuzzyResults.map((result, index) => {
										const plugin = result.item as Plugin;
										return (
											<Link
												key={index}
												href={`/plugins/${plugin.slug}`}
												onClick={() => setOpen(false)}
												className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-accent sm:gap-3 sm:p-3"
											>
												<div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 sm:h-8 sm:w-8">
													<Hash className="h-3 w-3 text-primary sm:h-4 sm:w-4" />
												</div>
												<div className="min-w-0 flex-1">
													<div className="truncate font-medium text-xs sm:text-sm">
														{plugin.name}
													</div>
													<div className="text-[10px] text-muted-foreground sm:text-xs">
														{plugin.author}
													</div>
												</div>
												<div className="text-[10px] text-muted-foreground sm:text-xs">
													⭐ {plugin.rating.toFixed(1)}
												</div>
											</Link>
										);
									})}
								</div>
							</div>
						) : (
							<div className="space-y-4 p-3 sm:space-y-6 sm:p-4">
								{recentSearches.length > 0 && (
									<div>
										<div className="mb-2 flex items-center justify-between sm:mb-3">
											<h3 className="flex items-center gap-1 font-medium text-muted-foreground text-xs sm:gap-2 sm:text-sm">
												<Clock className="h-3 w-3 sm:h-4 sm:w-4" />
												{t("recent_searches")}
											</h3>
											<Button
												variant="ghost"
												size="sm"
												onClick={clearRecentSearches}
												className="h-7 text-xs"
											>
												{t("clear")}
											</Button>
										</div>
										<div className="flex flex-wrap gap-1 sm:gap-2">
											{recentSearches.map((search, index) => (
												<Badge
													key={index}
													variant="secondary"
													className="h-5 cursor-pointer py-0 text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
													onClick={() => handleSearch(search)}
												>
													{search}
												</Badge>
											))}
										</div>
									</div>
								)}

								{popularPlugins && popularPlugins.length > 0 && (
									<div>
										<h3 className="mb-2 flex items-center gap-1 font-medium text-muted-foreground text-xs sm:mb-3 sm:gap-2 sm:text-sm">
											<TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
											{t("popular_plugins")}
										</h3>
										<div className="space-y-1 sm:space-y-2">
											{popularPlugins.map((plugin: any) => (
												<Link
													key={plugin.id}
													href={`/plugins/${plugin.slug}`}
													onClick={() => setOpen(false)}
													className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-accent sm:gap-3 sm:p-3"
												>
													<div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 sm:h-8 sm:w-8">
														{plugin.featured ? (
															<Star className="h-3 w-3 text-yellow-500 sm:h-4 sm:w-4" />
														) : (
															<Hash className="h-3 w-3 text-primary sm:h-4 sm:w-4" />
														)}
													</div>
													<div className="min-w-0 flex-1">
														<div className="truncate font-medium text-xs sm:text-sm">
															{plugin.name}
														</div>
														<div className="text-[10px] text-muted-foreground sm:text-xs">
															{t("downloads", { count: plugin.downloadCount })}
														</div>
													</div>
													<div className="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
														<Star className="h-3 w-3" />
														{plugin.rating.toFixed(1)}
													</div>
												</Link>
											))}
										</div>
									</div>
								)}

								{categories && categories.length > 0 && (
									<div>
										<h3 className="mb-2 font-medium text-muted-foreground text-xs sm:mb-3 sm:text-sm">
											{t("categories")}
										</h3>
										<div className="grid grid-cols-1 xs:grid-cols-2 gap-1 sm:gap-2">
											{categories.slice(0, 8).map((category: any) => (
												<Link
													key={category.id}
													href={`/categories/${category.slug}`}
													onClick={() => setOpen(false)}
													className="flex items-center gap-1 rounded-lg p-1.5 text-xs transition-colors hover:bg-accent sm:gap-2 sm:p-2 sm:text-sm"
												>
													<Hash className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
													<span className="truncate">{category.name}</span>
													<span className="ml-auto text-[10px] text-muted-foreground sm:text-xs">
														{category.pluginCount}
													</span>
												</Link>
											))}
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

