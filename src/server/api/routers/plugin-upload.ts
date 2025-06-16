import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { generateSlug, generateUniqueSlug } from "~/lib/utils";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { pluginFiles, pluginGitRepos, pluginVersions, plugins } from "~/server/db/schema";

const createPluginSchema = z.object({
	name: z.string().min(1).max(256),
	description: z.string().min(1),
	shortDescription: z.string().max(500).optional(),
	category: z.string().min(1).max(100),
	tags: z.array(z.string()).optional(),
	screenshots: z.string().optional(),
	version: z.string().min(1).max(50),
	fileContent: z.string().min(1),
	changelog: z.string().optional(),
	githubUrl: z.string().url().optional(),
	documentationUrl: z.string().url().optional(),
});

const updatePluginFromGitSchema = z.object({
	pluginId: z.number(),
	repoUrl: z.string().url(),
	branch: z.string().default("main"),
	filePath: z.string(),
	accessToken: z.string().optional(),
	autoSync: z.boolean().default(false),
});

const createVersionSchema = z.object({
	pluginId: z.number(),
	version: z.string().min(1).max(50),
	fileContent: z.string().min(1),
	changelog: z.string().optional(),
	gitCommitHash: z.string().optional(),
	gitBranch: z.string().optional(),
	gitTag: z.string().optional(),
	isStable: z.boolean().default(true),
});

export const pluginUploadRouter = createTRPCRouter({
	create: protectedProcedure
		.input(createPluginSchema)
		.mutation(async ({ ctx, input }) => {
			const baseSlug = generateSlug(input.name);
			const fileHash = crypto.createHash("sha256").update(input.fileContent).digest("hex");
			const fileSize = Buffer.byteLength(input.fileContent, "utf8");

			const [plugin] = await ctx.db.insert(plugins).values({
				name: input.name,
				slug: baseSlug, 
				description: input.description,
				shortDescription: input.shortDescription,
				version: input.version,
				author: ctx.session.user.name || "Unknown",
				authorId: ctx.session.user.id,
				category: input.category,
				tags: input.tags ? JSON.stringify(input.tags) : null,
				screenshots: input.screenshots,
				changelog: input.changelog,
				githubUrl: input.githubUrl,
				documentationUrl: input.documentationUrl,
				status: "pending",
			}).returning();

			if (!plugin) {
				throw new Error("Failed to create plugin");
			}

			
			const finalSlug = `${baseSlug}.${plugin.id}`;
			await ctx.db.update(plugins)
				.set({ slug: finalSlug })
				.where(eq(plugins.id, plugin.id));

			const [version] = await ctx.db.insert(pluginVersions).values({
				pluginId: plugin.id,
				version: input.version,
				changelog: input.changelog,
				fileContent: input.fileContent,
				fileSize,
				fileHash,
				createdById: ctx.session.user.id,
			}).returning();

			await ctx.db.insert(pluginFiles).values({
				pluginId: plugin.id,
				versionId: version?.id,
				filename: `${finalSlug}.py`,
				content: input.fileContent,
				size: fileSize,
				hash: fileHash,
			});

			
			return { ...plugin, slug: finalSlug };
		}),

	createVersion: protectedProcedure
		.input(createVersionSchema)
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db.query.plugins.findFirst({
				where: eq(plugins.id, input.pluginId),
			});

			if (!plugin || plugin.authorId !== ctx.session.user.id) {
				throw new Error("Plugin not found or unauthorized");
			}

			const fileHash = crypto.createHash("sha256").update(input.fileContent).digest("hex");
			const fileSize = Buffer.byteLength(input.fileContent, "utf8");

			const [version] = await ctx.db.insert(pluginVersions).values({
				pluginId: input.pluginId,
				version: input.version,
				changelog: input.changelog,
				fileContent: input.fileContent,
				fileSize,
				fileHash,
				gitCommitHash: input.gitCommitHash,
				gitBranch: input.gitBranch,
				gitTag: input.gitTag,
				isStable: input.isStable,
				createdById: ctx.session.user.id,
			}).returning();

			if (version) {
				await ctx.db.insert(pluginFiles).values({
					pluginId: input.pluginId,
					versionId: version.id,
					filename: `${plugin.slug}.py`,
					content: input.fileContent,
					size: fileSize,
					hash: fileHash,
				});

				await ctx.db.update(plugins)
					.set({ 
						version: input.version,
						updatedAt: new Date(),
					})
					.where(eq(plugins.id, input.pluginId));
			}

			return version;
		}),

	setupGitSync: protectedProcedure
		.input(updatePluginFromGitSchema)
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db.query.plugins.findFirst({
				where: eq(plugins.id, input.pluginId),
			});

			if (!plugin || plugin.authorId !== ctx.session.user.id) {
				throw new Error("Plugin not found or unauthorized");
			}

			const [gitRepo] = await ctx.db.insert(pluginGitRepos).values({
				pluginId: input.pluginId,
				repoUrl: input.repoUrl,
				branch: input.branch,
				filePath: input.filePath,
				accessToken: input.accessToken,
				autoSync: input.autoSync,
			}).returning();

			return gitRepo;
		}),

	syncFromGit: protectedProcedure
		.input(z.object({ pluginId: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db.query.plugins.findFirst({
				where: eq(plugins.id, input.pluginId),
				with: {
					gitRepo: true,
				},
			});

			if (!plugin || plugin.authorId !== ctx.session.user.id || !plugin.gitRepo) {
				throw new Error("Plugin not found, unauthorized, or no Git repo configured");
			}

			try {
				const response = await fetch(
					`https://api.github.com/repos/${plugin.gitRepo.repoUrl.replace(/^https?:\/\/github\.com\//i, '')}/contents/${plugin.gitRepo.filePath}?ref=${plugin.gitRepo.branch}`,
					{
						headers: plugin.gitRepo.accessToken ? {
							Authorization: `token ${plugin.gitRepo.accessToken}`
						} : {}
					}
				);

				if (!response.ok) {
					throw new Error(`GitHub API error: ${response.statusText}`);
				}

				const data = await response.json() as any;
				const fileContent = Buffer.from(data.content, 'base64').toString('utf8');
				const commitHash = data.sha;

				if (commitHash === plugin.gitRepo.lastCommitHash) {
					return { message: "No changes detected in Git repository" };
				}

				const latestVersion = await ctx.db.query.pluginVersions.findFirst({
					where: eq(pluginVersions.pluginId, input.pluginId),
					orderBy: desc(pluginVersions.createdAt),
				});

				const newVersion = latestVersion ? 
					incrementVersion(latestVersion.version) : 
					"1.0.1";

				const fileHash = crypto.createHash("sha256").update(fileContent).digest("hex");
				const fileSize = Buffer.byteLength(fileContent, "utf8");

				const [version] = await ctx.db.insert(pluginVersions).values({
					pluginId: input.pluginId,
					version: newVersion,
					fileContent,
					changelog: `Auto-sync from Git commit ${commitHash.substring(0, 7)}`,
					gitCommitHash: commitHash,
					gitBranch: plugin.gitRepo.branch,
					isStable: true,
					fileSize,
					fileHash,
					createdById: ctx.session.user.id,
				}).returning();

				if (version) {
					await ctx.db.insert(pluginFiles).values({
						pluginId: input.pluginId,
						versionId: version.id,
						filename: `${plugin.slug}.py`,
						content: fileContent,
						size: fileSize,
						hash: fileHash,
					});

					await ctx.db.update(plugins)
						.set({
							version: newVersion,
							updatedAt: new Date(),
						})
						.where(eq(plugins.id, input.pluginId));
				}

				await ctx.db.update(pluginGitRepos)
					.set({
						lastCommitHash: commitHash,
						lastSyncAt: new Date(),
					})
					.where(eq(pluginGitRepos.id, plugin.gitRepo.id));

				return { version, message: "Successfully synced from Git" };
			} catch (error) {
				throw new Error(`Failed to sync from Git: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}),

	getVersions: protectedProcedure
		.input(z.object({ pluginId: z.number() }))
		.query(async ({ ctx, input }) => {
			return ctx.db.query.pluginVersions.findMany({
				where: eq(pluginVersions.pluginId, input.pluginId),
				orderBy: desc(pluginVersions.createdAt),
				with: {
					createdBy: {
						columns: {
							name: true,
							image: true,
						},
					},
				},
			});
		}),

	getVersionDiff: protectedProcedure
		.input(z.object({ 
			pluginId: z.number(),
			fromVersion: z.string(),
			toVersion: z.string(),
		}))
		.query(async ({ ctx, input }) => {
			const versions = await ctx.db.query.pluginVersions.findMany({
				where: eq(pluginVersions.pluginId, input.pluginId),
				columns: {
					version: true,
					fileContent: true,
				},
			});

			const fromVersionData = versions.find((v: { version: string }) => v.version === input.fromVersion);
			const toVersionData = versions.find((v: { version: string }) => v.version === input.toVersion);

			if (!fromVersionData || !toVersionData) {
				throw new Error("Version not found");
			}

			return {
				fromContent: fromVersionData.fileContent,
				toContent: toVersionData.fileContent,
				fromVersion: input.fromVersion,
				toVersion: input.toVersion,
			};
		}),
});

function incrementVersion(version: string): string {
	const parts = version.split('.').map(Number);
	if (parts.length !== 3 || parts.some(Number.isNaN)) return "1.0.1";
	
	parts[2] = (parts[2] ?? 0) + 1;
	return parts.join('.');
}