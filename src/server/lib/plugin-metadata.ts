export function normalizeDiscoveryTags(tags: string[]) {
	return [
		...new Set(
			tags
				.map((tag) =>
					tag
						.trim()
						.toLowerCase()
						.replace(/^#+/, "")
						.replace(/\s+/g, "-")
						.replace(/[^\p{L}\p{N}-]/gu, "")
						.replace(/-{2,}/g, "-")
						.replace(/^-|-$/g, ""),
				)
				.filter((tag) => tag.length >= 2 && tag.length <= 40),
		),
	].slice(0, 6);
}
