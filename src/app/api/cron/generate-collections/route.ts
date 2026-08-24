import { NextResponse } from "next/server";
import {
	DEFAULT_AI_COLLECTION_THEMES,
	generateAndSaveAICollections,
} from "~/server/api/routers/plugin-pipeline";
import { db } from "~/server/db";
import { consumeAiRateLimit } from "~/server/lib/ai-rate-limiter";
import { isCronAuthorized } from "~/server/lib/cron-auth";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	if (!isCronAuthorized(request)) {
		return new Response("Unauthorized", {
			status: 401,
		});
	}

	try {
		const rateLimit = await consumeAiRateLimit(
			db,
			"system:generate-collections",
			"collections",
			DEFAULT_AI_COLLECTION_THEMES.length,
		);
		if (rateLimit.limited) {
			return NextResponse.json(
				{ success: false, error: "AI_RATE_LIMITED" },
				{ status: 429 },
			);
		}
		const result = await generateAndSaveAICollections(
			db,
			DEFAULT_AI_COLLECTION_THEMES,
			rateLimit.grant,
			"ru",
		);
		const generated = result.filter((item) => item.status === "success").length;
		const failed = result.length - generated;

		return NextResponse.json(
			{ success: generated > 0, generated, failed, data: result },
			{
				status: generated > 0 ? 200 : 502,
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
