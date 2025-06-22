import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		DATABASE_URL: z.string().url(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		NEXTAUTH_SECRET:
			process.env.NODE_ENV === "production"
				? z.string()
				: z.string().optional(),
		NEXTAUTH_URL: z.preprocess(
			(str) => process.env.VERCEL_URL ?? str,

			process.env.VERCEL ? z.string() : z.string().url(),
		),
		TELEGRAM_BOT_TOKEN: z.string().optional(),
		TELEGRAM_BOT_USERNAME: z.string().optional(),
		OPENAI_API_KEY: z.string().optional(),
		ANTHROPIC_API_KEY: z.string().optional(),
		OPENROUTER_API_KEY: z.string().optional(),
		UPLOADTHING_SECRET: z.string().optional(),
		UPLOADTHING_APP_ID: z.string().optional(),
		YANDEX_STORAGE_ACCESS_KEY: z.string().optional(),
		YANDEX_STORAGE_SECRET_KEY: z.string().optional(),
		YANDEX_STORAGE_BUCKET: z.string().optional(),
		INITIAL_ADMINS: z.string().default("i_am_oniel"),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().optional(),
		NEXT_PUBLIC_INITIAL_ADMINS: z.string().default("i_am_oniel"),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
		NEXTAUTH_URL: process.env.NEXTAUTH_URL,
		TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
		TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
		OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
		UPLOADTHING_SECRET: process.env.UPLOADTHING_SECRET,
		UPLOADTHING_APP_ID: process.env.UPLOADTHING_APP_ID,
		YANDEX_STORAGE_ACCESS_KEY: process.env.YANDEX_STORAGE_ACCESS_KEY,
		YANDEX_STORAGE_SECRET_KEY: process.env.YANDEX_STORAGE_SECRET_KEY,
		YANDEX_STORAGE_BUCKET: process.env.YANDEX_STORAGE_BUCKET,
		INITIAL_ADMINS: process.env.INITIAL_ADMINS,
		NEXT_PUBLIC_TELEGRAM_BOT_USERNAME:
			process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
		NEXT_PUBLIC_INITIAL_ADMINS:
			process.env.NEXT_PUBLIC_INITIAL_ADMINS || process.env.INITIAL_ADMINS,
	},
	/**
	 * Run `build` or `dev` with SKIP_ENV_VALIDATION to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
