import { NextResponse } from "next/server";
import { env } from "~/env";
import {
	DEFAULT_AI_COLLECTION_THEMES,
	generateAndSaveAICollections,
} from "~/server/api/routers/plugin-pipeline";
import { db } from "~/server/db";

export async function GET(request: Request) {
	const authHeader = request.headers.get("authorization");
	if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
		return new Response("Unauthorized", {
			status: 401,
		});
	}

	try {
		const result = await generateAndSaveAICollections(
			db,
			DEFAULT_AI_COLLECTION_THEMES,
		);

		return NextResponse.json({ success: true, data: result });
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
