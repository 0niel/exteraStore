import { and, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getCategoryEmoji } from "~/lib/category-icon";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
	pluginCategories,
	pluginPipelineChecks,
	plugins,
	users,
} from "~/server/db/schema";
import {
	getContentLocale,
	localizeCategoryRows,
	localizePluginRows,
} from "~/server/lib/content-localization";

export const categoriesRouter = createTRPCRouter({
	getAll: publicProcedure.query(async ({ ctx }) => {
		const locale = getContentLocale(ctx.headers);
		const categories = await ctx.db
			.select({
				id: pluginCategories.id,
				name: pluginCategories.name,
				contentLocale: pluginCategories.contentLocale,
				slug: pluginCategories.slug,
				description: pluginCategories.description,
				icon: pluginCategories.icon,
				color: pluginCategories.color,
				createdAt: pluginCategories.createdAt,
				pluginCount: count(plugins.id),
			})
			.from(pluginCategories)
			.leftJoin(
				plugins,
				and(
					eq(plugins.category, pluginCategories.slug),
					eq(plugins.status, "approved"),
				),
			)
			.groupBy(pluginCategories.id);

		const localized = await localizeCategoryRows(ctx.db, categories, locale);
		return localized.map((category) => ({
			...category,
			icon: getCategoryEmoji(category.icon, category.slug),
		}));
	}),

	getBySlug: publicProcedure
		.input(
			z.object({
				slug: z.string().trim().min(1).max(100),
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(24).default(12),
			}),
		)
		.query(async ({ ctx, input }) => {
			const locale = getContentLocale(ctx.headers);
			const where = and(
				eq(plugins.category, input.slug),
				eq(plugins.status, "approved"),
			);
			const offset = (input.page - 1) * input.limit;
			const [categoryRows, pluginRows, totalRows] = await Promise.all([
				ctx.db
					.select()
					.from(pluginCategories)
					.where(eq(pluginCategories.slug, input.slug))
					.limit(1),
				ctx.db
					.select({ plugin: plugins, authorImage: users.image })
					.from(plugins)
					.leftJoin(users, eq(plugins.authorId, users.id))
					.where(where)
					.orderBy(desc(plugins.createdAt))
					.limit(input.limit)
					.offset(offset),
				ctx.db.select({ count: count() }).from(plugins).where(where),
			]);
			const category = categoryRows[0];

			if (!category) {
				throw new Error("Категория не найдена");
			}

			const rawCategoryPlugins = pluginRows.map((row) => ({
				...row.plugin,
				authorImage: row.authorImage,
			}));
			const categoryPlugins = await localizePluginRows(
				ctx.db,
				rawCategoryPlugins,
				locale,
			);
			const latestSecurityChecks = categoryPlugins.length
				? await ctx.db
						.selectDistinctOn([pluginPipelineChecks.pluginId])
						.from(pluginPipelineChecks)
						.where(
							and(
								inArray(
									pluginPipelineChecks.pluginId,
									categoryPlugins.map((plugin) => plugin.id),
								),
								eq(pluginPipelineChecks.checkType, "security"),
							),
						)
						.orderBy(
							pluginPipelineChecks.pluginId,
							desc(pluginPipelineChecks.createdAt),
						)
				: [];
			const securityByPlugin = new Map(
				latestSecurityChecks.map((check) => [check.pluginId, check]),
			);
			const total = totalRows[0]?.count ?? 0;

			const localizedCategory = (
				await localizeCategoryRows(ctx.db, [category], locale)
			)[0];
			return {
				...(localizedCategory ?? category),
				icon: getCategoryEmoji(category.icon, category.slug),
				plugins: categoryPlugins.map((plugin) => ({
					...plugin,
					latestSecurityCheck: securityByPlugin.get(plugin.id) ?? null,
				})),
				pagination: {
					page: input.page,
					limit: input.limit,
					total,
					totalPages: Math.ceil(total / input.limit),
				},
			};
		}),
});
