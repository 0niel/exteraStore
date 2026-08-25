import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { plugins, users } from "~/server/db/schema";

export const developersRouter = createTRPCRouter({
	getDevelopers: publicProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(50).default(12),
				search: z.string().trim().max(100).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const offset = (input.page - 1) * input.limit;

			const whereConditions = [eq(plugins.status, "approved")];

			if (input.search) {
				const searchCondition = or(
					ilike(users.name, `%${input.search}%`),
					ilike(users.telegramUsername, `%${input.search}%`),
					ilike(users.githubUsername, `%${input.search}%`),
				);
				if (searchCondition) {
					whereConditions.push(searchCondition);
				}
			}

			const developersQuery = ctx.db
				.select({
					id: users.id,
					name: users.name,
					image: users.image,
					bio: users.bio,
					website: users.website,
					links: users.links,
					githubUsername: users.githubUsername,
					isVerified: users.isVerified,
					pluginCount: count(plugins.id),
					ratingCount: sql<number>`COALESCE(SUM(${plugins.ratingCount}), 0)`,
					averageRating: sql<
						number | null
					>`CASE WHEN SUM(${plugins.ratingCount}) > 0 THEN SUM(${plugins.rating} * ${plugins.ratingCount}) / SUM(${plugins.ratingCount}) ELSE NULL END`,
					totalDownloads: sql<number>`SUM(${plugins.downloadCount})`,
				})
				.from(users)
				.innerJoin(plugins, eq(plugins.authorId, users.id))
				.where(and(...whereConditions))
				.groupBy(users.id)
				.having(sql`COUNT(${plugins.id}) > 0`)
				.orderBy(desc(count(plugins.id)))
				.limit(input.limit)
				.offset(offset);

			const totalQuery = ctx.db.select({ count: count() }).from(
				ctx.db
					.select({ id: users.id })
					.from(users)
					.innerJoin(plugins, eq(plugins.authorId, users.id))
					.where(and(...whereConditions))
					.groupBy(users.id)
					.having(sql`COUNT(${plugins.id}) > 0`)
					.as("developers_subquery"),
			);

			const [developers, totalResult] = await Promise.all([
				developersQuery,
				totalQuery,
			]);

			const total = totalResult[0]?.count ?? 0;
			const totalPages = Math.ceil(total / input.limit);

			return {
				developers,
				pagination: {
					page: input.page,
					limit: input.limit,
					total,
					totalPages,
				},
			};
		}),

	getDeveloper: publicProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const developer = await ctx.db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
					image: users.image,
					bio: users.bio,
					website: users.website,
					links: users.links,
					donationRequisites: users.donationRequisites,
					githubUsername: users.githubUsername,
					telegramUsername: users.telegramUsername,
					isVerified: users.isVerified,
					createdAt: users.createdAt,
				})
				.from(users)
				.where(eq(users.id, input.id))
				.limit(1);

			if (!developer[0]) {
				throw new Error("Developer not found");
			}

			const developerPlugins = await ctx.db
				.select({
					id: plugins.id,
					name: plugins.name,
					slug: plugins.slug,
					description: plugins.description,
					shortDescription: plugins.shortDescription,
					version: plugins.version,
					category: plugins.category,
					tags: plugins.tags,
					author: plugins.author,
					authorId: plugins.authorId,
					price: plugins.price,
					downloadCount: plugins.downloadCount,
					rating: plugins.rating,
					ratingCount: plugins.ratingCount,
					featured: plugins.featured,
					verified: plugins.verified,
					screenshots: plugins.screenshots,
					createdAt: plugins.createdAt,
					authorImage: users.image,
				})
				.from(plugins)
				.leftJoin(users, eq(plugins.authorId, users.id))
				.where(
					and(eq(plugins.authorId, input.id), eq(plugins.status, "approved")),
				)
				.orderBy(desc(plugins.createdAt));

			const stats = await ctx.db
				.select({
					totalPlugins: count(plugins.id),
					totalDownloads: sql<number>`COALESCE(SUM(${plugins.downloadCount}), 0)`,
					ratingCount: sql<number>`COALESCE(SUM(${plugins.ratingCount}), 0)`,
					averageRating: sql<
						number | null
					>`CASE WHEN SUM(${plugins.ratingCount}) > 0 THEN SUM(${plugins.rating} * ${plugins.ratingCount}) / SUM(${plugins.ratingCount}) ELSE NULL END`,
				})
				.from(plugins)
				.where(
					and(eq(plugins.authorId, input.id), eq(plugins.status, "approved")),
				);

			return {
				developer: developer[0],
				plugins: developerPlugins,
				stats: stats[0] || {
					totalPlugins: 0,
					totalDownloads: 0,
					averageRating: 0,
					ratingCount: 0,
				},
			};
		}),
});
