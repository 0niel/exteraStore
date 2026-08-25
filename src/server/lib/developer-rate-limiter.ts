import "server-only";

import { and, inArray, lt, lte, sql } from "drizzle-orm";
import type { Database } from "~/server/db";
import { developerRateLimits } from "~/server/db/schema";

export interface DeveloperRateLimitRule {
	subjectKey: string;
	scope: string;
	limit: number;
	windowSeconds: number;
}

export type DeveloperRateLimitResult =
	| { limited: true; remaining: 0; resetAt: number }
	| { limited: false; remaining: number; resetAt: number };

class DeveloperRateLimitExceeded extends Error {
	readonly result: DeveloperRateLimitResult;

	constructor(result: DeveloperRateLimitResult) {
		super("Developer rate limit exceeded");
		this.result = result;
	}
}

export async function consumeDeveloperRateLimits(
	database: Database,
	rules: DeveloperRateLimitRule[],
	now = Math.floor(Date.now() / 1_000),
): Promise<DeveloperRateLimitResult> {
	if (
		rules.length === 0 ||
		rules.some(
			(rule) =>
				!Number.isInteger(rule.limit) ||
				rule.limit < 1 ||
				!Number.isInteger(rule.windowSeconds) ||
				rule.windowSeconds < 1,
		)
	) {
		throw new Error("Invalid developer rate limit policy");
	}

	try {
		return await database.transaction(async (transaction) => {
			let remaining = Number.POSITIVE_INFINITY;
			let resetAt = Number.POSITIVE_INFINITY;

			for (const rule of rules) {
				const windowStart =
					Math.floor(now / rule.windowSeconds) * rule.windowSeconds;
				const expiresAt = windowStart + rule.windowSeconds;
				const [row] = await transaction
					.insert(developerRateLimits)
					.values({
						subjectKey: rule.subjectKey,
						scope: rule.scope,
						windowStart,
						requestCount: 1,
						expiresAt,
						updatedAt: now,
					})
					.onConflictDoUpdate({
						target: [
							developerRateLimits.subjectKey,
							developerRateLimits.scope,
							developerRateLimits.windowStart,
						],
						set: {
							requestCount: sql`${developerRateLimits.requestCount} + 1`,
							expiresAt,
							updatedAt: now,
						},
						setWhere: lte(developerRateLimits.requestCount, rule.limit - 1),
					})
					.returning({ requestCount: developerRateLimits.requestCount });

				if (!row || row.requestCount > rule.limit) {
					throw new DeveloperRateLimitExceeded({
						limited: true,
						remaining: 0,
						resetAt: expiresAt,
					});
				}

				remaining = Math.min(remaining, rule.limit - row.requestCount);
				resetAt = Math.min(resetAt, expiresAt);
			}

			await transaction.delete(developerRateLimits).where(
				and(
					inArray(
						developerRateLimits.subjectKey,
						rules.map((rule) => rule.subjectKey),
					),
					lt(developerRateLimits.expiresAt, now),
				),
			);

			return {
				limited: false,
				remaining: Number.isFinite(remaining) ? remaining : 0,
				resetAt: Number.isFinite(resetAt) ? resetAt : now,
			};
		});
	} catch (error) {
		if (error instanceof DeveloperRateLimitExceeded) return error.result;
		throw error;
	}
}
