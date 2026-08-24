import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { safeJsonParse } from "~/lib/utils";
import { db } from "~/server/db";
import { plugins, users } from "~/server/db/schema";
import {
	authenticateApiKey,
	recordApiUsage,
} from "~/server/lib/developer-platform";

const headers = {
	"access-control-allow-origin": "*",
	"access-control-allow-headers": "authorization, content-type",
	"access-control-allow-methods": "GET, OPTIONS",
};

export function OPTIONS() {
	return new Response(null, { status: 204, headers });
}

export async function GET(request: Request) {
	const startedAt = Date.now();
	const credential = await authenticateApiKey(request, "plugins:read");
	if (!credential) {
		return Response.json(
			{
				error: "invalid_api_key",
				message: "API-ключ недействителен или не имеет нужного scope",
			},
			{ status: 401, headers },
		);
	}

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
					id: plugins.id,
					name: plugins.name,
					slug: plugins.slug,
					description: plugins.shortDescription,
					version: plugins.version,
					category: plugins.category,
					tags: plugins.tags,
					downloads: plugins.downloadCount,
					rating: plugins.rating,
					ratingCount: plugins.ratingCount,
					exteralessCompatible: plugins.exteralessCompatible,
					updatedAt: plugins.updatedAt,
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
		return Response.json(
			{
				data: items.map((item) => ({
					...item,
					tags: safeJsonParse<string[]>(item.tags ?? "[]", []),
					rating: item.ratingCount > 0 ? item.rating : null,
				})),
				pagination: {
					page,
					limit,
					total: Number(totalRows[0]?.total ?? 0),
				},
			},
			{ headers },
		);
	} catch {
		statusCode = 500;
		return Response.json(
			{ error: "internal_error", message: "Не удалось получить плагины" },
			{ status: statusCode, headers },
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
