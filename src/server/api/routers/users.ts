import { count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { plugins, users } from "~/server/db/schema";

export const usersRouter = createTRPCRouter({
	getProfile: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				image: users.image,
				bio: users.bio,
				website: users.website,
				links: users.links,
				githubUsername: users.githubUsername,
				telegramUsername: users.telegramUsername,
				isVerified: users.isVerified,
				createdAt: users.createdAt,
			})
			.from(users)
			.where(eq(users.id, ctx.session.user.id))
			.limit(1);

		if (!user[0]) {
			throw new Error("User not found");
		}

		const stats = await ctx.db
			.select({
				totalPlugins: count(plugins.id),
				totalDownloads: sql<number>`SUM(${plugins.downloadCount})`,
				averageRating: sql<number>`AVG(${plugins.rating})`,
			})
			.from(plugins)
			.where(eq(plugins.authorId, ctx.session.user.id));

		return {
			...user[0],
			stats: stats[0] || {
				totalPlugins: 0,
				totalDownloads: 0,
				averageRating: 0,
			},
		};
	}),

	updateProfile: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(255).optional(),
				bio: z.string().max(1000).optional(),
				website: z.string().url().optional().or(z.literal("")),
				links: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const updateData: any = {};

			if (input.name !== undefined) updateData.name = input.name;
			if (input.bio !== undefined) updateData.bio = input.bio || null;
			if (input.website !== undefined)
				updateData.website = input.website || null;
			if (input.links !== undefined) updateData.links = input.links || null;

			await ctx.db
				.update(users)
				.set(updateData)
				.where(eq(users.id, ctx.session.user.id));

			return { success: true };
		}),

	getPublicProfile: publicProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const user = await ctx.db
				.select({
					id: users.id,
					name: users.name,
					image: users.image,
					bio: users.bio,
					website: users.website,
					links: users.links,
					githubUsername: users.githubUsername,
					telegramUsername: users.telegramUsername,
					isVerified: users.isVerified,
					createdAt: users.createdAt,
				})
				.from(users)
				.where(eq(users.id, input.id))
				.limit(1);

			if (!user[0]) {
				throw new Error("User not found");
			}

			const stats = await ctx.db
				.select({
					totalPlugins: count(plugins.id),
					totalDownloads: sql<number>`SUM(${plugins.downloadCount})`,
					averageRating: sql<number>`AVG(${plugins.rating})`,
				})
				.from(plugins)
				.where(eq(plugins.authorId, input.id));

			return {
				...user[0],
				stats: stats[0] || {
					totalPlugins: 0,
					totalDownloads: 0,
					averageRating: 0,
				},
			};
		}),
});
