import { Award, Crown, Sparkles, Target, Trophy } from "lucide-react";
import type { DeveloperTierKey } from "~/lib/developer-reputation";

const DEVELOPER_TIER_ICONS = {
	rising: Sparkles,
	pro: Target,
	expert: Award,
	master: Trophy,
	legend: Crown,
} satisfies Record<DeveloperTierKey, typeof Sparkles>;

export function getDeveloperTierIcon(tier: DeveloperTierKey) {
	return DEVELOPER_TIER_ICONS[tier];
}
