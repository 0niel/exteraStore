export const translationScopes = ["plugins", "categories", "all"] as const;

export type TranslationScope = (typeof translationScopes)[number];

export const translationEntityTypes = [
	"plugin",
	"category",
	"collection",
	"version",
	"pipeline_check",
] as const;

export type TranslationEntityType = (typeof translationEntityTypes)[number];

export const ADMIN_TRANSLATION_BATCH_SIZE = 5;
export const BACKGROUND_TRANSLATION_BATCH_SIZE = 12;
export const PIPELINE_TRANSLATION_BATCH_SIZE = 5;
export const MAX_TRANSLATION_BATCH_SIZE = 12;

export function entityTypesForTranslationScope(
	scope: TranslationScope,
): TranslationEntityType[] {
	if (scope === "plugins") return ["plugin"];
	if (scope === "categories") return ["category"];
	return [...translationEntityTypes];
}

export function normalizeTranslationBatchSize(limit: number) {
	return Math.max(1, Math.min(limit, MAX_TRANSLATION_BATCH_SIZE));
}
