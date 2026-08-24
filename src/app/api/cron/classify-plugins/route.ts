import { NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";
import { classifyPluginBatch } from "~/server/lib/plugin-categorization";

export const maxDuration = 900;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	if (
		!env.CRON_SECRET ||
		request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`
	) {
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
		const result = await classifyPluginBatch(db, { offset, limit });
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
