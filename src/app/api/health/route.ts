import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { client, db, postgresClient } from "~/server/db";

export async function GET() {
	try {
		await db.select({ test: sql`1` }).limit(1);

		const dbType = postgresClient ? "postgresql" : "sqlite";

		return NextResponse.json({
			status: "ok",
			timestamp: new Date().toISOString(),
			database: "connected",
			databaseType: dbType,
			version: process.env.npm_package_version || "unknown",
			nodeEnv: process.env.NODE_ENV,
		});
	} catch (error) {
		console.error("Health check failed:", error);

		return NextResponse.json(
			{
				status: "error",
				timestamp: new Date().toISOString(),
				database: "disconnected",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 503 },
		);
	}
}
