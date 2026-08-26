"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	ArrowRight,
	Clock3,
	CornerDownLeft,
	Download,
	Search,
	Star,
	TrendingUp,
	X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { cn, formatNumber, safeJsonParse } from "~/lib/utils";
import { api } from "~/trpc/react";

interface SearchDialogProps {
	trigger?: React.ReactNode;
	placeholder?: string;
	className?: string;
	isMobile?: boolean;
}

const RECENT_KEY = "recent-searches";

function Highlight({ text, query }: { text: string; query: string }) {
	const normalizedQuery = query.trim().toLocaleLowerCase();
	if (!normalizedQuery) return text;

	const index = text.toLocaleLowerCase().indexOf(normalizedQuery);
	if (index < 0) return text;

	return (
		<>
			{text.slice(0, index)}
			<span className="text-primary underline decoration-2 decoration-primary/40 underline-offset-2">
				{text.slice(index, index + normalizedQuery.length)}
			</span>
			{text.slice(index + normalizedQuery.length)}
		</>
	);
}

function PluginTile({
	name,
	screenshots,
}: {
	name: string;
	screenshots?: string | null;
}) {
	const shots = screenshots ? safeJsonParse<unknown>(screenshots, []) : [];
	const shot =
		Array.isArray(shots) && typeof shots[0] === "string" ? shots[0] : null;

	if (shot) {
		return (
			<span className="relative size-10 shrink-0 overflow-hidden rounded-xl border">
				<Image src={shot} alt="" fill sizes="40px" className="object-cover" />
			</span>
		);
	}

	return (
		<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
			{name.slice(0, 1).toUpperCase()}
		</span>
	);
}

export function SearchDialog({
	trigger,
	placeholder,
	className,
	isMobile = false,
}: SearchDialogProps) {
	const t = useTranslations("SearchDialog");
	const reduceMotion = useReducedMotion();
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const [debouncedQuery] = useDebounce(query.trim(), 180);
	const hasQuery = debouncedQuery.length > 0;

	const {
		data: searchResults,
		isFetching: isSearching,
		isError,
		refetch,
	} = api.plugins.advancedSearch.useQuery(
		{
			query: debouncedQuery,
			limit: 8,
			sortBy: "relevance",
			includeContent: false,
		},
		{ enabled: open && hasQuery, placeholderData: (prev) => prev },
	);

	const { data: trending } = api.plugins.getTrending.useQuery(
		{ limit: 5 },
		{ enabled: open && !hasQuery },
	);

	const results = useMemo(
		() => (hasQuery ? (searchResults?.plugins ?? []) : []),
		[hasQuery, searchResults],
	);

	const rowCount = hasQuery ? results.length + (results.length > 0 ? 1 : 0) : 0;

	useEffect(() => {
		setActiveIndex(0);
	}, []);

	useEffect(() => {
		if (!open) return;
		try {
			const saved = localStorage.getItem(RECENT_KEY);
			const parsed = saved ? safeJsonParse<unknown>(saved, []) : [];
			if (Array.isArray(parsed)) {
				setRecentSearches(
					parsed
						.filter((item): item is string => typeof item === "string")
						.slice(0, 5),
				);
			}
		} catch {
			setRecentSearches([]);
		}
	}, [open]);

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	const saveRecent = useCallback((term: string) => {
		if (!term) return;
		try {
			const saved = localStorage.getItem(RECENT_KEY);
			const parsed = saved ? safeJsonParse<string[]>(saved, []) : [];
			const next = [term, ...parsed.filter((item) => item !== term)].slice(
				0,
				5,
			);
			localStorage.setItem(RECENT_KEY, JSON.stringify(next));
		} catch {}
	}, []);

	const close = useCallback(() => {
		setOpen(false);
		setQuery("");
		setActiveIndex(0);
	}, []);

	const openPlugin = useCallback(
		(slug: string) => {
			saveRecent(query.trim());
			close();
			router.push(`/plugins/${slug}`);
		},
		[close, query, router, saveRecent],
	);

	const openAllResults = useCallback(() => {
		saveRecent(query.trim());
		close();
		router.push(`/plugins?search=${encodeURIComponent(debouncedQuery)}`);
	}, [close, debouncedQuery, query, saveRecent, router]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (rowCount === 0) {
				if (e.key === "Enter" && debouncedQuery) {
					e.preventDefault();
					openAllResults();
				}
				return;
			}
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setActiveIndex((prev) => (prev + 1) % rowCount);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setActiveIndex((prev) => (prev - 1 + rowCount) % rowCount);
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (activeIndex < results.length) {
					const plugin = results[activeIndex];
					if (plugin) openPlugin(plugin.slug);
				} else {
					openAllResults();
				}
			}
		},
		[
			activeIndex,
			debouncedQuery,
			openAllResults,
			openPlugin,
			results,
			rowCount,
		],
	);

	useEffect(() => {
		const activeEl = listRef.current?.querySelector('[data-active="true"]');
		activeEl?.scrollIntoView({ block: "nearest" });
	}, []);

	const motionProps = reduceMotion
		? {}
		: {
				initial: { opacity: 0, y: 4 },
				animate: { opacity: 1, y: 0 },
				exit: { opacity: 0 },
				transition: { duration: 0.15 },
			};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) close();
			}}
		>
			<DialogTrigger asChild>
				{trigger || (
					<button
						type="button"
						className={cn(
							"flex min-h-11 items-center gap-2 rounded-xl bg-surface px-3 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
							isMobile && "bg-card",
							className,
						)}
					>
						<Search className="size-4 shrink-0" />
						<span className="min-w-0 flex-1 truncate text-left">
							{placeholder || t("search_plugins")}
						</span>
						<kbd className="pointer-events-none hidden rounded-md bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:block">
							⌘K
						</kbd>
					</button>
				)}
			</DialogTrigger>
			<DialogContent
				showCloseButton={false}
				showHandle={false}
				className="top-0 h-dvh w-full max-w-full translate-y-0 gap-0 overflow-hidden rounded-none border-0 p-0 sm:top-[8rem] sm:h-auto sm:max-w-2xl sm:rounded-2xl"
			>
				<DialogTitle className="sr-only">{t("title")}</DialogTitle>
				<DialogDescription className="sr-only">
					{t("subtitle")}
				</DialogDescription>

				<div className="flex items-center gap-3 bg-surface px-4 sm:px-5">
					<Search
						className={cn(
							"size-5 shrink-0",
							isSearching
								? "animate-pulse-dot text-primary"
								: "text-muted-foreground",
						)}
					/>
					<input
						ref={inputRef}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={placeholder || t("search_plugins")}
						aria-label={t("query_label")}
						className="h-16 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-lg"
					/>
					{query && (
						<button
							type="button"
							onClick={() => {
								setQuery("");
								inputRef.current?.focus();
							}}
							aria-label={t("clear_query")}
							className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<X className="size-4" />
						</button>
					)}
					<button
						type="button"
						onClick={close}
						aria-label={t("close")}
						className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground sm:hidden"
					>
						<X className="size-4" />
					</button>
					<kbd className="pointer-events-none hidden rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
						esc
					</kbd>
				</div>

				<div
					ref={listRef}
					className="h-[calc(100dvh-8.5rem)] overflow-y-auto overscroll-contain p-2 sm:h-auto sm:max-h-[24rem] sm:min-h-[16rem]"
				>
					<AnimatePresence mode="popLayout" initial={false}>
						{!hasQuery && (
							<motion.div key="idle" {...motionProps}>
								{recentSearches.length > 0 && (
									<div className="px-3 pt-3 pb-1">
										<p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
											{t("recent_searches")}
										</p>
										<div className="flex flex-wrap gap-2">
											{recentSearches.map((term) => (
												<button
													key={term}
													type="button"
													onClick={() => setQuery(term)}
													className="flex min-h-9 items-center gap-1.5 rounded-full border bg-muted/40 px-3 text-sm transition-colors hover:border-primary/40 hover:text-primary"
												>
													<Clock3 className="size-3.5 text-muted-foreground" />
													{term}
												</button>
											))}
										</div>
									</div>
								)}

								<div className="px-3 pt-4 pb-1">
									<p className="mb-1 flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
										<TrendingUp className="size-3.5 text-primary" />
										{t("trending_now")}
									</p>
								</div>
								{(trending ?? []).map((plugin, index) => (
									<button
										key={plugin.id}
										type="button"
										onClick={() => openPlugin(plugin.slug)}
										className="flex min-h-13 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent"
									>
										<span className="w-6 shrink-0 font-bold font-mono text-muted-foreground/60 text-sm">
											{String(index + 1).padStart(2, "0")}
										</span>
										<span className="min-w-0 flex-1 truncate font-medium">
											{plugin.name}
										</span>
										<span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
											<Star className="size-3.5 fill-warning text-warning" />
											{plugin.ratingCount > 0 ? plugin.rating.toFixed(1) : "—"}
										</span>
										<span className="hidden shrink-0 items-center gap-1 text-muted-foreground text-xs sm:flex">
											<Download className="size-3.5" />
											{formatNumber(plugin.downloadCount)}
										</span>
									</button>
								))}
							</motion.div>
						)}

						{hasQuery && isError && (
							<motion.div
								key="error"
								{...motionProps}
								className="flex flex-col items-center gap-3 px-4 py-12 text-center"
							>
								<p className="font-medium">{t("search_error_title")}</p>
								<p className="text-muted-foreground text-sm">
									{t("search_error_description")}
								</p>
								<button
									type="button"
									onClick={() => refetch()}
									className="mt-1 flex min-h-10 items-center rounded-xl bg-primary px-4 font-medium text-primary-foreground text-sm"
								>
									{t("retry")}
								</button>
							</motion.div>
						)}

						{hasQuery && !isError && results.length === 0 && !isSearching && (
							<motion.div
								key="empty"
								{...motionProps}
								className="flex flex-col items-center gap-2 px-4 py-12 text-center"
							>
								<span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
									<Search className="size-5 text-primary" />
								</span>
								<p className="font-medium">{t("no_results")}</p>
								<p className="max-w-sm text-muted-foreground text-sm">
									{t("no_results_hint", { query: debouncedQuery })}
								</p>
							</motion.div>
						)}

						{hasQuery && !isError && results.length === 0 && isSearching && (
							<motion.div
								key="loading"
								{...motionProps}
								className="space-y-1 p-1"
							>
								{[0, 1, 2, 3].map((i) => (
									<div
										key={i}
										className="flex items-center gap-3 rounded-xl px-3 py-2.5"
									>
										<div className="skeleton-shimmer size-10 rounded-xl" />
										<div className="flex-1 space-y-1.5">
											<div className="skeleton-shimmer h-3.5 w-1/3 rounded" />
											<div className="skeleton-shimmer h-3 w-2/3 rounded" />
										</div>
									</div>
								))}
							</motion.div>
						)}

						{hasQuery && !isError && results.length > 0 && (
							<motion.div key="results" {...motionProps}>
								{results.map((plugin, index) => (
									<button
										key={plugin.id}
										type="button"
										data-active={activeIndex === index}
										onClick={() => openPlugin(plugin.slug)}
										onMouseMove={() => setActiveIndex(index)}
										className={cn(
											"flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
											activeIndex === index ? "bg-accent" : "",
										)}
									>
										<PluginTile
											name={plugin.name}
											screenshots={plugin.screenshots}
										/>
										<span className="min-w-0 flex-1">
											<span className="block truncate font-medium">
												<Highlight text={plugin.name} query={debouncedQuery} />
											</span>
											{plugin.shortDescription && (
												<span className="block truncate text-muted-foreground text-sm">
													<Highlight
														text={plugin.shortDescription}
														query={debouncedQuery}
													/>
												</span>
											)}
										</span>
										<span className="hidden shrink-0 rounded-full border bg-background/70 px-2 py-0.5 text-muted-foreground text-xs sm:block">
											{plugin.category}
										</span>
										<span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
											<Star className="size-3.5 fill-warning text-warning" />
											{plugin.ratingCount > 0 ? plugin.rating.toFixed(1) : "—"}
										</span>
									</button>
								))}
								<button
									type="button"
									data-active={activeIndex === results.length}
									onClick={openAllResults}
									onMouseMove={() => setActiveIndex(results.length)}
									className={cn(
										"mt-1 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-dashed px-4 text-left font-medium text-sm transition-colors",
										activeIndex === results.length
											? "border-primary/40 bg-accent text-primary"
											: "text-muted-foreground",
									)}
								>
									{t("show_all")}
									<ArrowRight className="size-4" />
								</button>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				<div className="hidden items-center gap-4 border-t bg-surface px-5 py-2.5 text-muted-foreground text-xs sm:flex">
					<span className="flex items-center gap-1.5">
						<kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">
							↑↓
						</kbd>
						{t("hint_navigate")}
					</span>
					<span className="flex items-center gap-1.5">
						<kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">
							<CornerDownLeft className="size-3" />
						</kbd>
						{t("hint_open")}
					</span>
					<span className="ml-auto flex items-center gap-1.5">
						<kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">
							esc
						</kbd>
						{t("hint_close")}
					</span>
				</div>
			</DialogContent>
		</Dialog>
	);
}
