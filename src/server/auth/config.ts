import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { env } from "~/env";
import { type Database, db } from "~/server/db";
import {
	accounts,
	sessions,
	users,
	verificationTokens,
} from "~/server/db/schema";
import {
	type TelegramLoginData,
	validateTelegramLoginData,
} from "~/server/lib/telegram-login-auth";
import {
	type TelegramMiniAppUser,
	validateTelegramMiniAppInitData,
} from "~/server/lib/telegram-mini-app-auth";

type AdapterSchema = NonNullable<
	Parameters<typeof DrizzleAdapter<Database>>[1]
>;

const ADMINS = (env.INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

async function persistTelegramUser(identity: TelegramMiniAppUser) {
	const existingUser = await db.query.users.findFirst({
		where: eq(users.telegramId, identity.id),
	});
	const name = [identity.firstName, identity.lastName]
		.filter(Boolean)
		.join(" ");
	const role = ADMINS.includes(identity.username?.toLowerCase() ?? "")
		? "admin"
		: (existingUser?.role ?? "user");
	const values = {
		name,
		image: identity.photoUrl ?? null,
		telegramUsername: identity.username,
		telegramFirstName: identity.firstName,
		telegramLastName: identity.lastName,
		role,
		isVerified: true,
	};

	if (existingUser) {
		const [updatedUser] = await db
			.update(users)
			.set(values)
			.where(eq(users.id, existingUser.id))
			.returning();

		return updatedUser ?? { ...existingUser, ...values };
	}

	const [newUser] = await db
		.insert(users)
		.values({
			id: identity.id,
			telegramId: identity.id,
			email: `${identity.id}@telegram.user`,
			...values,
		})
		.returning();

	return newUser ?? null;
}

declare module "next-auth" {
	interface Session extends DefaultSession {
		user: {
			id: string;
			telegramId?: string | null;
			telegramUsername?: string | null;
			role?: string;
			isVerified?: boolean;
		} & DefaultSession["user"];
	}

	interface User {
		telegramId?: string | null;
		telegramUsername?: string | null;
		telegramFirstName?: string | null;
		telegramLastName?: string | null;
		role?: string;
		isVerified?: boolean;
	}
}

export const authConfig = {
	secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
	trustHost: true,
	providers: [
		CredentialsProvider({
			id: "telegram",
			name: "Telegram",
			credentials: {
				initData: { label: "Mini App init data", type: "text" },
				id: { label: "ID", type: "text" },
				first_name: { label: "First Name", type: "text" },
				last_name: { label: "Last Name", type: "text" },
				username: { label: "Username", type: "text" },
				photo_url: { label: "Photo URL", type: "text" },
				auth_date: { label: "Auth Date", type: "text" },
				hash: { label: "Hash", type: "text" },
			},
			async authorize(credentials) {
				if (typeof credentials !== "object" || credentials === null) {
					return null;
				}

				const botToken = process.env.TELEGRAM_BOT_TOKEN;
				if (!botToken) {
					return null;
				}

				try {
					const initData = (credentials as Record<string, unknown>).initData;
					if (typeof initData === "string" && initData.length > 0) {
						const identity = validateTelegramMiniAppInitData(
							initData,
							botToken,
						);
						return await persistTelegramUser(identity);
					}

					const allowedKeys = [
						"id",
						"first_name",
						"last_name",
						"username",
						"photo_url",
						"auth_date",
						"hash",
					] as const;

					const strObj: Record<string, string> = {};
					for (const key of allowedKeys) {
						const val = (credentials as Record<string, unknown>)[key];
						if (val !== undefined && val !== null) {
							strObj[key] = String(val);
						}
					}

					return persistTelegramUser(
						validateTelegramLoginData(strObj as TelegramLoginData, botToken),
					);
				} catch {
					return null;
				}
			},
		}),
	],
	session: {
		strategy: "jwt",
	},
	adapter: DrizzleAdapter(
		db as Database,
		{
			usersTable: users,
			accountsTable: accounts,
			sessionsTable: sessions,
			verificationTokensTable: verificationTokens,
		} as unknown as AdapterSchema,
	),
	callbacks: {
		jwt: async ({ token, user }) => {
			if (user) {
				token.id = user.id;
				token.telegramUsername = user.telegramUsername;
				token.role = user.role;
				token.isVerified = user.isVerified;
			}
			return token;
		},
		session: async ({ session, token }) => {
			session.user = {
				...session.user,
				id: token.id as string,
				telegramUsername: token.telegramUsername as string | undefined,
				role: token.role as string | undefined,
				isVerified: token.isVerified as boolean | undefined,
			};
			return session;
		},
		signIn: async () => true,
	},
} satisfies NextAuthConfig;
