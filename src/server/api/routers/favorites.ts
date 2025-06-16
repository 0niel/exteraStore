import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { pluginFavorites, plugins } from "~/server/db/schema";

export const favoritesRouter = createTRPCRouter({
	add: protectedProcedure
		.input(z.object({ pluginId: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ id: plugins.id })
				.from(plugins)
				.where(eq(plugins.id, input.pluginId))
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}

			const existingFavorite = await ctx.db
				.select()
				.from(pluginFavorites)
				.where(
					and(
						eq(pluginFavorites.pluginId, input.pluginId),
						eq(pluginFavorites.userId, ctx.session.user.id),
					),
				)
				.limit(1);

			if (existingFavorite[0]) {
				throw new Error("Plugin already in favorites");
			}

			const [favorite] = await ctx.db
				.insert(pluginFavorites)
				.values({
					pluginId: input.pluginId,
					userId: ctx.session.user.id,
				})
				.returning();

			return favorite;
		}),

	remove: protectedProcedure
		.input(z.object({ pluginId: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const result = await ctx.db
				.delete(pluginFavorites)
				.where(
					and(
						eq(pluginFavorites.pluginId, input.pluginId),
						eq(pluginFavorites.userId, ctx.session.user.id),
					),
				);

			return { success: true };
		}),

	toggle: protectedProcedure
		.input(z.object({ pluginId: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const existingFavorite = await ctx.db
				.select()
				.from(pluginFavorites)
				.where(
					and(
						eq(pluginFavorites.pluginId, input.pluginId),
						eq(pluginFavorites.userId, ctx.session.user.id),
					),
				)
				.limit(1);

			if (existingFavorite[0]) {
				await ctx.db
					.delete(pluginFavorites)
					.where(
						and(
							eq(pluginFavorites.pluginId, input.pluginId),
							eq(pluginFavorites.userId, ctx.session.user.id),
						),
					);
				return { isFavorited: false };
			}
			await ctx.db.insert(pluginFavorites).values({
				pluginId: input.pluginId,
				userId: ctx.session.user.id,
			});
			return { isFavorited: true };
		}),

	check: protectedProcedure
		.input(z.object({ pluginId: z.number() }))
		.query(async ({ ctx, input }) => {
			const favorite = await ctx.db
				.select()
				.from(pluginFavorites)
				.where(
					and(
						eq(pluginFavorites.pluginId, input.pluginId),
						eq(pluginFavorites.userId, ctx.session.user.id),
					),
				)
				.limit(1);

			return { isFavorited: !!favorite[0] };
		}),

	getUserFavorites: protectedProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(50).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			const offset = (input.page - 1) * input.limit;

			const favorites = await ctx.db
				.select({
					id: pluginFavorites.id,
					createdAt: pluginFavorites.createdAt,
					plugin: {
						id: plugins.id,
						name: plugins.name,
						slug: plugins.slug,
						shortDescription: plugins.shortDescription,
						description: plugins.description,
						version: plugins.version,
						author: plugins.author,
						category: plugins.category,
						downloadCount: plugins.downloadCount,
						rating: plugins.rating,
						ratingCount: plugins.ratingCount,
						price: plugins.price,
						featured: plugins.featured,
						verified: plugins.verified,
						screenshots: plugins.screenshots,
						tags: plugins.tags,
						createdAt: plugins.createdAt,
					},
				})
				.from(pluginFavorites)
				.innerJoin(plugins, eq(pluginFavorites.pluginId, plugins.id))
				.where(eq(pluginFavorites.userId, ctx.session.user.id))
				.orderBy(desc(pluginFavorites.createdAt))
				.limit(input.limit)
				.offset(offset);

			const totalResult = await ctx.db
				.select({ count: pluginFavorites.id })
				.from(pluginFavorites)
				.where(eq(pluginFavorites.userId, ctx.session.user.id));

			const total = totalResult.length;

			return {
				favorites: favorites.map((f: (typeof favorites)[0]) => f.plugin),
				pagination: {
					page: input.page,
					limit: input.limit,
					total,
					totalPages: Math.ceil(total / input.limit),
				},
			};
		}),
});
