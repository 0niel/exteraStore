import { type Client, createClient } from "@libsql/client";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import {
	drizzle as drizzlePostgres,
	type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
	client: Client | undefined;
	postgresClient: postgres.Sql | undefined;
};

const isPostgres = env.DATABASE_URL?.startsWith("postgresql") ?? false;

export type Database = PostgresJsDatabase<typeof schema>;

let db: Database;
let client: Client | null = null;
let postgresClient: postgres.Sql | null = null;

if (isPostgres && env.DATABASE_URL) {
	postgresClient =
		globalForDb.postgresClient ??
		postgres(env.DATABASE_URL, {
			max: env.NODE_ENV === "production" ? 50 : 10,
			idle_timeout: 20,
			connect_timeout: 15,
		});
	if (env.NODE_ENV !== "production")
		globalForDb.postgresClient = postgresClient;

	db = drizzlePostgres(postgresClient, { schema });
} else if (env.DATABASE_URL) {
	client = globalForDb.client ?? createClient({ url: env.DATABASE_URL });
	if (env.NODE_ENV !== "production") globalForDb.client = client;

	db = drizzleLibsql(client, { schema }) as unknown as Database;
} else {
	db = null as unknown as Database;
}

export { db, client, postgresClient };
