"use client";

import {
	Clock,
	ExternalLink,
	Hash,
	Search,
	TrendingUp,
	User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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

export function SearchDialog({
	trigger,
	placeholder,
	className,
}: SearchDialogProps) {
	const t = useTranslations("SearchDialog");
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const router = useRouter();

	const { data: searchResults, isLoading } = api.plugins.getAll.useQuery(
		{
			search: query,
			limit: 6,
			page: 1,
		},
		{
			enabled: query.length > 2,
		},
	);

	const { data: popularPlugins } = api.plugins.getPopular.useQuery(
		{ limit: 4 },
		{ enabled: query.length === 0 },
	);

	const { data: categories } = api.categories.getAll.useQuery();

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
			].slice(0, 5);
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
		router.push(`/plugins?search=${encodeURIComponent(searchQuery)}`);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSearch();
		}
	};

	const clearRecentSearches = () => {
		setRecentSearches([]);
		localStorage.removeItem("recent-searches");
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
			<DialogContent className="max-w-2xl p-0">
				<DialogTitle className="sr-only">{t("search_plugins")}</DialogTitle>
				<div className="flex max-h-[80vh] flex-col">
					<div className="border-b p-4">
						<div className="relative">
							<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
							<Input
								placeholder={placeholder || t("search_plugins")}
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onKeyDown={handleKeyDown}
								className="h-12 pr-4 pl-10 text-base"
								autoFocus
							/>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto">
						{query.length > 2 ? (
							<div className="p-4">
								<div className="mb-4 flex items-center justify-between">
									<h3 className="font-medium text-muted-foreground text-sm">
										{t("search_results")}
									</h3>
									{searchResults && searchResults.plugins.length > 0 && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleSearch()}
											className="text-xs"
										>
											{t("show_all")} ({searchResults.totalCount})
											<ExternalLink className="ml-1 h-3 w-3" />
										</Button>
									)}
								</div>

								{isLoading ? (
									<div className="space-y-3">
										{Array.from({ length: 3 }).map((_, i) => (
											<div
												key={i}
												className="flex items-center gap-3 rounded-lg p-3"
											>
												<Skeleton className="h-10 w-10 rounded-lg" />
												<div className="flex-1 space-y-2">
													<Skeleton className="h-4 w-3/4" />
													<Skeleton className="h-3 w-1/2" />
												</div>
											</div>
										))}
									</div>
								) : searchResults?.plugins.length === 0 ? (
									<EmptyState
										icon="🔍"
										title={t("no_results")}
										description={t("no_results_for", { query })}
									/>
								) : (
									<div className="space-y-2">
										{searchResults?.plugins.map((plugin: any) => (
											<Link
												key={plugin.id}
												href={`/plugins/${plugin.slug}`}
												onClick={() => setOpen(false)}
												className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
											>
												<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
													<Hash className="h-5 w-5 text-primary" />
												</div>
												<div className="min-w-0 flex-1">
													<div className="truncate font-medium">
														{plugin.name}
													</div>
													<div className="truncate text-muted-foreground text-sm">
														{plugin.shortDescription || plugin.description}
													</div>
												</div>
												<div className="flex items-center gap-2">
													<Badge variant="secondary" className="text-xs">
														{plugin.category}
													</Badge>
													<div className="text-muted-foreground text-xs">
														⭐ {plugin.rating.toFixed(1)}
													</div>
												</div>
											</Link>
										))}
									</div>
								)}
							</div>
						) : (
							<div className="space-y-6 p-4">
								{recentSearches.length > 0 && (
									<div>
										<div className="mb-3 flex items-center justify-between">
											<h3 className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
												<Clock className="h-4 w-4" />
												{t("recent_searches")}
											</h3>
											<Button
												variant="ghost"
												size="sm"
												onClick={clearRecentSearches}
												className="text-xs"
											>
												{t("clear")}
											</Button>
										</div>
										<div className="flex flex-wrap gap-2">
											{recentSearches.map((search, index) => (
												<Badge
													key={index}
													variant="secondary"
													className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground"
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
										<h3 className="mb-3 flex items-center gap-2 font-medium text-muted-foreground text-sm">
											<TrendingUp className="h-4 w-4" />
											{t("popular_plugins")}
										</h3>
										<div className="space-y-2">
											{popularPlugins.map((plugin: any) => (
												<Link
													key={plugin.id}
													href={`/plugins/${plugin.slug}`}
													onClick={() => setOpen(false)}
													className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
												>
													<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
														<Hash className="h-4 w-4 text-primary" />
													</div>
													<div className="min-w-0 flex-1">
														<div className="truncate font-medium">
															{plugin.name}
														</div>
														<div className="text-muted-foreground text-xs">
															{t("downloads", { count: plugin.downloadCount })}
														</div>
													</div>
													<div className="text-muted-foreground text-xs">
														⭐ {plugin.rating.toFixed(1)}
													</div>
												</Link>
											))}
										</div>
									</div>
								)}

								{categories && categories.length > 0 && (
									<div>
										<h3 className="mb-3 font-medium text-muted-foreground text-sm">
											{t("categories")}
										</h3>
										<div className="grid grid-cols-2 gap-2">
											{categories.slice(0, 6).map((category: any) => (
												<Link
													key={category.id}
													href={`/categories/${category.slug}`}
													onClick={() => setOpen(false)}
													className="flex items-center gap-2 rounded-lg p-2 text-sm transition-colors hover:bg-accent"
												>
													<Hash className="h-4 w-4 text-muted-foreground" />
													<span className="truncate">{category.name}</span>
													<span className="ml-auto text-muted-foreground text-xs">
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
