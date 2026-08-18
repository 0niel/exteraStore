import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { pluginReviews, plugins, users } from "~/server/db/schema";

const ADMINS = (env.INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

export const adminUsersRouter = createTRPCRouter({
	getUsers: protectedProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(100).default(20),
				search: z.string().optional(),
				banned: z.boolean().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);
			if (!isAdmin) throw new Error("Unauthorized");

			const offset = (input.page - 1) * input.limit;
			const whereClauses = [] as any[];

			if (input.banned !== undefined) {
				whereClauses.push(eq(users.isBanned, input.banned));
			}

			if (input.search) {
				whereClauses.push(
					or(
						like(users.name, `%${input.search}%`),
						like(users.email, `%${input.search}%`),
						like(users.telegramUsername, `%${input.search}%`),
					),
				);
			}

			const whereExpr = whereClauses.length ? and(...whereClauses) : undefined;

			const listQuery = ctx.db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
					image: users.image,
					telegramId: users.telegramId,
					telegramUsername: users.telegramUsername,
					role: users.role,
					isVerified: users.isVerified,
					isBanned: users.isBanned,
					bannedAt: users.bannedAt,
					bannedReason: users.bannedReason,
					createdAt: users.createdAt,
				})
				.from(users)
				.where(whereExpr ?? sql`1=1`)
				.orderBy(desc(users.createdAt))
				.limit(input.limit)
				.offset(offset);

			const totalQuery = ctx.db
				.select({ count: count() })
				.from(users)
				.where(whereExpr ?? sql`1=1`);

			const [usersList, totalRes] = await Promise.all([listQuery, totalQuery]);

			const usersWithStats = await Promise.all(
				usersList.map(async (user: (typeof usersList)[0]) => {
					const [pluginCount] = await ctx.db
						.select({ count: count() })
						.from(plugins)
						.where(eq(plugins.authorId, user.id));

					const [reviewCount] = await ctx.db
						.select({ count: count() })
						.from(pluginReviews)
						.where(eq(pluginReviews.userId, user.id));

					return {
						...user,
						pluginCount: pluginCount?.count ?? 0,
						reviewCount: reviewCount?.count ?? 0,
					};
				}),
			);

			const total = totalRes[0]?.count ?? 0;

			return {
				users: usersWithStats,
				pagination: {
					page: input.page,
					limit: input.limit,
					total,
					totalPages: Math.ceil(total / input.limit),
				},
			};
		}),

	banUser: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
				reason: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);
			if (!isAdmin) throw new Error("Unauthorized");

			if (input.userId === ctx.session.user.id) {
				throw new Error("Cannot ban yourself");
			}

			const targetUser = await ctx.db
				.select({ role: users.role })
				.from(users)
				.where(eq(users.id, input.userId))
				.limit(1);

			if (targetUser[0]?.role === "admin") {
				throw new Error("Cannot ban admin users");
			}

			const [bannedUser] = await ctx.db
				.update(users)
				.set({
					isBanned: true,
					bannedAt: Math.floor(Date.now() / 1000),
					bannedReason: input.reason,
					bannedBy: ctx.session.user.id,
					updatedAt: Math.floor(Date.now() / 1000),
				})
				.where(eq(users.id, input.userId))
				.returning();

			return bannedUser;
		}),

	unbanUser: protectedProcedure
		.input(z.object({ userId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);
			if (!isAdmin) throw new Error("Unauthorized");

			const [unbannedUser] = await ctx.db
				.update(users)
				.set({
					isBanned: false,
					bannedAt: null,
					bannedReason: null,
					bannedBy: null,
					updatedAt: Math.floor(Date.now() / 1000),
				})
				.where(eq(users.id, input.userId))
				.returning();

			return unbannedUser;
		}),

	updateRole: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
				role: z.enum(["user", "admin"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);
			if (!isAdmin) throw new Error("Unauthorized");

			if (input.userId === ctx.session.user.id) {
				throw new Error("Cannot change your own role");
			}

			const [updatedUser] = await ctx.db
				.update(users)
				.set({
					role: input.role,
					updatedAt: Math.floor(Date.now() / 1000),
				})
				.where(eq(users.id, input.userId))
				.returning();

			return updatedUser;
		}),

	deleteAllUserReviews: protectedProcedure
		.input(z.object({ userId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);
			if (!isAdmin) throw new Error("Unauthorized");

			const reviewsToDelete = await ctx.db
				.select({
					id: pluginReviews.id,
					pluginId: pluginReviews.pluginId,
				})
				.from(pluginReviews)
				.where(eq(pluginReviews.userId, input.userId));

			if (reviewsToDelete.length === 0) {
				return { deleted: 0, message: "No reviews found" };
			}

			await ctx.db
				.delete(pluginReviews)
				.where(eq(pluginReviews.userId, input.userId));

			const affectedPlugins = new Set(
				reviewsToDelete.map(
					(review: { id: number; pluginId: number }) => review.pluginId,
				),
			);

			const affectedPluginIds = Array.from(affectedPlugins) as number[];

			for (const pluginId of affectedPluginIds) {
				const avgRating = await ctx.db
					.select({
						avg: sql<number>`COALESCE(AVG(${pluginReviews.rating}), 0)`,
						count: count(),
					})
					.from(pluginReviews)
					.where(eq(pluginReviews.pluginId, pluginId));

				await ctx.db
					.update(plugins)
					.set({
						rating: Number(avgRating[0]?.avg ?? 0),
						ratingCount: Number(avgRating[0]?.count ?? 0),
					})
					.where(eq(plugins.id, pluginId));
			}

			return {
				deleted: reviewsToDelete.length,
				message: `Deleted ${reviewsToDelete.length} reviews from ${affectedPlugins.size} plugins`,
			};
		}),
});
