"use client";

import Fuse from "fuse.js";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import {
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
	ChevronLeft,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
	isMobile?: boolean;
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
	isMobile = false,
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
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

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

	const { data: popularPlugins } = api.plugins.getTrending.useQuery(
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

	useEffect(() => {
		if (open && isMobile) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		
		return () => {
			document.body.style.overflow = '';
		};
	}, [open, isMobile]);

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

	const handleDragEnd = (_: any, info: PanInfo) => {
		if (info.offset.y > 120 || info.velocity.y > 500) {
			setOpen(false);
		}
	};

	const handleClose = () => {
		setOpen(false);
		setQuery("");
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

	const renderSearchResults = () => (
		<>
			{isSearching ? (
				<div className="space-y-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: i * 0.05 }}
							className="flex items-center gap-3 rounded-2xl bg-muted/30 p-3"
						>
							<Skeleton className="h-12 w-12 rounded-xl" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/2" />
							</div>
						</motion.div>
					))}
				</div>
			) : searchResults?.plugins.length === 0 ? (
				<>
					<EmptyState
						icon="🔍"
						title={t("no_results")}
						description={t("no_results_for", { query })}
					/>
					{suggestions && suggestions.length > 0 && (
						<div className="mt-6 border-t pt-4">
							<h4 className="mb-3 font-medium text-muted-foreground text-sm">
								Возможно, вы искали:
							</h4>
							<div className="space-y-2">
								{suggestions.map((suggestion: SearchSuggestion, index: number) => (
									<motion.button
										key={index}
										initial={{ opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: index * 0.05 }}
										whileTap={{ scale: 0.98 }}
										onClick={() => handleSuggestionClick(suggestion)}
										className="flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-muted/30 p-3 text-left transition-colors active:bg-muted/50"
									>
										<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background">
											{getResultIcon(suggestion.type)}
										</div>
										<div className="min-w-0 flex-1">
											<div className="truncate font-medium text-sm">
												{suggestion.value}
											</div>
											<div className="truncate text-muted-foreground text-xs">
												{suggestion.type === "plugin" && `в ${suggestion.extra}`}
												{suggestion.type === "category" && `${suggestion.extra} плагинов`}
												{suggestion.type === "author" && `${suggestion.extra} плагинов`}
											</div>
										</div>
									</motion.button>
								))}
							</div>
						</div>
					)}
				</>
			) : (
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="font-medium text-muted-foreground text-sm">
							{t("search_results")} ({searchResults?.plugins.length || 0})
						</h3>
						{searchResults && searchResults.plugins.length > 0 && (
							<motion.div whileTap={{ scale: 0.95 }}>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleSearch()}
									className="h-8 text-xs"
								>
									{t("show_all")}
									<ExternalLink className="ml-1 h-3 w-3" />
								</Button>
							</motion.div>
						)}
					</div>

					{searchResults?.plugins.map((plugin: SearchResult, index: number) => (
						<motion.div
							key={plugin.id}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.05 }}
						>
							<Link
								href={`/plugins/${plugin.slug}`}
								onClick={() => setOpen(false)}
								className="flex items-center gap-3 overflow-hidden rounded-2xl bg-muted/30 p-3 transition-colors active:bg-muted/50"
							>
								<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
									{plugin.featured ? (
										<Star className="h-5 w-5 text-yellow-500" />
									) : (
										<Hash className="h-5 w-5 text-primary" />
									)}
								</div>
								<div className="min-w-0 flex-1">
									<div className="truncate font-medium text-sm">
										{highlightText(plugin.name, query)}
									</div>
									<div className="line-clamp-2 text-muted-foreground text-xs">
										{highlightText(plugin.shortDescription || plugin.author, query)}
									</div>
								</div>
								<div className="flex flex-col items-end gap-1">
									<Badge variant="secondary" className="text-[10px]">
										{plugin.category}
									</Badge>
									<div className="flex items-center gap-2 text-muted-foreground text-[10px]">
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
						</motion.div>
					))}
				</div>
			)}
		</>
	);

	const renderDefaultContent = () => (
		<div className="space-y-6 pb-6">
			{recentSearches.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
				>
					<div className="mb-3 flex items-center justify-between">
						<h3 className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
							<Clock className="h-4 w-4" />
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
					<div className="flex flex-wrap gap-2">
						{recentSearches.map((search, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: index * 0.05 }}
								whileTap={{ scale: 0.95 }}
							>
								<Badge
									variant="secondary"
									className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground"
									onClick={() => handleSearch(search)}
								>
									{search}
								</Badge>
							</motion.div>
						))}
					</div>
				</motion.div>
			)}

			{popularPlugins && popularPlugins.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
				>
					<h3 className="mb-3 flex items-center gap-2 font-medium text-muted-foreground text-sm">
						<TrendingUp className="h-4 w-4" />
						{t("popular_plugins")}
					</h3>
					<div className="space-y-2">
						{popularPlugins.map((plugin: any, index: number) => (
							<motion.div
								key={plugin.id}
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: index * 0.05 }}
							>
								<Link
									href={`/plugins/${plugin.slug}`}
									onClick={() => setOpen(false)}
									className="flex items-center gap-3 overflow-hidden rounded-2xl bg-muted/30 p-3 transition-colors active:bg-muted/50"
								>
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
										{plugin.featured ? (
											<Star className="h-4 w-4 text-yellow-500" />
										) : (
											<Hash className="h-4 w-4 text-primary" />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="truncate font-medium text-sm">
											{plugin.name}
										</div>
										<div className="text-muted-foreground text-xs">
											{t("downloads", { count: plugin.downloadCount })}
										</div>
									</div>
									<div className="flex items-center gap-1 text-muted-foreground text-xs">
										<Star className="h-3 w-3" />
										{plugin.rating.toFixed(1)}
									</div>
								</Link>
							</motion.div>
						))}
					</div>
				</motion.div>
			)}
		</div>
	);

	if (isMobile) {
		const modalContent = (
			<AnimatePresence>
				{open && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2, ease: "easeOut" }}
							className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-md"
							onClick={handleClose}
						/>
						<motion.div
							initial={{ y: "100%" }}
							animate={{ y: 0 }}
							exit={{ y: "100%" }}
							transition={{ 
								type: "spring",
								damping: 30,
								stiffness: 300,
								mass: 0.8
							}}
							drag="y"
							dragConstraints={{ top: 0, bottom: 0 }}
							dragElastic={{ top: 0, bottom: 0.5 }}
							onDragEnd={handleDragEnd}
							className="fixed inset-x-0 bottom-0 z-[10000] flex max-h-[92vh] flex-col rounded-t-3xl bg-background shadow-2xl"
						>
								<div className="flex h-full flex-col overflow-hidden">
									<motion.div 
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: 0.1 }}
										className="flex items-center justify-center py-2"
									>
										<div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
									</motion.div>

									<div className="flex items-center justify-between px-4 pb-3">
										<motion.button
											initial={{ opacity: 0, x: -10 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: 0.15 }}
											whileTap={{ scale: 0.9 }}
											onClick={handleClose}
											className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 active:bg-muted"
										>
											<ChevronLeft className="h-5 w-5" />
										</motion.button>
										<motion.h2 
											initial={{ opacity: 0, y: -10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.15 }}
											className="font-semibold text-lg"
										>
											Поиск
										</motion.h2>
										<div className="w-9" />
									</div>

									<div className="px-4 pb-3">
										<motion.div
											initial={{ scale: 0.95, opacity: 0 }}
											animate={{ scale: 1, opacity: 1 }}
											transition={{ delay: 0.2, type: "spring", damping: 20 }}
											className="relative"
										>
											<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												placeholder={placeholder || t("search_plugins")}
												value={query}
												onChange={(e) => setQuery(e.target.value)}
												onKeyDown={handleKeyDown}
												className="h-11 rounded-2xl bg-muted/50 pl-10 pr-20 text-base focus:bg-muted"
												autoFocus
											/>
											<div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
												<AnimatePresence>
													{query && (
														<motion.button
															initial={{ scale: 0, opacity: 0 }}
															animate={{ scale: 1, opacity: 1 }}
															exit={{ scale: 0, opacity: 0 }}
															whileTap={{ scale: 0.9 }}
															onClick={() => setQuery("")}
															className="flex h-7 w-7 items-center justify-center rounded-full bg-muted active:bg-muted-foreground/20"
														>
															<X className="h-3.5 w-3.5" />
														</motion.button>
													)}
												</AnimatePresence>
												<motion.button
													whileTap={{ scale: 0.9 }}
													onClick={() => setShowFilters(!showFilters)}
													className={cn(
														"flex h-7 w-7 items-center justify-center rounded-full transition-colors",
														hasActiveFilters ? "bg-primary text-primary-foreground" : "bg-muted active:bg-muted-foreground/20"
													)}
												>
													<Filter className="h-3.5 w-3.5" />
												</motion.button>
											</div>
										</motion.div>

										<AnimatePresence>
											{showFilters && (
												<motion.div
													initial={{ height: 0, opacity: 0 }}
													animate={{ height: "auto", opacity: 1 }}
													exit={{ height: 0, opacity: 0 }}
													transition={{ duration: 0.3, ease: "easeInOut" }}
													className="overflow-hidden"
												>
													<div className="mt-3 space-y-3 border-t pt-3">
														<div className="flex flex-wrap gap-2">
															<span className="text-sm font-medium">Сортировка:</span>
															{["relevance", "newest", "popular", "rating", "downloads"].map((sort) => (
																<motion.div
																	key={sort}
																	whileTap={{ scale: 0.95 }}
																>
																	<Badge
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
																</motion.div>
															))}
														</div>

														<div className="flex flex-wrap gap-2">
															<span className="text-sm font-medium">Рейтинг:</span>
															{[4, 3, 2].map((rating) => (
																<motion.div
																	key={rating}
																	whileTap={{ scale: 0.95 }}
																>
																	<Badge
																		variant={filters.minRating === rating ? "default" : "outline"}
																		className="cursor-pointer"
																		onClick={() => toggleFilter("minRating", rating)}
																	>
																		{rating}+ ⭐
																	</Badge>
																</motion.div>
															))}
														</div>

														{categories && categories.length > 0 && (
															<div className="flex flex-wrap gap-2">
																<span className="text-sm font-medium">Категории:</span>
																{categories.slice(0, 6).map((category) => (
																	<motion.div
																		key={category.slug}
																		whileTap={{ scale: 0.95 }}
																	>
																		<Badge
																			variant={filters.categories.includes(category.slug) ? "default" : "outline"}
																			className="cursor-pointer"
																			onClick={() => toggleFilter("categories", category.slug)}
																		>
																			{category.name}
																		</Badge>
																	</motion.div>
																))}
															</div>
														)}

														{hasActiveFilters && (
															<motion.div whileTap={{ scale: 0.95 }}>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={clearFilters}
																	className="h-8"
																>
																	Сбросить фильтры
																</Button>
															</motion.div>
														)}
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>

									<div className="flex-1 overflow-y-auto px-4 pb-6">
										<AnimatePresence mode="wait">
											{query.length >= 1 ? (
												<motion.div
													key="search-results"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													exit={{ opacity: 0 }}
													transition={{ duration: 0.2 }}
												>
													{renderSearchResults()}
												</motion.div>
											) : (
												<motion.div
													key="default-content"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													exit={{ opacity: 0 }}
													transition={{ duration: 0.2 }}
												>
													{renderDefaultContent()}
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								</div>
							</motion.div>
						</>
					)}
				</AnimatePresence>
		);

		return (
			<>
				<div onClick={() => setOpen(true)}>{trigger || defaultTrigger}</div>
				{mounted && createPortal(modalContent, document.body)}
			</>
		);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
			<DialogContent className="max-w-[95vw] p-0 sm:max-w-2xl md:max-w-3xl">
				<DialogTitle className="sr-only">{t("search_plugins")}</DialogTitle>
				<div className="flex max-h-[85vh] flex-col">
					<div className="border-b p-4">
						<div className="relative">
							<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder={placeholder || t("search_plugins")}
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onKeyDown={handleKeyDown}
								className="h-12 rounded-lg pl-10 pr-16 text-base"
								autoFocus
							/>
							<div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1">
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
							<div className="mt-4 space-y-3 border-t pt-4">
								<div className="flex flex-wrap gap-2">
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

								<div className="flex flex-wrap gap-2">
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

								{categories && categories.length > 0 && (
									<div className="flex flex-wrap gap-2">
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

					<div className="flex-1 overflow-y-auto p-4">
						{query.length >= 1 ? renderSearchResults() : renderDefaultContent()}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
