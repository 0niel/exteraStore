import { and, eq } from "drizzle-orm";
import { safeJsonParse } from "~/lib/utils";
import { db } from "~/server/db";
import { plugins, users } from "~/server/db/schema";
import {
	authenticateApiKey,
	recordApiUsage,
} from "~/server/lib/developer-platform";

export async function GET(
	request: Request,
	context: { params: Promise<{ slug: string }> },
) {
	const startedAt = Date.now();
	const credential = await authenticateApiKey(request, "plugins:read");
	if (!credential) {
		return Response.json({ error: "invalid_api_key" }, { status: 401 });
	}
	let statusCode = 200;
	try {
		const { slug } = await context.params;
		const [plugin] = await db
			.select({
				plugin: plugins,
				authorId: users.id,
				authorName: users.name,
				authorImage: users.image,
			})
			.from(plugins)
			.leftJoin(users, eq(plugins.authorId, users.id))
			.where(and(eq(plugins.slug, slug), eq(plugins.status, "approved")))
			.limit(1);
		if (!plugin) {
			statusCode = 404;
			return Response.json({ error: "not_found" }, { status: statusCode });
		}
		return Response.json({
			data: {
				...plugin.plugin,
				tags: safeJsonParse<string[]>(plugin.plugin.tags ?? "[]", []),
				screenshots: safeJsonParse<string[]>(
					plugin.plugin.screenshots ?? "[]",
					[],
				),
				rating: plugin.plugin.ratingCount > 0 ? plugin.plugin.rating : null,
				author: {
					id: plugin.authorId,
					name: plugin.authorName,
					avatarUrl: plugin.authorImage,
				},
			},
		});
	} catch {
		statusCode = 500;
		return Response.json({ error: "internal_error" }, { status: statusCode });
	} finally {
		await recordApiUsage({
			apiKeyId: credential.id,
			request,
			statusCode,
			startedAt,
		});
	}
}
