import "server-only";

import { and, count, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "~/server/db";
import {
	categoryTranslations,
	pluginCategories,
	plugins,
	pluginTranslations,
	users,
} from "~/server/db/schema";
import type { ContentLocale } from "~/server/lib/content-localization";

export const getPublicPluginSeo = cache(
	async (slug: string, locale: ContentLocale) => {
		const rows = await db
			.select({
				name: sql<string>`COALESCE(${pluginTranslations.name}, ${plugins.name})`,
				slug: plugins.slug,
				description: sql<string>`COALESCE(${pluginTranslations.description}, ${plugins.description})`,
				shortDescription: sql<
					string | null
				>`COALESCE(${pluginTranslations.shortDescription}, ${plugins.shortDescription})`,
				version: plugins.version,
				author: plugins.author,
				authorId: plugins.authorId,
				category: plugins.category,
				tags: sql<
					string | null
				>`COALESCE(${pluginTranslations.tags}, ${plugins.tags})`,
				downloadCount: plugins.downloadCount,
				rating: plugins.rating,
				ratingCount: plugins.ratingCount,
				price: plugins.price,
				screenshots: plugins.screenshots,
				createdAt: plugins.createdAt,
				updatedAt: plugins.updatedAt,
			})
			.from(plugins)
			.leftJoin(
				pluginTranslations,
				and(
					eq(pluginTranslations.pluginId, plugins.id),
					eq(pluginTranslations.locale, locale),
				),
			)
			.where(and(eq(plugins.slug, slug), eq(plugins.status, "approved")))
			.limit(1);
		return rows[0] ?? null;
	},
);

export const getPublicCategorySeo = cache(
	async (slug: string, locale: ContentLocale) => {
		const rows = await db
			.select({
				name: sql<string>`COALESCE(${categoryTranslations.name}, ${pluginCategories.name})`,
				slug: pluginCategories.slug,
				description: sql<
					string | null
				>`COALESCE(${categoryTranslations.description}, ${pluginCategories.description})`,
				pluginCount: count(plugins.id),
			})
			.from(pluginCategories)
			.leftJoin(
				categoryTranslations,
				and(
					eq(categoryTranslations.categoryId, pluginCategories.id),
					eq(categoryTranslations.locale, locale),
				),
			)
			.leftJoin(
				plugins,
				and(
					eq(plugins.category, pluginCategories.slug),
					eq(plugins.status, "approved"),
				),
			)
			.where(eq(pluginCategories.slug, slug))
			.groupBy(
				pluginCategories.id,
				categoryTranslations.name,
				categoryTranslations.description,
			)
			.limit(1);
		return rows[0] ?? null;
	},
);

export const getPublicDeveloperSeo = cache(async (id: string) => {
	const rows = await db
		.select({
			id: users.id,
			name: users.name,
			image: users.image,
			bio: users.bio,
			website: users.website,
			telegramUsername: users.telegramUsername,
			githubUsername: users.githubUsername,
			pluginCount: count(plugins.id),
			totalDownloads: sql<number>`COALESCE(SUM(${plugins.downloadCount}), 0)`,
			updatedAt: users.updatedAt,
			createdAt: users.createdAt,
		})
		.from(users)
		.innerJoin(
			plugins,
			and(eq(plugins.authorId, users.id), eq(plugins.status, "approved")),
		)
		.where(eq(users.id, id))
		.groupBy(users.id)
		.limit(1);
	return rows[0] ?? null;
});
