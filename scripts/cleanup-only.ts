import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
	if (!process.env.DATABASE_URL) {
		console.error("❌ DATABASE_URL environment variable is not set");
		process.exit(1);
	}

	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});

	console.log("🔌 Connecting to database...");
	await client.connect();
	console.log("✅ Connected to database");

	try {
		console.log("\n🧹 Cleaning up orphaned records...");
		const cleanupSQL = fs.readFileSync(
			path.join(__dirname, "cleanup-orphaned-records.sql"),
			"utf-8",
		);

		const result = await client.query(cleanupSQL);
		console.log("✅ Cleanup completed");

		if (result.rows && result.rows.length > 0) {
			console.log(`📊 ${result.rows[0].status}`);
		}
	} catch (error) {
		console.error("\n❌ Error:", error);
		process.exit(1);
	} finally {
		await client.end();
		console.log("👋 Disconnected from database");
	}
}

main();
