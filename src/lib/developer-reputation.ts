const DEVELOPER_TIERS = [
	{ key: "rising", minimumScore: 0 },
	{ key: "pro", minimumScore: 500 },
	{ key: "expert", minimumScore: 2_000 },
	{ key: "master", minimumScore: 5_000 },
	{ key: "legend", minimumScore: 10_000 },
] as const;

type DeveloperTier = (typeof DEVELOPER_TIERS)[number];
export type DeveloperTierKey = DeveloperTier["key"];

export interface DeveloperReputationInput {
	downloads: number;
	rating: number;
	pluginCount: number;
}

export interface DeveloperReputation {
	score: number;
	tier: DeveloperTier;
	nextTier: DeveloperTier | null;
	progress: number;
	scoreNeeded: number;
}

function normalizeMetric(value: number): number {
	return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateDeveloperScore({
	downloads,
	rating,
	pluginCount,
}: DeveloperReputationInput): number {
	return (
		normalizeMetric(downloads) * 0.6 +
		normalizeMetric(rating) * normalizeMetric(pluginCount) * 20
	);
}

export function getDeveloperReputation(
	input: DeveloperReputationInput,
): DeveloperReputation {
	const score = calculateDeveloperScore(input);
	let tierIndex = 0;

	for (const [index, tier] of DEVELOPER_TIERS.entries()) {
		if (score >= tier.minimumScore) {
			tierIndex = index;
		}
	}

	const tier = DEVELOPER_TIERS[tierIndex] ?? DEVELOPER_TIERS[0];
	const nextTier = DEVELOPER_TIERS[tierIndex + 1] ?? null;

	if (!nextTier) {
		return { score, tier, nextTier, progress: 100, scoreNeeded: 0 };
	}

	const tierRange = nextTier.minimumScore - tier.minimumScore;
	const progress = Math.min(
		100,
		Math.max(0, ((score - tier.minimumScore) / tierRange) * 100),
	);

	return {
		score,
		tier,
		nextTier,
		progress,
		scoreNeeded: Math.max(0, nextTier.minimumScore - score),
	};
}
