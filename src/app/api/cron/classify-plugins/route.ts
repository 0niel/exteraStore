import { NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";
import { classifyAllPlugins } from "~/server/lib/plugin-categorization";

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
		const result = await classifyAllPlugins(db);
		return NextResponse.json(
			{
				success: result.updated === result.total && result.failed === 0,
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
