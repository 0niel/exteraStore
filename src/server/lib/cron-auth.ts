import "server-only";

import { timingSafeEqual } from "node:crypto";
import { env } from "~/env";

export function isCronAuthorized(request: Request) {
	if (!env.CRON_SECRET) {
		return false;
	}

	const provided = request.headers.get("authorization") ?? "";
	const expected = `Bearer ${env.CRON_SECRET}`;
	const providedBuffer = Buffer.from(provided);
	const expectedBuffer = Buffer.from(expected);

	return (
		providedBuffer.length === expectedBuffer.length &&
		timingSafeEqual(providedBuffer, expectedBuffer)
	);
}
