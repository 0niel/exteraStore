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

export const ADMIN_TRANSLATION_BATCH_SIZE = 1;
export const BACKGROUND_TRANSLATION_BATCH_SIZE = 6;
export const PIPELINE_TRANSLATION_BATCH_SIZE = 1;
export const MAX_TRANSLATION_BATCH_SIZE = 12;
export const MAX_AI_TRANSLATION_BATCH_SIZE = 6;
export const MIN_TRANSLATION_RETRY_SECONDS = 60;

export class ContentTranslationRateLimitError extends Error {
	readonly resetAt: number;

	constructor(resetAt: number) {
		super("AI_TRANSLATION_RATE_LIMITED");
		this.name = "ContentTranslationRateLimitError";
		this.resetAt = resetAt;
	}
}

export function translationRetryAt(now: number, resetAt: number) {
	return Math.max(now + MIN_TRANSLATION_RETRY_SECONDS, resetAt);
}

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

export function splitAiTranslationBatch<T>(items: T[]) {
	return Array.from(
		{ length: Math.ceil(items.length / MAX_AI_TRANSLATION_BATCH_SIZE) },
		(_, index) =>
			items.slice(
				index * MAX_AI_TRANSLATION_BATCH_SIZE,
				(index + 1) * MAX_AI_TRANSLATION_BATCH_SIZE,
			),
	);
}
