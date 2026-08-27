import "server-only";

import { and, count, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "~/server/db";
import { pluginCategories, plugins, users } from "~/server/db/schema";
import {
	type ContentLocale,
	localizeCategoryRows,
	localizePluginRows,
} from "~/server/lib/content-localization";

export const getPublicPluginSeo = cache(
	async (slug: string, locale: ContentLocale) => {
		const rows = await db
			.select()
			.from(plugins)
			.where(and(eq(plugins.slug, slug), eq(plugins.status, "approved")))
			.limit(1);
		const localized = await localizePluginRows(db, rows, locale);
		return localized[0] ?? null;
	},
);

export const getPublicCategorySeo = cache(
	async (slug: string, locale: ContentLocale) => {
		const rows = await db
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
			.where(eq(pluginCategories.slug, slug))
			.groupBy(pluginCategories.id)
			.limit(1);
		const localized = await localizeCategoryRows(db, rows, locale);
		return localized[0] ?? null;
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
