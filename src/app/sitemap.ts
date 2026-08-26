import { and, desc, eq } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { absoluteUrl } from "~/lib/site";
import { safeJsonParse } from "~/lib/utils";
import { db } from "~/server/db";
import { pluginCategories, plugins, users } from "~/server/db/schema";

export const revalidate = 3600;

function asDate(value: number | null | undefined) {
	return value ? new Date(value * 1000) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const staticRoutes: MetadataRoute.Sitemap = [
		{ url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
		{
			url: absoluteUrl("/plugins"),
			changeFrequency: "daily",
			priority: 0.95,
		},
		{
			url: absoluteUrl("/categories"),
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: absoluteUrl("/developers"),
			changeFrequency: "weekly",
			priority: 0.75,
		},
		{
			url: absoluteUrl("/pulse"),
			changeFrequency: "daily",
			priority: 0.7,
		},
		{ url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
		{ url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
		{ url: absoluteUrl("/cookies"), changeFrequency: "yearly", priority: 0.2 },
		{ url: absoluteUrl("/license"), changeFrequency: "yearly", priority: 0.2 },
	];

	try {
		const [pluginRows, categoryRows, developerRows] = await Promise.all([
			db
				.select({
					slug: plugins.slug,
					screenshots: plugins.screenshots,
					createdAt: plugins.createdAt,
					updatedAt: plugins.updatedAt,
				})
				.from(plugins)
				.where(eq(plugins.status, "approved"))
				.orderBy(desc(plugins.updatedAt), desc(plugins.createdAt)),
			db
				.select({
					slug: pluginCategories.slug,
					createdAt: pluginCategories.createdAt,
				})
				.from(pluginCategories),
			db
				.selectDistinct({
					id: users.id,
					createdAt: users.createdAt,
					updatedAt: users.updatedAt,
				})
				.from(users)
				.innerJoin(
					plugins,
					and(eq(plugins.authorId, users.id), eq(plugins.status, "approved")),
				),
		]);

		return [
			...staticRoutes,
			...pluginRows.map((plugin) => ({
				url: absoluteUrl(`/plugins/${plugin.slug}`),
				lastModified: asDate(plugin.updatedAt ?? plugin.createdAt),
				changeFrequency: "weekly" as const,
				priority: 0.85,
				images: safeJsonParse<string[]>(plugin.screenshots ?? "[]", []).filter(
					(image) => image.startsWith("https://"),
				),
			})),
			...categoryRows.map((category) => ({
				url: absoluteUrl(`/categories/${category.slug}`),
				lastModified: asDate(category.createdAt),
				changeFrequency: "weekly" as const,
				priority: 0.7,
			})),
			...developerRows.map((developer) => ({
				url: absoluteUrl(`/developers/${developer.id}`),
				lastModified: asDate(developer.updatedAt ?? developer.createdAt),
				changeFrequency: "weekly" as const,
				priority: 0.65,
			})),
		];
	} catch {
		return staticRoutes;
	}
}
