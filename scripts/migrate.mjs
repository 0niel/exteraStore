import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

if (!process.env.DATABASE_URL) {
	console.error("DATABASE_URL is required");
	process.exit(1);
}

const TOLERATED_CODES = new Set(["42P07", "42701", "42710", "42P16", "23505"]);

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
	await client.connect();

	await client.query('CREATE SCHEMA IF NOT EXISTS "drizzle"');
	await client.query(`CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
		id SERIAL PRIMARY KEY,
		hash text NOT NULL,
		created_at bigint
	)`);

	const journal = JSON.parse(
		readFileSync(join("drizzle", "meta", "_journal.json"), "utf8"),
	);
	const appliedRes = await client.query(
		'SELECT created_at FROM "drizzle"."__drizzle_migrations"',
	);
	const appliedAt = new Set(appliedRes.rows.map((r) => String(r.created_at)));

	let ran = 0;
	let baselined = 0;

	for (const entry of journal.entries) {
		if (appliedAt.has(String(entry.when))) {
			continue;
		}

		const sql = readFileSync(join("drizzle", `${entry.tag}.sql`), "utf8");
		const statements = sql
			.split("--> statement-breakpoint")
			.map((s) => s.trim())
			.filter(Boolean);

		let tolerated = 0;
		for (const statement of statements) {
			try {
				await client.query(statement);
			} catch (error) {
				if (error && TOLERATED_CODES.has(error.code)) {
					tolerated++;
					continue;
				}
				console.error(`Migration ${entry.tag} failed:`, error);
				process.exit(1);
			}
		}

		const hash = createHash("sha256").update(sql).digest("hex");
		await client.query(
			'INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
			[hash, entry.when],
		);

		if (tolerated === statements.length && statements.length > 0) {
			baselined++;
			console.log(`Baselined ${entry.tag} (all objects already existed)`);
		} else {
			ran++;
			console.log(
				`Applied ${entry.tag}${tolerated ? ` (${tolerated} pre-existing objects skipped)` : ""}`,
			);
		}
	}

	console.log(
		`Migrations completed: ${ran} applied, ${baselined} baselined, ${journal.entries.length - ran - baselined} already recorded`,
	);
} catch (error) {
	console.error("Migration failed:", error);
	process.exit(1);
} finally {
	await client.end();
}
