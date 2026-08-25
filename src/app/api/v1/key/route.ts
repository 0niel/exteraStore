import {
	authorizeApiRequest,
	recordApiUsage,
} from "~/server/lib/developer-platform";

export async function GET(request: Request) {
	const startedAt = Date.now();
	const authorization = await authorizeApiRequest(request);
	if (!authorization.ok) return authorization.response;
	const { credential } = authorization;
	const statusCode = 200;
	try {
		return Response.json(
			{
				data: {
					valid: true,
					scopes: credential.scopes,
				},
			},
			{ headers: authorization.responseHeaders },
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
