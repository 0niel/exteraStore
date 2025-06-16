import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { AuthDataValidator } from "@telegram-auth/server";
import { objectToAuthDataMap } from "@telegram-auth/server/utils";
import { eq } from "drizzle-orm";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";

import { env } from "~/env";
import { db } from "~/server/db";
import {
	accounts,
	sessions,
	users,
	verificationTokens,
} from "~/server/db/schema";

const ADMINS = (env.INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https:
 */
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

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https:
 */
export const authConfig = {
	secret: process.env.NEXTAUTH_SECRET,
	trustHost: true,
	providers: [
		CredentialsProvider({
			id: "telegram",
			name: "Telegram",
			credentials: {
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

				if (!process.env.TELEGRAM_BOT_TOKEN) {
					console.error("TELEGRAM_BOT_TOKEN is not set");
					return null;
				}

				const validator = new AuthDataValidator({
					botToken: process.env.TELEGRAM_BOT_TOKEN,
				});

				try {
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

					const dataMap = objectToAuthDataMap(strObj);

					const validatedUser = await validator.validate(dataMap);

					const telegramId = validatedUser.id?.toString();
					if (!telegramId) return null;

					const existingUser = await db.query.users.findFirst({
						where: eq(users.telegramId, telegramId),
					});

					const fullName = `${validatedUser.first_name ?? ""}${validatedUser.last_name ? ` ${validatedUser.last_name}` : ""}`;
					const avatar =
						typeof validatedUser.photo_url === "string"
							? validatedUser.photo_url
							: null;

					const userIsAdmin = ADMINS.includes(
						(validatedUser.username ?? "").toLowerCase(),
					);

					if (existingUser) {
						await db
							.update(users)
							.set({
								name: fullName,
								image: avatar,
								telegramUsername: validatedUser.username as string | undefined,
								telegramFirstName: validatedUser.first_name as
									| string
									| undefined,
								telegramLastName: validatedUser.last_name as string | undefined,
								role: userIsAdmin ? "admin" : existingUser.role,
							})
							.where(eq(users.id, existingUser.id));

						return {
							...existingUser,
							role: userIsAdmin ? "admin" : existingUser.role,
						} as any;
					}

					const inserted = await db
						.insert(users)
						.values({
							telegramId: telegramId,
							name: fullName,
							email: `${telegramId}@telegram.user`,
							image: avatar,
							telegramUsername: validatedUser.username as string | undefined,
							telegramFirstName: validatedUser.first_name as string | undefined,
							telegramLastName: validatedUser.last_name as string | undefined,
							role: userIsAdmin ? "admin" : "user",
							isVerified: true,
						})
						.returning();

					const newUser = inserted[0] ?? null;
					return newUser;
				} catch (e) {
					console.error("[Auth] Failed to authorize telegram user", e);
					return null;
				}
			},
		}),
	],
	session: {
		strategy: "jwt",
	},
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens,
	}),
	callbacks: {
		jwt: async ({ token, user }) => {
			if (user) {
				token.id = (user as any).id;
				token.telegramUsername = (user as any).telegramUsername;
				token.role = (user as any).role;
				token.isVerified = (user as any).isVerified;
			}
			return token;
		},
		session: async ({ session, token }) => {
			console.log("[SessionCallback] token -> session", token);
			session.user = {
				...session.user,
				id: token.id as string,
				telegramUsername: token.telegramUsername as string | undefined,
				role: token.role as string | undefined,
				isVerified: token.isVerified as boolean | undefined,
			};
			return session;
		},
		signIn: async ({ user, account, profile }) => {
			console.log("[SignInCallback] signIn", {
				userId: user.id,
				provider: account?.provider,
			});
			if (account?.provider === "telegram") {
				return true;
			}
			if (account?.provider === "discord") {
			}
			return true;
		},
	},
	events: {
		createSession: async (ctx: any) => {
			console.log("[EVENT] createSession", ctx);
		},
		error: async (err: any) => {
			console.error("[EVENT] error", err);
		},
	} as any,
} satisfies NextAuthConfig;
