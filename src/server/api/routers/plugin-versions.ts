import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	pluginDownloads,
	pluginFiles,
	pluginPipelineChecks,
	plugins,
	pluginVersions,
	pluginVersionTranslations,
	users,
} from "~/server/db/schema";
import { getContentLocale } from "~/server/lib/content-localization";
import { checkDownloadRateLimit, hashIp } from "~/server/lib/rate-limiter";

export const pluginVersionsRouter = createTRPCRouter({
	getVersions: publicProcedure
		.input(z.object({ pluginSlug: z.string() }))
		.query(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({
					id: plugins.id,
					currentVersion: plugins.version,
					contentLocale: plugins.contentLocale,
				})
				.from(plugins)
				.where(
					and(
						eq(plugins.slug, input.pluginSlug),
						eq(plugins.status, "approved"),
					),
				)
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}
			const currentVersion = plugin[0].currentVersion;

			const versions = await ctx.db
				.select({
					id: pluginVersions.id,
					version: pluginVersions.version,
					changelog: pluginVersions.changelog,
					fileSize: pluginVersions.fileSize,
					fileHash: pluginVersions.fileHash,
					gitCommitHash: pluginVersions.gitCommitHash,
					gitBranch: pluginVersions.gitBranch,
					gitTag: pluginVersions.gitTag,
					isStable: pluginVersions.isStable,
					downloadCount: pluginVersions.downloadCount,
					createdAt: pluginVersions.createdAt,
					createdBy: {
						id: users.id,
						name: users.name,
						image: users.image,
					},
				})
				.from(pluginVersions)
				.innerJoin(users, eq(pluginVersions.createdById, users.id))
				.where(eq(pluginVersions.pluginId, plugin[0].id))
				.orderBy(desc(pluginVersions.createdAt));

			const locale = getContentLocale(ctx.headers);
			const translations =
				plugin[0].contentLocale !== locale && versions.length > 0
					? await ctx.db
							.select()
							.from(pluginVersionTranslations)
							.where(
								and(
									inArray(
										pluginVersionTranslations.versionId,
										versions.map((version) => version.id),
									),
									eq(pluginVersionTranslations.locale, locale),
								),
							)
					: [];
			const translationByVersion = new Map(
				translations.map((translation) => [translation.versionId, translation]),
			);

			return versions.map((version) => ({
				...version,
				changelog:
					translationByVersion.get(version.id)?.changelog ?? version.changelog,
				isCurrent: version.version === currentVersion,
			}));
		}),

	getVersion: publicProcedure
		.input(
			z.object({
				pluginSlug: z.string(),
				version: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ id: plugins.id, contentLocale: plugins.contentLocale })
				.from(plugins)
				.where(
					and(
						eq(plugins.slug, input.pluginSlug),
						eq(plugins.status, "approved"),
					),
				)
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}

			const version = await ctx.db
				.select()
				.from(pluginVersions)
				.where(
					and(
						eq(pluginVersions.pluginId, plugin[0].id),
						eq(pluginVersions.version, input.version),
					),
				)
				.limit(1);

			if (!version[0]) {
				throw new Error("Version not found");
			}

			const locale = getContentLocale(ctx.headers);
			if (plugin[0].contentLocale === locale || !version[0].changelog) {
				return version[0];
			}
			const translation =
				await ctx.db.query.pluginVersionTranslations.findFirst({
					where: and(
						eq(pluginVersionTranslations.versionId, version[0].id),
						eq(pluginVersionTranslations.locale, locale),
					),
				});
			return {
				...version[0],
				changelog: translation?.changelog ?? version[0].changelog,
			};
		}),

	downloadVersion: publicProcedure
		.input(
			z.object({
				pluginSlug: z.string(),
				version: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({
					id: plugins.id,
					name: plugins.name,
					telegramBotDeeplink: plugins.telegramBotDeeplink,
				})
				.from(plugins)
				.where(
					and(
						eq(plugins.slug, input.pluginSlug),
						eq(plugins.status, "approved"),
					),
				)
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}

			const userId = ctx.session?.user?.id;
			const ipAddress =
				ctx.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
				ctx.headers.get("x-real-ip");
			const rateLimit = await checkDownloadRateLimit(
				ctx.db,
				plugin[0].id,
				userId,
				ipAddress,
			);

			if (rateLimit.limited) {
				throw new Error(rateLimit.reason);
			}

			const version = await ctx.db
				.select()
				.from(pluginVersions)
				.where(
					and(
						eq(pluginVersions.pluginId, plugin[0].id),
						eq(pluginVersions.version, input.version),
					),
				)
				.limit(1);

			if (!version[0]) {
				throw new Error("Version not found");
			}

			const ipHashValue = hashIp(ipAddress);
			const identityCondition = userId
				? eq(pluginDownloads.userId, userId)
				: ipHashValue
					? eq(pluginDownloads.ipHash, ipHashValue)
					: undefined;
			const existingDownload = identityCondition
				? await ctx.db
						.select({ id: pluginDownloads.id })
						.from(pluginDownloads)
						.where(
							and(
								eq(pluginDownloads.versionId, version[0].id),
								identityCondition,
							),
						)
						.limit(1)
				: [];

			await ctx.db.insert(pluginDownloads).values({
				pluginId: plugin[0].id,
				versionId: version[0].id,
				userId,
				ipHash: ipHashValue,
				userAgent: ctx.headers.get("user-agent"),
			});

			if (!existingDownload[0]) {
				await ctx.db
					.update(pluginVersions)
					.set({
						downloadCount: sql`${pluginVersions.downloadCount} + 1`,
					})
					.where(eq(pluginVersions.id, version[0].id));

				await ctx.db
					.update(plugins)
					.set({
						downloadCount: sql`${plugins.downloadCount} + 1`,
					})
					.where(eq(plugins.id, plugin[0].id));
			}

			const pluginFile = await ctx.db.query.pluginFiles.findFirst({
				where: eq(pluginFiles.versionId, version[0].id),
			});

			const latestSecurityCheck = await ctx.db
				.select()
				.from(pluginPipelineChecks)
				.where(
					and(
						eq(pluginPipelineChecks.pluginId, plugin[0].id),
						eq(pluginPipelineChecks.checkType, "security"),
					),
				)
				.orderBy(desc(pluginPipelineChecks.createdAt))
				.limit(1);

			const originalExtension = pluginFile?.filename?.endsWith(".plugin")
				? ".plugin"
				: ".py";
			const fileName = `${input.pluginSlug}-v${input.version}${originalExtension}`;
			const fileContent = version[0].fileContent;

			if (plugin[0].telegramBotDeeplink) {
				const deeplink = `${plugin[0].telegramBotDeeplink}?version=${encodeURIComponent(input.version)}`;
				return {
					success: true,
					telegramBotDeeplink: deeplink,
					fileName,
					fileSize: version[0].fileSize,
					securityCheck: latestSecurityCheck[0] || null,
				};
			}

			return {
				success: true,
				fileName,
				fileContent,
				fileSize: version[0].fileSize,
				mimeType:
					originalExtension === ".plugin"
						? "application/octet-stream"
						: "text/x-python",
				securityCheck: latestSecurityCheck[0] || null,
			};
		}),

	compareVersions: publicProcedure
		.input(
			z.object({
				pluginSlug: z.string(),
				fromVersion: z.string(),
				toVersion: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ id: plugins.id })
				.from(plugins)
				.where(
					and(
						eq(plugins.slug, input.pluginSlug),
						eq(plugins.status, "approved"),
					),
				)
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}

			const versions = await ctx.db
				.select({
					version: pluginVersions.version,
					fileContent: pluginVersions.fileContent,
					changelog: pluginVersions.changelog,
					createdAt: pluginVersions.createdAt,
				})
				.from(pluginVersions)
				.where(eq(pluginVersions.pluginId, plugin[0].id));

			const fromVersionData = versions.find(
				(v) => v.version === input.fromVersion,
			);
			const toVersionData = versions.find((v) => v.version === input.toVersion);

			if (!fromVersionData || !toVersionData) {
				throw new Error("One or both versions not found");
			}

			return {
				fromVersion: {
					version: input.fromVersion,
					content: fromVersionData.fileContent,
					changelog: fromVersionData.changelog,
					createdAt: fromVersionData.createdAt,
				},
				toVersion: {
					version: input.toVersion,
					content: toVersionData.fileContent,
					changelog: toVersionData.changelog,
					createdAt: toVersionData.createdAt,
				},
			};
		}),

	getDiff: publicProcedure
		.input(
			z.object({
				pluginSlug: z.string(),
				fromVersion: z.string(),
				toVersion: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ id: plugins.id })
				.from(plugins)
				.where(
					and(
						eq(plugins.slug, input.pluginSlug),
						eq(plugins.status, "approved"),
					),
				)
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}

			const versions = await ctx.db
				.select({
					version: pluginVersions.version,
					fileContent: pluginVersions.fileContent,
				})
				.from(pluginVersions)
				.where(eq(pluginVersions.pluginId, plugin[0].id));

			const fromVersionData = versions.find(
				(v) => v.version === input.fromVersion,
			);
			const toVersionData = versions.find((v) => v.version === input.toVersion);

			if (!fromVersionData || !toVersionData) {
				throw new Error("One or both versions not found");
			}

			return {
				oldContent: fromVersionData.fileContent,
				newContent: toVersionData.fileContent,
			};
		}),

	getCommitDiff: publicProcedure
		.input(
			z.object({
				pluginSlug: z.string(),
				fromHash: z.string(),
				toHash: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ id: plugins.id })
				.from(plugins)
				.where(
					and(
						eq(plugins.slug, input.pluginSlug),
						eq(plugins.status, "approved"),
					),
				)
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}

			const versions = await ctx.db
				.select({
					version: pluginVersions.version,
					fileContent: pluginVersions.fileContent,
					fileHash: pluginVersions.fileHash,
					changelog: pluginVersions.changelog,
					createdAt: pluginVersions.createdAt,
				})
				.from(pluginVersions)
				.where(eq(pluginVersions.pluginId, plugin[0].id));

			const fromVersionData = versions.find((v) =>
				v.fileHash.startsWith(input.fromHash),
			);
			const toVersionData = versions.find((v) =>
				v.fileHash.startsWith(input.toHash),
			);

			if (!fromVersionData || !toVersionData) {
				throw new Error("One or both commit hashes not found");
			}

			return {
				oldContent: fromVersionData.fileContent,
				newContent: toVersionData.fileContent,
				fromVersion: {
					version: fromVersionData.version,
					hash: fromVersionData.fileHash,
					changelog: fromVersionData.changelog,
					createdAt: fromVersionData.createdAt,
				},
				toVersion: {
					version: toVersionData.version,
					hash: toVersionData.fileHash,
					changelog: toVersionData.changelog,
					createdAt: toVersionData.createdAt,
				},
			};
		}),

	deleteVersion: protectedProcedure
		.input(
			z.object({
				pluginSlug: z.string(),
				version: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({
					id: plugins.id,
					authorId: plugins.authorId,
					version: plugins.version,
				})
				.from(plugins)
				.where(eq(plugins.slug, input.pluginSlug))
				.limit(1);

			if (!plugin[0] || plugin[0].authorId !== ctx.session.user.id) {
				throw new Error("Plugin not found or unauthorized");
			}

			if (plugin[0].version === input.version) {
				throw new Error("Cannot delete current active version");
			}

			const version = await ctx.db
				.select({ id: pluginVersions.id })
				.from(pluginVersions)
				.where(
					and(
						eq(pluginVersions.pluginId, plugin[0].id),
						eq(pluginVersions.version, input.version),
					),
				)
				.limit(1);

			if (!version[0]) {
				throw new Error("Version not found");
			}

			await ctx.db
				.delete(pluginVersions)
				.where(eq(pluginVersions.id, version[0].id));

			return { success: true };
		}),
});
