import { NextResponse } from "next/server";
import { db } from "~/server/db";
import {
	type AiBudgetGrant,
	consumeAiRateLimit,
} from "~/server/lib/ai-rate-limiter";
import { isCronAuthorized } from "~/server/lib/cron-auth";
import { classifyPluginBatch } from "~/server/lib/plugin-categorization";

export const maxDuration = 900;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	if (!isCronAuthorized(request)) {
		return new Response("Unauthorized", { status: 401 });
	}

	try {
		const url = new URL(request.url);
		const rawOffset = Number.parseInt(
			url.searchParams.get("offset") ?? "0",
			10,
		);
		const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "10", 10);
		const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;
		const limit = Number.isFinite(rawLimit)
			? Math.min(10, Math.max(1, rawLimit))
			: 10;
		const preferAi = url.searchParams.get("ai") !== "0";
		let budget: AiBudgetGrant | undefined;
		if (preferAi) {
			const rateLimit = await consumeAiRateLimit(
				db,
				"system:classify-plugins",
				"classification",
			);
			if (rateLimit.limited) {
				return NextResponse.json(
					{ success: false, error: "AI_RATE_LIMITED" },
					{ status: 429 },
				);
			}
			budget = rateLimit.grant;
		}
		const result = await classifyPluginBatch(
			db,
			{ offset, limit, preferAi },
			budget,
		);
		return NextResponse.json(
			{
				success: result.updated === result.processed && result.failed === 0,
				...result,
			},
			{
				status: result.failed === 0 ? 200 : 502,
				headers: { "Cache-Control": "no-store" },
			},
		);
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
