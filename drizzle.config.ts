import type { Config } from "drizzle-kit";

import { env } from "~/env";

export default {
	schema: "./src/server/db/schema.ts",
	dialect: env.DATABASE_URL.startsWith("postgresql") ? "postgresql" : "sqlite",
	dbCredentials: env.DATABASE_URL.startsWith("postgresql")
		? {
				url: env.DATABASE_URL,
			}
		: {
				url: env.DATABASE_URL,
			},
	tablesFilter: ["extera_plugins_*"],
} satisfies Config;
