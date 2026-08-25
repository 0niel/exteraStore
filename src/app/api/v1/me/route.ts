import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import {
	authorizeApiRequest,
	recordApiUsage,
} from "~/server/lib/developer-platform";

export async function GET(request: Request) {
	const startedAt = Date.now();
	const authorization = await authorizeApiRequest(request, "profile:read");
	if (!authorization.ok) return authorization.response;
	const { credential } = authorization;
	let statusCode = 200;
	try {
		const [user] = await db
			.select({
				id: users.id,
				name: users.name,
				avatarUrl: users.image,
				bio: users.bio,
				website: users.website,
				telegramUsername: users.telegramUsername,
				githubUsername: users.githubUsername,
				isVerified: users.isVerified,
			})
			.from(users)
			.where(eq(users.id, credential.userId))
			.limit(1);
		if (!user) {
			statusCode = 404;
			return Response.json(
				{ error: "not_found" },
				{ status: statusCode, headers: authorization.responseHeaders },
			);
		}
		return Response.json(
			{ data: user },
			{ headers: authorization.responseHeaders },
		);
	} catch {
		statusCode = 500;
		return Response.json(
			{ error: "internal_error" },
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
