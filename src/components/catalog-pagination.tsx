"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getPaginationItems } from "~/lib/pagination";
import { cn } from "~/lib/utils";

interface CatalogPaginationProps {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	pageSize: number;
	getHref: (page: number) => string;
	onNavigate?: () => void;
}

const controlClassName =
	"press-scale inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface font-semibold text-sm transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CatalogPagination({
	currentPage,
	totalPages,
	totalItems,
	pageSize,
	getHref,
	onNavigate,
}: CatalogPaginationProps) {
	const t = useTranslations("PluginsPage");
	const items = getPaginationItems(currentPage, totalPages);
	const firstItem = (currentPage - 1) * pageSize + 1;
	const lastItem = Math.min(currentPage * pageSize, totalItems);

	return (
		<nav
			className="mt-10 flex flex-col items-center gap-4"
			aria-label={t("pagination_label")}
		>
			<p className="text-center text-muted-foreground text-sm">
				{t("pagination_results", {
					from: firstItem,
					to: lastItem,
					total: totalItems,
				})}
			</p>

			<div className="grid w-full max-w-xl grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 rounded-2xl bg-surface/70 p-2 sm:gap-3 sm:p-3">
				{currentPage > 1 ? (
					<Link
						href={getHref(currentPage - 1)}
						scroll={false}
						onNavigate={onNavigate}
						className={controlClassName}
						aria-label={t("prev_page")}
					>
						<ChevronLeft className="size-4" />
					</Link>
				) : (
					<button
						type="button"
						disabled
						className={cn(controlClassName, "cursor-not-allowed opacity-35")}
						aria-label={t("prev_page")}
					>
						<ChevronLeft className="size-4" />
					</button>
				)}

				<div className="scrollbar-hide flex min-w-0 items-center justify-center gap-1 overflow-x-auto sm:gap-2">
					{items.map((item) => {
						if (typeof item !== "number") {
							return (
								<span
									key={item}
									className="hidden size-9 shrink-0 items-center justify-center text-muted-foreground sm:inline-flex"
									aria-hidden="true"
								>
									…
								</span>
							);
						}

						const isCurrent = item === currentPage;
						const isMobileNeighbor = Math.abs(item - currentPage) <= 1;

						return (
							<Link
								key={item}
								href={getHref(item)}
								scroll={false}
								onNavigate={isCurrent ? undefined : onNavigate}
								aria-current={isCurrent ? "page" : undefined}
								aria-label={
									isCurrent
										? t("current_page", { page: item })
										: t("go_to_page", { page: item })
								}
								className={cn(
									controlClassName,
									"size-10 sm:size-11",
									!isMobileNeighbor && "hidden sm:inline-flex",
									isCurrent &&
										"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
								)}
							>
								{item}
							</Link>
						);
					})}
				</div>

				{currentPage < totalPages ? (
					<Link
						href={getHref(currentPage + 1)}
						scroll={false}
						onNavigate={onNavigate}
						className={controlClassName}
						aria-label={t("next_page")}
					>
						<ChevronRight className="size-4" />
					</Link>
				) : (
					<button
						type="button"
						disabled
						className={cn(controlClassName, "cursor-not-allowed opacity-35")}
						aria-label={t("next_page")}
					>
						<ChevronRight className="size-4" />
					</button>
				)}
			</div>

			<span className="font-mono text-muted-foreground text-xs">
				{t("page_of", { page: currentPage, total: totalPages })}
			</span>
		</nav>
	);
}
