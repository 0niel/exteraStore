import { and, asc, count, desc, eq, inArray, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateSlug } from "~/lib/utils";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	pluginActivities,
	pluginCategories,
	pluginDownloads,
	pluginPipelineChecks,
	pluginReviews,
	plugins,
	users,
} from "~/server/db/schema";
import { verifyCaptcha } from "~/server/lib/captcha";
import { checkDownloadRateLimit, hashIp } from "~/server/lib/rate-limiter";

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
					.then((result: { count: number }[]) => result[0]?.count ?? 0),
			]);

			const pluginsWithSecurity = await Promise.all(
				pluginsList.map(async (plugin: typeof plugins.$inferSelect) => {
					const latestSecurityCheck = await ctx.db
						.select()
						.from(pluginPipelineChecks)
						.where(
							and(
								eq(pluginPipelineChecks.pluginId, plugin.id),
								eq(pluginPipelineChecks.checkType, "security"),
							),
						)
						.orderBy(desc(pluginPipelineChecks.createdAt))
						.limit(1);

					return {
						...plugin,
						latestSecurityCheck: latestSecurityCheck[0] || null,
					};
				}),
			);

			return {
				plugins: pluginsWithSecurity,
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

			const latestSecurityCheck = await ctx.db
				.select()
				.from(pluginPipelineChecks)
				.where(
					and(
						eq(pluginPipelineChecks.pluginId, plugin[0].id),
						eq(pluginPipelineChecks.checkType, "security"),
					),
				)
				.orderBy(desc(pluginPipelineChecks.createdAt))
				.limit(1);

			return {
				...plugin[0],
				latestSecurityCheck: latestSecurityCheck[0] || null,
			};
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
						userId: pluginReviews.userId,
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
					.then((result: { count: number }[]) => result[0]?.count ?? 0),
			]);

			return {
				reviews,
				totalCount,
				totalPages: Math.ceil(totalCount / input.limit),
				currentPage: input.page,
			};
		}),

	updateReview: protectedProcedure
		.input(
			z.object({
				reviewId: z.number(),
				rating: z.number().min(1).max(5).optional(),
				title: z.string().min(1).max(256).optional(),
				comment: z.string().max(2000).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.db
				.select({
					id: pluginReviews.id,
					pluginId: pluginReviews.pluginId,
					userId: pluginReviews.userId,
				})
				.from(pluginReviews)
				.where(eq(pluginReviews.id, input.reviewId))
				.limit(1);

			if (!existing[0]) {
				throw new Error("Review not found");
			}

			const isOwner = existing[0].userId === ctx.session.user.id;
			const isAdmin = ctx.session.user.role === "admin";
			if (!isOwner && !isAdmin) {
				throw new Error("Unauthorized");
			}

			const [updated] = await ctx.db
				.update(pluginReviews)
				.set({
					rating: input.rating ?? undefined,
					title: input.title ?? undefined,
					comment: input.comment ?? undefined,
					updatedAt: sql`extract(epoch from now())`,
				})
				.where(eq(pluginReviews.id, input.reviewId))
				.returning();

			const avgRating = await ctx.db
				.select({
					avg: sql<number>`AVG(${pluginReviews.rating})`,
					count: count(),
				})
				.from(pluginReviews)
				.where(eq(pluginReviews.pluginId, existing[0].pluginId));

			await ctx.db
				.update(plugins)
				.set({
					rating: Number(avgRating[0]?.avg ?? 0),
					ratingCount: Number(avgRating[0]?.count ?? 0),
				})
				.where(eq(plugins.id, existing[0].pluginId));

			try {
				await ctx.db.insert(pluginActivities).values({
					type: "review.updated",
					actorId: ctx.session.user.id,
					pluginId: existing[0].pluginId,
					reviewId: updated.id,
					message: updated.title ?? null,
				});
			} catch {}

			return updated;
		}),

	deleteReview: protectedProcedure
		.input(z.object({ reviewId: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.db
				.select({
					id: pluginReviews.id,
					pluginId: pluginReviews.pluginId,
					userId: pluginReviews.userId,
				})
				.from(pluginReviews)
				.where(eq(pluginReviews.id, input.reviewId))
				.limit(1);

			if (!existing[0]) {
				throw new Error("Review not found");
			}

			const isOwner = existing[0].userId === ctx.session.user.id;
			const isAdmin = ctx.session.user.role === "admin";
			if (!isOwner && !isAdmin) {
				throw new Error("Unauthorized");
			}

			await ctx.db
				.delete(pluginReviews)
				.where(eq(pluginReviews.id, input.reviewId));

			const avgRating = await ctx.db
				.select({
					avg: sql<number>`COALESCE(AVG(${pluginReviews.rating}), 0)`,
					count: count(),
				})
				.from(pluginReviews)
				.where(eq(pluginReviews.pluginId, existing[0].pluginId));

			await ctx.db
				.update(plugins)
				.set({
					rating: Number(avgRating[0]?.avg ?? 0),
					ratingCount: Number(avgRating[0]?.count ?? 0),
				})
				.where(eq(plugins.id, existing[0].pluginId));

			return { success: true };
		}),

	addReview: protectedProcedure
		.input(
			z.object({
				pluginId: z.number(),
				rating: z.number().min(1).max(5),
				title: z.string().min(1).max(256).optional(),
				comment: z.string().max(2000).optional(),
				captchaToken: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const captchaValid = await verifyCaptcha(
				input.captchaToken,
				ctx.headers.get("x-forwarded-for") || ctx.headers.get("x-real-ip"),
			);
			if (!captchaValid) {
				throw new Error("Captcha verification failed");
			}

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

			try {
				await ctx.db.insert(pluginActivities).values({
					type: "review.added",
					actorId: ctx.session.user.id,
					pluginId: input.pluginId,
					reviewId: review.id,
					rating: input.rating,
					message: input.title ?? null,
				});
			} catch {}

			return review;
		}),

	download: publicProcedure
		.input(
			z.object({
				pluginId: z.number(),
				userAgent: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const ipAddress =
				ctx.headers.get("x-forwarded-for") || ctx.headers.get("x-real-ip");

			const rateLimit = await checkDownloadRateLimit(
				ctx.db,
				input.pluginId,
				ctx.session?.user?.id,
				ipAddress,
			);

			if (rateLimit.limited) {
				throw new Error(rateLimit.reason);
			}

			const latestSecurityCheck = await ctx.db
				.select()
				.from(pluginPipelineChecks)
				.where(
					and(
						eq(pluginPipelineChecks.pluginId, input.pluginId),
						eq(pluginPipelineChecks.checkType, "security"),
					),
				)
				.orderBy(desc(pluginPipelineChecks.createdAt))
				.limit(1);

			const ipHashValue = hashIp(ipAddress);

			const conditions = [];
			conditions.push(eq(pluginDownloads.pluginId, input.pluginId));

			if (ctx.session?.user?.id) {
				conditions.push(eq(pluginDownloads.userId, ctx.session.user.id));
			} else if (ipHashValue) {
				conditions.push(eq(pluginDownloads.ipHash, ipHashValue));
			}

			const existingDownload =
				conditions.length > 1
					? await ctx.db
							.select({ id: pluginDownloads.id })
							.from(pluginDownloads)
							.where(and(...conditions))
							.limit(1)
					: null;

			const isFirstDownload =
				!existingDownload || existingDownload.length === 0;

			await ctx.db.insert(pluginDownloads).values({
				pluginId: input.pluginId,
				userId: ctx.session?.user?.id,
				userAgent: input.userAgent,
				ipHash: ipHashValue,
			});

			if (isFirstDownload) {
				await ctx.db
					.update(plugins)
					.set({
						downloadCount: sql`${plugins.downloadCount} + 1`,
					})
					.where(eq(plugins.id, input.pluginId));
			}

			const plugin = await ctx.db
				.select({ telegramBotDeeplink: plugins.telegramBotDeeplink })
				.from(plugins)
				.where(eq(plugins.id, input.pluginId))
				.limit(1);

			return {
				success: true,
				telegramBotDeeplink: plugin[0]?.telegramBotDeeplink,
				securityCheck: latestSecurityCheck[0] || null,
				isFirstDownload,
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
		.input(
			z.object({
				limit: z.number().min(1).max(20).default(6),
				months: z.number().min(1).max(12).default(6),
			}),
		)
		.query(async ({ ctx, input }) => {
			const monthsAgo = Math.floor(
				(Date.now() - input.months * 30 * 24 * 60 * 60 * 1000) / 1000,
			);

			const recentDownloads = await ctx.db
				.select({
					pluginId: pluginDownloads.pluginId,
					downloadCount: count(pluginDownloads.id),
				})
				.from(pluginDownloads)
				.where(sql`${pluginDownloads.downloadedAt} >= ${monthsAgo}`)
				.groupBy(pluginDownloads.pluginId);

			if (recentDownloads.length === 0) {
				return [];
			}

			const downloadsMap = new Map(
				recentDownloads.map(
					(item: { pluginId: number; downloadCount: number }) => [
						item.pluginId,
						Number(item.downloadCount),
					],
				),
			);

			const allPlugins = await ctx.db
				.select()
				.from(plugins)
				.where(
					and(
						eq(plugins.status, "approved"),
						inArray(
							plugins.id,
							recentDownloads.map(
								(d: { pluginId: number; downloadCount: number }) => d.pluginId,
							),
						),
					),
				);

			const pluginsWithScore = allPlugins.map(
				(plugin: typeof plugins.$inferSelect) => {
					const recentDownloadCount = downloadsMap.get(plugin.id) || 0;
					const daysSinceCreation = Math.floor(
						(Date.now() - plugin.createdAt * 1000) / (1000 * 60 * 60 * 24),
					);

					const popularityScore =
						Number(recentDownloadCount) * 0.7 +
						plugin.rating *
							Math.min(plugin.ratingCount / 10.0, 1.0) *
							20 *
							0.2 +
						Math.max(0, 30 - daysSinceCreation) * 0.1;

					return {
						...plugin,
						popularityScore,
					};
				},
			);

			return pluginsWithScore
				.sort(
					(a: { popularityScore: number }, b: { popularityScore: number }) =>
						b.popularityScore - a.popularityScore,
				)
				.slice(0, input.limit);
		}),

	getTrending: publicProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(20).default(6),
			}),
		)
		.query(async ({ ctx, input }) => {
			const now = Date.now();
			const oneDayMs = 24 * 60 * 60 * 1000;
			const oneWeekAgo = Math.floor((now - 7 * oneDayMs) / 1000);
			const twoWeeksAgo = Math.floor((now - 14 * oneDayMs) / 1000);
			const threeWeeksAgo = Math.floor((now - 21 * oneDayMs) / 1000);
			const fourWeeksAgo = Math.floor((now - 28 * oneDayMs) / 1000);

			const lastWeekDownloads = await ctx.db
				.select({
					pluginId: pluginDownloads.pluginId,
					downloadCount: count(pluginDownloads.id),
				})
				.from(pluginDownloads)
				.where(sql`${pluginDownloads.downloadedAt} >= ${oneWeekAgo}`)
				.groupBy(pluginDownloads.pluginId);

			const prevWeekDownloads = await ctx.db
				.select({
					pluginId: pluginDownloads.pluginId,
					downloadCount: count(pluginDownloads.id),
				})
				.from(pluginDownloads)
				.where(
					sql`${pluginDownloads.downloadedAt} >= ${twoWeeksAgo} AND ${pluginDownloads.downloadedAt} < ${oneWeekAgo}`,
				)
				.groupBy(pluginDownloads.pluginId);

			const thirdWeekDownloads = await ctx.db
				.select({
					pluginId: pluginDownloads.pluginId,
					downloadCount: count(pluginDownloads.id),
				})
				.from(pluginDownloads)
				.where(
					sql`${pluginDownloads.downloadedAt} >= ${threeWeeksAgo} AND ${pluginDownloads.downloadedAt} < ${twoWeeksAgo}`,
				)
				.groupBy(pluginDownloads.pluginId);

			const fourthWeekDownloads = await ctx.db
				.select({
					pluginId: pluginDownloads.pluginId,
					downloadCount: count(pluginDownloads.id),
				})
				.from(pluginDownloads)
				.where(
					sql`${pluginDownloads.downloadedAt} >= ${fourWeeksAgo} AND ${pluginDownloads.downloadedAt} < ${threeWeeksAgo}`,
				)
				.groupBy(pluginDownloads.pluginId);

			const lastWeekMap = new Map(
				lastWeekDownloads.map(
					(item: { pluginId: number; downloadCount: number }) => [
						item.pluginId,
						Number(item.downloadCount),
					],
				),
			);
			const prevWeekMap = new Map(
				prevWeekDownloads.map(
					(item: { pluginId: number; downloadCount: number }) => [
						item.pluginId,
						Number(item.downloadCount),
					],
				),
			);
			const thirdWeekMap = new Map(
				thirdWeekDownloads.map(
					(item: { pluginId: number; downloadCount: number }) => [
						item.pluginId,
						Number(item.downloadCount),
					],
				),
			);
			const fourthWeekMap = new Map(
				fourthWeekDownloads.map(
					(item: { pluginId: number; downloadCount: number }) => [
						item.pluginId,
						Number(item.downloadCount),
					],
				),
			);

			const allPluginIds = new Set([
				...lastWeekMap.keys(),
				...prevWeekMap.keys(),
				...thirdWeekMap.keys(),
				...fourthWeekMap.keys(),
			]);

			if (allPluginIds.size === 0) {
				return [];
			}

			const pluginIds = Array.from(allPluginIds) as number[];

			const allPlugins = await ctx.db
				.select()
				.from(plugins)
				.where(
					and(eq(plugins.status, "approved"), inArray(plugins.id, pluginIds)),
				);

			const pluginsWithTrendScore = allPlugins.map(
				(plugin: typeof plugins.$inferSelect) => {
					const week1 = Number(lastWeekMap.get(plugin.id) || 0);
					const week2 = Number(prevWeekMap.get(plugin.id) || 0);
					const week3 = Number(thirdWeekMap.get(plugin.id) || 0);
					const week4 = Number(fourthWeekMap.get(plugin.id) || 0);

					const daysSinceCreation = Math.floor(
						(now - plugin.createdAt * 1000) / oneDayMs,
					);

					const avgPrevious = (week2 + week3 + week4) / 3 || 1;
					const velocityScore = week1 / avgPrevious;

					const growthWeek2 = week2 > 0 ? (week1 - week2) / week2 : week1;
					const growthWeek3 = week3 > 0 ? (week2 - week3) / week3 : week2;
					const accelerationScore =
						growthWeek3 > 0 ? growthWeek2 / growthWeek3 : growthWeek2;

					const consistencyScore =
						week1 > 0 && week2 > 0 && week3 > 0
							? 1.5
							: week1 > 0 && week2 > 0
								? 1.2
								: 1.0;

					const freshBonus =
						daysSinceCreation <= 7
							? 3.0
							: daysSinceCreation <= 14
								? 2.5
								: daysSinceCreation <= 30
									? 2.0
									: daysSinceCreation <= 60
										? 1.5
										: 1.0;

					const minDownloads = 5;
					if (week1 < minDownloads) {
						return {
							...plugin,
							trendingScore: 0,
							week1,
							velocityScore: 0,
						};
					}

					const trendingScore =
						velocityScore * 40 +
						Math.max(0, Math.min(accelerationScore, 5)) * 20 +
						week1 * 2 +
						consistencyScore * 10 +
						freshBonus * 8;

					return {
						...plugin,
						trendingScore,
						week1,
						week2,
						week3,
						velocityScore,
						accelerationScore,
					};
				},
			);

			return pluginsWithTrendScore
				.sort(
					(a: { trendingScore: number }, b: { trendingScore: number }) =>
						b.trendingScore - a.trendingScore,
				)
				.slice(0, input.limit);
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
			const finalSlug = `${baseSlug}.${input.id}`;

			const [updatedPlugin] = await ctx.db
				.update(plugins)
				.set({
					name: input.name,
					slug: finalSlug,
					shortDescription: input.shortDescription,
					description: input.description,
					category: input.categorySlug,
					tags: input.tags,
					screenshots: input.screenshots,
					updatedAt: sql`extract(epoch from now())`,
				})
				.where(eq(plugins.id, input.id))
				.returning();

			revalidatePath(`/plugins/${finalSlug}`);
			revalidatePath(`/my-plugins/${finalSlug}/manage`);

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

	advancedSearch: publicProcedure
		.input(
			z.object({
				query: z.string().min(1),
				limit: z.number().min(1).max(50).default(20),
				categories: z.array(z.string()).optional(),
				minRating: z.number().min(0).max(5).optional(),
				sortBy: z
					.enum(["relevance", "newest", "popular", "rating", "downloads"])
					.default("relevance"),
				includeContent: z.boolean().default(false),
			}),
		)
		.query(async ({ ctx, input }) => {
			const searchTerms = input.query
				.toLowerCase()
				.trim()
				.split(/\s+/)
				.filter((term) => term.length > 0);

			if (searchTerms.length === 0) {
				return { plugins: [], suggestions: [] };
			}

			const queryLower = input.query.toLowerCase().trim();
			const likePattern = `%${queryLower}%`;

			const _wordPatterns = searchTerms.map((term) => `%${term}%`);

			const whereConditions = [eq(plugins.status, "approved")];

			if (input.categories && input.categories.length > 0) {
				whereConditions.push(
					sql`${plugins.category} = ANY(${JSON.stringify(input.categories)})`,
				);
			}

			if (input.minRating) {
				whereConditions.push(sql`${plugins.rating} >= ${input.minRating}`);
			}

			const relevanceScore = sql<number>`
				CASE
					-- Точное совпадение названия (высший приоритет)
					WHEN LOWER(${plugins.name}) = ${queryLower} THEN 1000
					-- Название начинается с запроса
					WHEN LOWER(${plugins.name}) LIKE ${`${queryLower}%`} THEN 900
					-- Название содержит запрос
					WHEN LOWER(${plugins.name}) LIKE ${likePattern} THEN 800
					ELSE 0
				END +
				CASE
					-- Автор точно совпадает
					WHEN LOWER(${plugins.author}) = ${queryLower} THEN 700
					-- Автор содержит запрос
					WHEN LOWER(${plugins.author}) LIKE ${likePattern} THEN 600
					ELSE 0
				END +
				CASE
					-- Краткое описание содержит запрос
					WHEN LOWER(${plugins.shortDescription}) LIKE ${likePattern} THEN 500
					ELSE 0
				END +
				CASE
					-- Полное описание содержит запрос
					WHEN LOWER(${plugins.description}) LIKE ${likePattern} THEN 400
					ELSE 0
				END +
				CASE
					-- Теги содержат запрос
					WHEN LOWER(${plugins.tags}) LIKE ${likePattern} THEN 300
					ELSE 0
				END +
				CASE
					-- Категория содержит запрос
					WHEN LOWER(${plugins.category}) LIKE ${likePattern} THEN 200
					ELSE 0
				END +
				-- Бонусы за качество плагина
				CASE
					WHEN ${plugins.featured} = true THEN 100
					ELSE 0
				END +
				CASE
					WHEN ${plugins.rating} >= 4.5 THEN 50
					WHEN ${plugins.rating} >= 4.0 THEN 30
					WHEN ${plugins.rating} >= 3.5 THEN 15
					ELSE 0
				END +
				-- Бонус за популярность (ограниченный)
				LEAST(${plugins.downloadCount} / 1000, 25)
			`;

			const searchCondition = sql`(
				LOWER(${plugins.name}) LIKE ${likePattern} OR
				LOWER(${plugins.author}) LIKE ${likePattern} OR
				LOWER(${plugins.shortDescription}) LIKE ${likePattern} OR
				LOWER(${plugins.description}) LIKE ${likePattern} OR
				LOWER(${plugins.tags}) LIKE ${likePattern} OR
				LOWER(${plugins.category}) LIKE ${likePattern}
			)`;

			const wordsCondition =
				searchTerms.length > 1
					? sql`OR (${sql.join(
							searchTerms.map(
								(term) => sql`(
						LOWER(${plugins.name}) LIKE ${`%${term}%`} OR
						LOWER(${plugins.shortDescription}) LIKE ${`%${term}%`} OR
						LOWER(${plugins.description}) LIKE ${`%${term}%`}
					)`,
							),
							sql` AND `,
						)})`
					: sql``;

			const finalSearchCondition = sql`(${searchCondition} ${wordsCondition})`;
			whereConditions.push(finalSearchCondition);

			let orderBy;
			switch (input.sortBy) {
				case "relevance":
					orderBy = [desc(relevanceScore), desc(plugins.downloadCount)];
					break;
				case "newest":
					orderBy = [desc(plugins.createdAt)];
					break;
				case "popular":
					orderBy = [desc(plugins.downloadCount)];
					break;
				case "rating":
					orderBy = [desc(plugins.rating), desc(plugins.ratingCount)];
					break;
				case "downloads":
					orderBy = [desc(plugins.downloadCount)];
					break;
				default:
					orderBy = [desc(relevanceScore)];
			}

			const resultsQuery = ctx.db
				.select({
					id: plugins.id,
					name: plugins.name,
					slug: plugins.slug,
					shortDescription: plugins.shortDescription,
					description: input.includeContent ? plugins.description : sql`NULL`,
					author: plugins.author,
					category: plugins.category,
					tags: plugins.tags,
					rating: plugins.rating,
					ratingCount: plugins.ratingCount,
					downloadCount: plugins.downloadCount,
					featured: plugins.featured,
					screenshots: plugins.screenshots,
					createdAt: plugins.createdAt,
					relevanceScore:
						input.sortBy === "relevance" ? relevanceScore : sql`NULL`,
				})
				.from(plugins)
				.where(and(...whereConditions))
				.orderBy(...orderBy)
				.limit(input.limit);

			const suggestionQuery = ctx.db
				.select({
					category: plugins.category,
					count: sql<number>`COUNT(*)`,
				})
				.from(plugins)
				.where(and(eq(plugins.status, "approved"), finalSearchCondition))
				.groupBy(plugins.category)
				.orderBy(desc(sql`COUNT(*)`))
				.limit(5);

			const [results, categoryStats] = await Promise.all([
				resultsQuery,
				suggestionQuery,
			]);

			const suggestions = categoryStats.map(
				(stat: { category: string; count: number }) => ({
					type: "category" as const,
					value: stat.category,
					count: stat.count,
				}),
			);

			return {
				plugins: results,
				suggestions,
				searchTerms,
				totalFound: results.length,
			};
		}),

	searchSuggestions: publicProcedure
		.input(z.object({ query: z.string().min(1).max(100) }))
		.query(async ({ ctx, input }) => {
			const likePattern = `%${input.query.toLowerCase()}%`;

			const [pluginSuggestions, categorySuggestions, authorSuggestions] =
				await Promise.all([
					ctx.db
						.select({
							type: sql`'plugin'`,
							value: plugins.name,
							slug: plugins.slug,
							extra: plugins.category,
						})
						.from(plugins)
						.where(
							and(
								eq(plugins.status, "approved"),
								sql`LOWER(${plugins.name}) LIKE ${likePattern}`,
							),
						)
						.orderBy(desc(plugins.downloadCount))
						.limit(5),

					ctx.db
						.select({
							type: sql`'category'`,
							value: plugins.category,
							slug: plugins.category,
							extra: sql<number>`COUNT(*)`,
						})
						.from(plugins)
						.where(
							and(
								eq(plugins.status, "approved"),
								sql`LOWER(${plugins.category}) LIKE ${likePattern}`,
							),
						)
						.groupBy(plugins.category)
						.orderBy(desc(sql`COUNT(*)`))
						.limit(3),

					ctx.db
						.select({
							type: sql`'author'`,
							value: plugins.author,
							slug: plugins.author,
							extra: sql<number>`COUNT(*)`,
						})
						.from(plugins)
						.where(
							and(
								eq(plugins.status, "approved"),
								sql`LOWER(${plugins.author}) LIKE ${likePattern}`,
							),
						)
						.groupBy(plugins.author)
						.orderBy(desc(sql`COUNT(*)`))
						.limit(3),
				]);

			return [
				...pluginSuggestions,
				...categorySuggestions,
				...authorSuggestions,
			];
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

	similarByName: publicProcedure
		.input(
			z.object({
				name: z.string().min(2),
				limit: z.number().min(1).max(10).default(5),
			}),
		)
		.query(async ({ ctx, input }) => {
			const likePattern = `%${input.name.trim().toLowerCase()}%`;
			const list = await ctx.db
				.select({
					id: plugins.id,
					name: plugins.name,
					slug: plugins.slug,
					shortDescription: plugins.shortDescription,
					category: plugins.category,
					rating: plugins.rating,
					ratingCount: plugins.ratingCount,
				})
				.from(plugins)
				.where(sql`LOWER(${plugins.name}) LIKE ${likePattern}`)
				.orderBy(
					desc(plugins.rating),
					desc(plugins.ratingCount),
					desc(plugins.createdAt),
				)
				.limit(input.limit);

			return list;
		}),
});
