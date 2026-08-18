import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

if (!process.env.DATABASE_URL) {
	console.error("DATABASE_URL is required");
	process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
	await client.connect();
	const db = drizzle(client);
	await migrate(db, { migrationsFolder: "./drizzle" });
	console.log("Migrations completed successfully");
} catch (error) {
	console.error("Migration failed:", error);
	process.exit(1);
} finally {
	await client.end();
}
