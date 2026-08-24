export type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

export function getPaginationItems(
	currentPage: number,
	totalPages: number,
): PaginationItem[] {
	const total = Math.max(1, Math.floor(totalPages));
	const current = Math.min(total, Math.max(1, Math.floor(currentPage)));

	if (total <= 7) {
		return Array.from({ length: total }, (_, index) => index + 1);
	}

	const pages = new Set([1, total, current - 1, current, current + 1]);
	if (current <= 4) {
		pages.add(2);
		pages.add(3);
		pages.add(4);
	}
	if (current >= total - 3) {
		pages.add(total - 1);
		pages.add(total - 2);
		pages.add(total - 3);
	}

	const sortedPages = [...pages]
		.filter((page) => page >= 1 && page <= total)
		.sort((a, b) => a - b);
	const items: PaginationItem[] = [];

	for (const page of sortedPages) {
		const previous = items.at(-1);
		if (typeof previous === "number") {
			const gap = page - previous;
			if (gap === 2) items.push(previous + 1);
			if (gap > 2) {
				items.push(page < current ? "ellipsis-start" : "ellipsis-end");
			}
		}
		items.push(page);
	}

	return items;
}
