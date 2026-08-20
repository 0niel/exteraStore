import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
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
		TELEGRAM_API_BASE_URL: z
			.string()
			.url()
			.default("https://tg-proxy.controlisanillusion08.workers.dev"),
		TELEGRAM_WEBHOOK_SECRET: z
			.string()
			.min(32)
			.max(256)
			.regex(/^[A-Za-z0-9_-]+$/)
			.optional(),
		TELEGRAM_POLLING: z.enum(["true", "false"]).default("true"),
		OPENROUTER_API_KEY: z.string().optional(),
		OPENROUTER_MODEL: z.string().default("google/gemini-3.6-flash"),
		CRON_SECRET: z.string().min(32).optional(),
		UPLOADTHING_SECRET: z.string().optional(),
		UPLOADTHING_APP_ID: z.string().optional(),
		YANDEX_STORAGE_ACCESS_KEY: z.string().optional(),
		YANDEX_STORAGE_SECRET_KEY: z.string().optional(),
		YANDEX_STORAGE_BUCKET: z.string().optional(),
		INITIAL_ADMINS: z.string().default("i_am_oniel"),
		YANDEX_CAPTCHA_SECRET_KEY:
			process.env.NODE_ENV === "production"
				? z.string().min(1)
				: z.string().min(1).optional(),
	},

	client: {
		NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().optional(),
		NEXT_PUBLIC_INITIAL_ADMINS: z.string().default("i_am_oniel"),
		NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY: z.string().optional(),
	},

	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
		NEXTAUTH_URL: process.env.NEXTAUTH_URL,
		TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
		TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
		TELEGRAM_API_BASE_URL: process.env.TELEGRAM_API_BASE_URL,
		TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
		TELEGRAM_POLLING: process.env.TELEGRAM_POLLING,
		OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
		OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
		CRON_SECRET: process.env.CRON_SECRET,
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
		NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY:
			process.env.NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY,
		YANDEX_CAPTCHA_SECRET_KEY: process.env.YANDEX_CAPTCHA_SECRET_KEY,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
