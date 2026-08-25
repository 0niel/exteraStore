export const categoryDescriptionKeys = {
	tools: "legacy_tools_description",
	fun: "legacy_fun_description",
	"bots-automation": "legacy_bots_automation_description",
} as const;

export type CategoryDescriptionKey =
	(typeof categoryDescriptionKeys)[keyof typeof categoryDescriptionKeys];

export function getCategoryDescriptionKey(
	slug: string,
): CategoryDescriptionKey | null {
	return (
		categoryDescriptionKeys[slug as keyof typeof categoryDescriptionKeys] ??
		null
	);
}
