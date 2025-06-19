import { type Client, createClient } from "@libsql/client";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
	client: Client | undefined;
	postgresClient: postgres.Sql | undefined;
};

const isPostgres = env.DATABASE_URL?.startsWith("postgresql") ?? false;

let db: any;
let client: Client | null = null;
let postgresClient: postgres.Sql | null = null;

if (isPostgres && env.DATABASE_URL) {
	postgresClient = globalForDb.postgresClient ?? postgres(env.DATABASE_URL);
	if (env.NODE_ENV !== "production")
		globalForDb.postgresClient = postgresClient;

	db = drizzlePostgres(postgresClient, { schema });
} else if (env.DATABASE_URL) {
	client = globalForDb.client ?? createClient({ url: env.DATABASE_URL });
	if (env.NODE_ENV !== "production") globalForDb.client = client;

	db = drizzleLibsql(client, { schema });
} else {
	// Fallback for build time when DATABASE_URL is not available
	// This will only be used during build and not at runtime
	db = null;
}

export { db, client, postgresClient };
