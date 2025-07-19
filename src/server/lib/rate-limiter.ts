import { and, count, eq, gte } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import crypto from "node:crypto";
import * as schema from "~/server/db/schema";

const ANON_DOWNLOAD_LIMIT = 5;
const USER_DOWNLOAD_LIMIT = 10;
const TIME_WINDOW_HOURS = 24;

function getIpHash(ip: string | undefined | null): string | null {
	if (!ip) return null;
	return crypto.createHash("sha256").update(ip).digest("hex");
}

export async function checkDownloadRateLimit(
	db: NeonHttpDatabase<typeof schema>,
	pluginId: number,
	userId: string | null | undefined,
	ip: string | undefined | null,
): Promise<{ limited: boolean; reason: string }> {
	const twentyFourHoursAgo = Math.floor(
		(Date.now() - TIME_WINDOW_HOURS * 60 * 60 * 1000) / 1000,
	);

	if (userId) {
		const [result] = await db
			.select({ value: count() })
			.from(schema.pluginDownloads)
			.where(
				and(
					eq(schema.pluginDownloads.pluginId, pluginId),
					eq(schema.pluginDownloads.userId, userId),
					gte(schema.pluginDownloads.downloadedAt, twentyFourHoursAgo),
				),
			);

		const downloadCount = result?.value ?? 0;
		if (downloadCount >= USER_DOWNLOAD_LIMIT) {
			return {
				limited: true,
				reason: `Превышен лимит загрузок для пользователя (${USER_DOWNLOAD_LIMIT} за ${TIME_WINDOW_HOURS} часа).`,
			};
		}
	} else {
		const ipHash = getIpHash(ip);
		if (ipHash) {
			const [result] = await db
				.select({ value: count() })
				.from(schema.pluginDownloads)
				.where(
					and(
						eq(schema.pluginDownloads.pluginId, pluginId),
						eq(schema.pluginDownloads.ipHash, ipHash),
						gte(schema.pluginDownloads.downloadedAt, twentyFourHoursAgo),
					),
				);

			const downloadCount = result?.value ?? 0;
			if (downloadCount >= ANON_DOWNLOAD_LIMIT) {
				return {
					limited: true,
					reason: `Превышен лимит загрузок для вашего IP-адреса (${ANON_DOWNLOAD_LIMIT} за ${TIME_WINDOW_HOURS} часа).`,
				};
			}
		}
	}

	return { limited: false, reason: "" };
}

export function hashIp(ip: string | undefined | null): string | null {
	return getIpHash(ip);
}
