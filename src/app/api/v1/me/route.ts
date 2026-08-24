import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import {
	authenticateApiKey,
	recordApiUsage,
} from "~/server/lib/developer-platform";

export async function GET(request: Request) {
	const startedAt = Date.now();
	const credential = await authenticateApiKey(request, "profile:read");
	if (!credential) {
		return Response.json({ error: "invalid_api_key" }, { status: 401 });
	}
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
			return Response.json({ error: "not_found" }, { status: statusCode });
		}
		return Response.json({ data: user });
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
