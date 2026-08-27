import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { safeJsonParse } from "~/lib/utils";
import { db } from "~/server/db";
import { plugins, users } from "~/server/db/schema";
import {
	getContentLocale,
	localizePluginRows,
} from "~/server/lib/content-localization";
import {
	authorizeApiRequest,
	recordApiUsage,
} from "~/server/lib/developer-platform";

const headers = {
	"access-control-allow-origin": "*",
	"access-control-allow-headers":
		"authorization, content-type, x-content-locale",
	"access-control-allow-methods": "GET, OPTIONS",
};

export function OPTIONS() {
	return new Response(null, { status: 204, headers });
}

export async function GET(request: Request) {
	const startedAt = Date.now();
	const authorization = await authorizeApiRequest(
		request,
		"plugins:read",
		headers,
	);
	if (!authorization.ok) return authorization.response;
	const { credential } = authorization;

	let statusCode = 200;
	try {
		const params = new URL(request.url).searchParams;
		const page = Math.max(
			1,
			Number.parseInt(params.get("page") ?? "1", 10) || 1,
		);
		const limit = Math.min(
			100,
			Math.max(1, Number.parseInt(params.get("limit") ?? "20", 10) || 20),
		);
		const search = params.get("search")?.trim().slice(0, 100);
		const category = params.get("category")?.trim().slice(0, 100);
		const localeParam = params.get("locale");
		const locale =
			localeParam === "ru" || localeParam === "en"
				? localeParam
				: getContentLocale(request.headers);
		const where = and(
			eq(plugins.status, "approved"),
			category ? eq(plugins.category, category) : undefined,
			search
				? or(
						ilike(plugins.name, `%${search}%`),
						ilike(plugins.description, `%${search}%`),
						ilike(plugins.tags, `%${search}%`),
					)
				: undefined,
		);
		const [items, totalRows] = await Promise.all([
			db
				.select({
					plugin: plugins,
					author: {
						id: users.id,
						name: users.name,
						avatarUrl: users.image,
					},
				})
				.from(plugins)
				.leftJoin(users, eq(plugins.authorId, users.id))
				.where(where)
				.orderBy(desc(plugins.updatedAt), desc(plugins.createdAt))
				.limit(limit)
				.offset((page - 1) * limit),
			db.select({ total: sql<number>`COUNT(*)` }).from(plugins).where(where),
		]);
		const localizedItems = await localizePluginRows(
			db,
			items.map((item) => item.plugin),
			locale,
		);
		return Response.json(
			{
				data: localizedItems.map((item, index) => ({
					id: item.id,
					name: item.name,
					slug: item.slug,
					description: item.shortDescription,
					version: item.version,
					category: item.category,
					tags: safeJsonParse<string[]>(item.tags ?? "[]", []),
					downloads: item.downloadCount,
					rating: item.ratingCount > 0 ? item.rating : null,
					ratingCount: item.ratingCount,
					exteralessCompatible: item.exteralessCompatible,
					updatedAt: item.updatedAt,
					author: items[index]?.author ?? null,
					locale: item.localizedLocale ?? item.contentLocale,
				})),
				pagination: {
					page,
					limit,
					total: Number(totalRows[0]?.total ?? 0),
				},
			},
			{ headers: authorization.responseHeaders },
		);
	} catch {
		statusCode = 500;
		return Response.json(
			{ error: "internal_error", message: "Не удалось получить плагины" },
			{ status: statusCode, headers: authorization.responseHeaders },
		);
	} finally {
		await recordApiUsage({
			apiKeyId: credential.id,
			request,
			statusCode,
			startedAt,
		});
	}
}
