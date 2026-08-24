const HOUR_SECONDS = 60 * 60;
const DAY_SECONDS = 24 * HOUR_SECONDS;

export const AI_FEATURE_LIMITS = {
	review_summary: { hourly: 6, daily: 20 },
	plugin_insight: { hourly: 6, daily: 20 },
	diff_explanation: { hourly: 10, daily: 30 },
	tag_suggestion: { hourly: 12, daily: 40 },
	ask_plugin: { hourly: 10, daily: 30 },
	text_improvement: { hourly: 12, daily: 40 },
	pipeline_checks: { hourly: 4, daily: 10 },
	worker_pipeline: { hourly: 50, daily: 200 },
	collections: { hourly: 12, daily: 24 },
	classification: { hourly: 5, daily: 20 },
} as const;

export type AiRateLimitFeature = keyof typeof AI_FEATURE_LIMITS;

const CALLER_LIMIT = { hourly: 30, daily: 80 } as const;
const APPLICATION_LIMIT = { hourly: 300, daily: 1_000 } as const;

export type AiRateLimitWindowRule = {
	scope: string;
	subject: "caller" | "application";
	windowSeconds: number;
	limit: number;
};

export function getWindowStart(now: number, windowSeconds: number) {
	return Math.floor(now / windowSeconds) * windowSeconds;
}

export function getAiRateLimitRules(
	feature: AiRateLimitFeature,
): AiRateLimitWindowRule[] {
	const featureLimit = AI_FEATURE_LIMITS[feature];
	return [
		{
			scope: "application:hour",
			subject: "application",
			windowSeconds: HOUR_SECONDS,
			limit: APPLICATION_LIMIT.hourly,
		},
		{
			scope: "application:day",
			subject: "application",
			windowSeconds: DAY_SECONDS,
			limit: APPLICATION_LIMIT.daily,
		},
		{
			scope: "caller:hour",
			subject: "caller",
			windowSeconds: HOUR_SECONDS,
			limit: CALLER_LIMIT.hourly,
		},
		{
			scope: "caller:day",
			subject: "caller",
			windowSeconds: DAY_SECONDS,
			limit: CALLER_LIMIT.daily,
		},
		{
			scope: `${feature}:hour`,
			subject: "caller",
			windowSeconds: HOUR_SECONDS,
			limit: featureLimit.hourly,
		},
		{
			scope: `${feature}:day`,
			subject: "caller",
			windowSeconds: DAY_SECONDS,
			limit: featureLimit.daily,
		},
	];
}
