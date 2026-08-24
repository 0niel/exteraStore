import "server-only";

import { and, inArray, lt, lte, sql } from "drizzle-orm";
import type { Database } from "~/server/db";
import { aiRateLimits } from "~/server/db/schema";
import {
	type AiRateLimitFeature,
	getAiRateLimitRules,
	getWindowStart,
} from "~/server/lib/ai-rate-limit-policy";

export type { AiRateLimitFeature } from "~/server/lib/ai-rate-limit-policy";

const AI_BUDGET_GRANT = Symbol("ai-budget-grant");

export type AiBudgetGrant = {
	readonly [AI_BUDGET_GRANT]: true;
};

export type AiRateLimitResult =
	| {
			limited: true;
			remaining: 0;
			resetAt: number;
			grant: null;
	  }
	| {
			limited: false;
			remaining: number;
			resetAt: number;
			grant: AiBudgetGrant;
	  };

class RateLimitExceeded extends Error {
	readonly result: AiRateLimitResult;

	constructor(result: AiRateLimitResult) {
		super("AI rate limit exceeded");
		this.result = result;
	}
}

export function assertAiBudgetGrant(grant: AiBudgetGrant) {
	if (grant?.[AI_BUDGET_GRANT] !== true) {
		throw new Error("AI request does not have a valid budget grant");
	}
}

export async function consumeAiRateLimit(
	database: Database,
	subjectKey: string,
	feature: AiRateLimitFeature,
	cost = 1,
	now = Math.floor(Date.now() / 1_000),
): Promise<AiRateLimitResult> {
	if (!Number.isInteger(cost) || cost < 1) {
		throw new Error("AI rate limit cost must be a positive integer");
	}

	const rules = getAiRateLimitRules(feature);

	try {
		return await database.transaction(async (transaction) => {
			let remaining = Number.POSITIVE_INFINITY;
			let resetAt = now + 24 * 60 * 60;

			for (const rule of rules) {
				const ruleSubject =
					rule.subject === "application" ? "application:ai" : subjectKey;
				const windowStart = getWindowStart(now, rule.windowSeconds);
				const expiresAt = windowStart + rule.windowSeconds;
				const [row] = await transaction
					.insert(aiRateLimits)
					.values({
						subjectKey: ruleSubject,
						scope: rule.scope,
						windowStart,
						requestCount: cost,
						expiresAt,
						updatedAt: now,
					})
					.onConflictDoUpdate({
						target: [
							aiRateLimits.subjectKey,
							aiRateLimits.scope,
							aiRateLimits.windowStart,
						],
						set: {
							requestCount: sql`${aiRateLimits.requestCount} + ${cost}`,
							expiresAt,
							updatedAt: now,
						},
						setWhere: lte(aiRateLimits.requestCount, rule.limit - cost),
					})
					.returning({ requestCount: aiRateLimits.requestCount });

				if (!row || row.requestCount > rule.limit) {
					throw new RateLimitExceeded({
						limited: true,
						remaining: 0,
						resetAt: expiresAt,
						grant: null,
					});
				}

				remaining = Math.min(remaining, rule.limit - row.requestCount);
				resetAt = Math.min(resetAt, expiresAt);
			}

			await transaction
				.delete(aiRateLimits)
				.where(
					and(
						inArray(aiRateLimits.subjectKey, [subjectKey, "application:ai"]),
						lt(aiRateLimits.expiresAt, now),
					),
				);

			return {
				limited: false,
				remaining: Number.isFinite(remaining) ? remaining : 0,
				resetAt,
				grant: { [AI_BUDGET_GRANT]: true },
			};
		});
	} catch (error) {
		if (error instanceof RateLimitExceeded) {
			return error.result;
		}
		throw error;
	}
}
