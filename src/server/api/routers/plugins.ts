import { and, asc, count, desc, eq, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateSlug, generateUniqueSlug } from "~/lib/utils";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	pluginCategories,
	pluginDownloads,
	pluginReviews,
	plugins,
	users,
} from "~/server/db/schema";

export const pluginsRouter = createTRPCRouter({
	getAll: publicProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(50).default(12),
				category: z.string().optional(),
				search: z.string().optional(),
				sortBy: z
					.enum(["newest", "popular", "rating", "downloads"])
					.default("newest"),
				featured: z.boolean().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const offset = (input.page - 1) * input.limit;

			const whereConditions = and(
				eq(plugins.status, "approved"),
				input.category ? eq(plugins.category, input.category) : undefined,
				input.search ? like(plugins.name, `%${input.search}%`) : undefined,
				input.featured ? eq(plugins.featured, true) : undefined,
			);

			let orderBy;
			switch (input.sortBy) {
				case "popular":
					orderBy = desc(plugins.downloadCount);
					break;
				case "rating":
					orderBy = desc(plugins.rating);
					break;
				case "downloads":
					orderBy = desc(plugins.downloadCount);
					break;
				default:
					orderBy = desc(plugins.createdAt);
			}

			const [pluginsList, totalCount] = await Promise.all([
				ctx.db
					.select()
					.from(plugins)
					.where(whereConditions)
					.orderBy(orderBy)
					.limit(input.limit)
					.offset(offset),
				ctx.db
					.select({ count: count() })
					.from(plugins)
					.where(whereConditions)
					.then((result: any) => result[0]?.count ?? 0),
			]);

			return {
				plugins: pluginsList,
				totalCount,
				totalPages: Math.ceil(totalCount / input.limit),
				currentPage: input.page,
			};
		}),

	getBySlug: publicProcedure
		.input(z.object({ slug: z.string() }))
		.query(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select()
				.from(plugins)
				.where(eq(plugins.slug, input.slug))
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}

			return plugin[0];
		}),

	getReviews: publicProcedure
		.input(
			z.object({
				pluginId: z.number(),
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(20).default(10),
			}),
		)
		.query(async ({ ctx, input }) => {
			const offset = (input.page - 1) * input.limit;

			const [reviews, totalCount] = await Promise.all([
				ctx.db
					.select({
						id: pluginReviews.id,
						rating: pluginReviews.rating,
						title: pluginReviews.title,
						comment: pluginReviews.comment,
						helpful: pluginReviews.helpful,
						createdAt: pluginReviews.createdAt,
						user: {
							name: users.name,
							image: users.image,
						},
					})
					.from(pluginReviews)
					.leftJoin(users, eq(pluginReviews.userId, users.id))
					.where(eq(pluginReviews.pluginId, input.pluginId))
					.orderBy(desc(pluginReviews.createdAt))
					.limit(input.limit)
					.offset(offset),
				ctx.db
					.select({ count: count() })
					.from(pluginReviews)
					.where(eq(pluginReviews.pluginId, input.pluginId))
					.then((result: any) => result[0]?.count ?? 0),
			]);

			return {
				reviews,
				totalCount,
				totalPages: Math.ceil(totalCount / input.limit),
				currentPage: input.page,
			};
		}),

	addReview: protectedProcedure
		.input(
			z.object({
				pluginId: z.number(),
				rating: z.number().min(1).max(5),
				title: z.string().min(1).max(256).optional(),
				comment: z.string().max(2000).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existingReview = await ctx.db
				.select()
				.from(pluginReviews)
				.where(
					and(
						eq(pluginReviews.pluginId, input.pluginId),
						eq(pluginReviews.userId, ctx.session.user.id),
					),
				)
				.limit(1);

			if (existingReview[0]) {
				throw new Error("You have already reviewed this plugin");
			}

			const [review] = await ctx.db
				.insert(pluginReviews)
				.values({
					pluginId: input.pluginId,
					userId: ctx.session.user.id,
					rating: input.rating,
					title: input.title,
					comment: input.comment,
				})
				.returning();

			const avgRating = await ctx.db
				.select({
					avg: sql<number>`AVG(${pluginReviews.rating})`,
					count: count(),
				})
				.from(pluginReviews)
				.where(eq(pluginReviews.pluginId, input.pluginId));

			if (avgRating[0]) {
				await ctx.db
					.update(plugins)
					.set({
						rating: avgRating[0].avg,
						ratingCount: avgRating[0].count,
					})
					.where(eq(plugins.id, input.pluginId));
			}

			return review;
		}),

	download: publicProcedure
		.input(
			z.object({
				pluginId: z.number(),
				userAgent: z.string().optional(),
				ipAddress: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.insert(pluginDownloads).values({
				pluginId: input.pluginId,
				userId: ctx.session?.user?.id,
				userAgent: input.userAgent,
				ipAddress: input.ipAddress,
			});

			await ctx.db
				.update(plugins)
				.set({
					downloadCount: sql`${plugins.downloadCount} + 1`,
				})
				.where(eq(plugins.id, input.pluginId));

			const plugin = await ctx.db
				.select({ telegramBotDeeplink: plugins.telegramBotDeeplink })
				.from(plugins)
				.where(eq(plugins.id, input.pluginId))
				.limit(1);

			return {
				success: true,
				telegramBotDeeplink: plugin[0]?.telegramBotDeeplink,
			};
		}),

	getCategories: publicProcedure.query(async ({ ctx }) => {
		return await ctx.db
			.select()
			.from(pluginCategories)
			.orderBy(asc(pluginCategories.name));
	}),

	getFeatured: publicProcedure
		.input(z.object({ limit: z.number().min(1).max(20).default(6) }))
		.query(async ({ ctx, input }) => {
			return await ctx.db
				.select()
				.from(plugins)
				.where(and(eq(plugins.featured, true), eq(plugins.status, "approved")))
				.orderBy(desc(plugins.rating))
				.limit(input.limit);
		}),

	getPopular: publicProcedure
		.input(z.object({ limit: z.number().min(1).max(20).default(6) }))
		.query(async ({ ctx, input }) => {
			return await ctx.db
				.select()
				.from(plugins)
				.where(eq(plugins.status, "approved"))
				.orderBy(desc(plugins.downloadCount))
				.limit(input.limit);
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				name: z.string().min(1).max(256),
				shortDescription: z.string().max(500).optional(),
				description: z.string().min(1),
				categorySlug: z.string(),
				tags: z.string(),
				screenshots: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ authorId: plugins.authorId })
				.from(plugins)
				.where(eq(plugins.id, input.id))
				.limit(1);

			if (!plugin[0] || plugin[0].authorId !== ctx.session.user.id) {
				throw new Error("Unauthorized or plugin not found");
			}

			const baseSlug = generateSlug(input.name);

			const [updatedPlugin] = await ctx.db
				.update(plugins)
				.set({
					name: input.name,
					slug: baseSlug,
					shortDescription: input.shortDescription,
					description: input.description,
					category: input.categorySlug,
					tags: input.tags,
					screenshots: input.screenshots,
					updatedAt: sql`extract(epoch from now())`,
				})
				.where(eq(plugins.id, input.id))
				.returning();

			revalidatePath(`/plugins/${baseSlug}`);
			revalidatePath(`/my-plugins/${baseSlug}/manage`);

			return updatedPlugin;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ authorId: plugins.authorId, slug: plugins.slug })
				.from(plugins)
				.where(eq(plugins.id, input.id))
				.limit(1);

			if (!plugin[0] || plugin[0].authorId !== ctx.session.user.id) {
				throw new Error("Unauthorized or plugin not found");
			}

			await ctx.db.delete(plugins).where(eq(plugins.id, input.id));

			revalidatePath("/my-plugins");
			revalidatePath(`/plugins/${plugin[0].slug}`);

			return { success: true };
		}),

	getByAuthor: protectedProcedure
		.input(z.object({ authorId: z.string() }))
		.query(async ({ ctx, input }) => {
			if (ctx.session.user.id !== input.authorId) {
				throw new Error("Unauthorized");
			}

			return await ctx.db
				.select()
				.from(plugins)
				.where(eq(plugins.authorId, input.authorId))
				.orderBy(desc(plugins.createdAt));
		}),

	getStats: publicProcedure.query(async ({ ctx }) => {
		const [pluginStats] = await ctx.db
			.select({
				totalPlugins: count(plugins.id),
				totalDownloads: sql<number>`COALESCE(SUM(${plugins.downloadCount}), 0)`,
			})
			.from(plugins)
			.where(eq(plugins.status, "approved"));

		const [developerStats] = await ctx.db
			.select({
				totalDevelopers: sql<number>`COUNT(DISTINCT ${plugins.authorId})`,
			})
			.from(plugins)
			.where(eq(plugins.status, "approved"));

		return {
			totalPlugins: pluginStats?.totalPlugins || 0,
			totalDownloads: Number(pluginStats?.totalDownloads) || 0,
			totalDevelopers: Number(developerStats?.totalDevelopers) || 0,
		};
	}),
});
