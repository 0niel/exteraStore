import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { pluginFiles, pluginVersions, plugins } from "~/server/db/schema";

export const pluginVersionsRouter = createTRPCRouter({
	getVersions: publicProcedure
		.input(z.object({ pluginSlug: z.string() }))
		.query(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ id: plugins.id })
				.from(plugins)
				.where(eq(plugins.slug, input.pluginSlug))
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}

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
						name: pluginVersions.createdById,
					},
				})
				.from(pluginVersions)
				.where(eq(pluginVersions.pluginId, plugin[0].id))
				.orderBy(desc(pluginVersions.createdAt));

			return versions;
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
				.select({ id: plugins.id })
				.from(plugins)
				.where(eq(plugins.slug, input.pluginSlug))
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

			return version[0];
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
				.where(eq(plugins.slug, input.pluginSlug))
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

			await ctx.db
				.update(pluginVersions)
				.set({
					downloadCount: version[0].downloadCount + 1,
				})
				.where(eq(pluginVersions.id, version[0].id));

			const fileName = `${input.pluginSlug}-v${input.version}.plugin`;
			const fileContent = version[0].fileContent;

			if (plugin[0].telegramBotDeeplink) {
				const deeplink = `${plugin[0].telegramBotDeeplink}?version=${encodeURIComponent(input.version)}`;
				return {
					success: true,
					telegramBotDeeplink: deeplink,
					fileName,
					fileSize: version[0].fileSize,
				};
			}

			return {
				success: true,
				fileName,
				fileContent,
				fileSize: version[0].fileSize,
				mimeType: "application/x-python",
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
				.where(eq(plugins.slug, input.pluginSlug))
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
				(v: typeof pluginVersions.$inferSelect) => v.version === input.fromVersion,
			);
			const toVersionData = versions.find((v: typeof pluginVersions.$inferSelect) => v.version === input.toVersion);

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
				.where(eq(plugins.slug, input.pluginSlug))
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
				(v: typeof pluginVersions.$inferSelect) => v.version === input.fromVersion,
			);
			const toVersionData = versions.find((v: typeof pluginVersions.$inferSelect) => v.version === input.toVersion);

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
				.where(eq(plugins.slug, input.pluginSlug))
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

			const fromVersionData = versions.find((v: typeof pluginVersions.$inferSelect) =>
				v.fileHash.startsWith(input.fromHash),
			);
			const toVersionData = versions.find((v: typeof pluginVersions.$inferSelect) =>
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

	createVersion: protectedProcedure
		.input(
			z.object({
				pluginSlug: z.string(),
				version: z.string().min(1).max(50),
				fileContent: z.string().min(1),
				changelog: z.string().optional(),
				isStable: z.boolean().default(true),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({
					id: plugins.id,
					authorId: plugins.authorId,
					slug: plugins.slug,
				})
				.from(plugins)
				.where(eq(plugins.slug, input.pluginSlug))
				.limit(1);

			if (!plugin[0] || plugin[0].authorId !== ctx.session.user.id) {
				throw new Error("Plugin not found or unauthorized");
			}

			const existingVersion = await ctx.db
				.select()
				.from(pluginVersions)
				.where(
					and(
						eq(pluginVersions.pluginId, plugin[0].id),
						eq(pluginVersions.version, input.version),
					),
				)
				.limit(1);

			if (existingVersion[0]) {
				throw new Error("Version already exists");
			}

			const fileHash = crypto
				.createHash("sha256")
				.update(input.fileContent)
				.digest("hex");
			const fileSize = Buffer.byteLength(input.fileContent, "utf8");

			const [version] = await ctx.db
				.insert(pluginVersions)
				.values({
					pluginId: plugin[0].id,
					version: input.version,
					changelog: input.changelog,
					fileContent: input.fileContent,
					fileSize,
					fileHash,
					isStable: input.isStable,
					createdById: ctx.session.user.id,
				})
				.returning();

			if (version) {
				await ctx.db.insert(pluginFiles).values({
					pluginId: plugin[0].id,
					versionId: version.id,
					filename: `${plugin[0].slug}-v${input.version}.py`,
					content: input.fileContent,
					size: fileSize,
					hash: fileHash,
				});

				if (input.isStable) {
					await ctx.db
						.update(plugins)
						.set({
							version: input.version,
							changelog: input.changelog,
							updatedAt: new Date(),
						})
						.where(eq(plugins.id, plugin[0].id));
				}
			}

			return version;
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
