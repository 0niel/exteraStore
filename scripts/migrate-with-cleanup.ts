import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import fs from "fs";
import path from "path";
import { Client } from "pg";
import { fileURLToPath } from "url";

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
		// Очистка битых записей (скрипт сам проверит существование таблиц)
		console.log("\n🧹 Cleaning up orphaned records (if any)...");
		const cleanupSQL = fs.readFileSync(
			path.join(__dirname, "cleanup-orphaned-records.sql"),
			"utf-8",
		);

		await client.query(cleanupSQL);
		console.log("✅ Orphaned records cleanup completed");

		// Запускаем миграции
		console.log("\n🚀 Running migrations...");
		const db = drizzle(client);
		await migrate(db, { migrationsFolder: "./drizzle" });
		console.log("✅ Migrations completed successfully");

		console.log("\n🎉 All done!");
	} catch (error) {
		console.error("\n❌ Error:", error);
		process.exit(1);
	} finally {
		await client.end();
		console.log("👋 Disconnected from database");
	}
}

main();
