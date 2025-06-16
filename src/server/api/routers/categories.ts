import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { pluginCategories, plugins } from "~/server/db/schema";

export const categoriesRouter = createTRPCRouter({
	getAll: publicProcedure.query(async ({ ctx }) => {
		const categories = await ctx.db
			.select({
				id: pluginCategories.id,
				name: pluginCategories.name,
				slug: pluginCategories.slug,
				description: pluginCategories.description,
				icon: pluginCategories.icon,
				color: pluginCategories.color,
			})
			.from(pluginCategories);

		const categoriesWithCounts = await Promise.all(
			categories.map(async (category: typeof pluginCategories.$inferSelect) => {
				const [pluginCount] = await ctx.db
					.select({ count: count() })
					.from(plugins)
					.where(eq(plugins.category, category.slug));

				return {
					...category,
					pluginCount: pluginCount?.count ?? 0,
				};
			}),
		);

		return categoriesWithCounts;
	}),

	getBySlug: publicProcedure
		.input(z.object({ slug: z.string() }))
		.query(async ({ ctx, input }) => {
			const [category] = await ctx.db
				.select()
				.from(pluginCategories)
				.where(eq(pluginCategories.slug, input.slug))
				.limit(1);

			if (!category) {
				throw new Error("Категория не найдена");
			}

			const categoryPlugins = await ctx.db
				.select()
				.from(plugins)
				.where(eq(plugins.category, input.slug));

			return {
				...category,
				plugins: categoryPlugins,
			};
		}),
});
