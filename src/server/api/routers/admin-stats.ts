import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	pluginPipelineChecks,
	pluginPipelineQueue,
	pluginReviews,
	plugins,
	users,
} from "~/server/db/schema";

const ADMINS = (env.INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

function assertAdmin(ctx: {
	session: { user: { role?: string | null; telegramUsername?: string | null } };
}) {
	const isAdmin =
		ctx.session.user.role === "admin" ||
		ADMINS.includes((ctx.session.user.telegramUsername ?? "").toLowerCase());
	if (!isAdmin) throw new Error("Unauthorized");
}

export const adminStatsRouter = createTRPCRouter({
	overview: protectedProcedure.query(async ({ ctx }) => {
		assertAdmin(ctx);

		const [
			totalPluginsRes,
			pendingPluginsRes,
			usersRes,
			downloadsRes,
			reviewsRes,
		] = await Promise.all([
			ctx.db.select({ total: count() }).from(plugins),
			ctx.db
				.select({ total: count() })
				.from(plugins)
				.where(eq(plugins.status, "pending")),
			ctx.db.select({ total: count() }).from(users),
			ctx.db
				.select({
					total: sql<number>`coalesce(sum(${plugins.downloadCount}), 0)`,
				})
				.from(plugins),
			ctx.db.select({ total: count() }).from(pluginReviews),
		]);

		return {
			totalPlugins: Number(totalPluginsRes[0]?.total ?? 0),
			pendingPlugins: Number(pendingPluginsRes[0]?.total ?? 0),
			totalUsers: Number(usersRes[0]?.total ?? 0),
			totalDownloads: Number(downloadsRes[0]?.total ?? 0),
			totalReviews: Number(reviewsRes[0]?.total ?? 0),
		};
	}),

	moderationQueue: protectedProcedure.query(async ({ ctx }) => {
		assertAdmin(ctx);

		const pending = await ctx.db
			.select({
				id: plugins.id,
				name: plugins.name,
				slug: plugins.slug,
				author: plugins.author,
				createdAt: plugins.createdAt,
			})
			.from(plugins)
			.where(eq(plugins.status, "pending"))
			.orderBy(desc(plugins.createdAt))
			.limit(5);

		const checks = pending.length
			? await ctx.db
					.selectDistinctOn([pluginPipelineChecks.pluginId], {
						pluginId: pluginPipelineChecks.pluginId,
						classification: pluginPipelineChecks.classification,
						status: pluginPipelineChecks.status,
						score: pluginPipelineChecks.score,
					})
					.from(pluginPipelineChecks)
					.where(
						and(
							inArray(
								pluginPipelineChecks.pluginId,
								pending.map((plugin) => plugin.id),
							),
							eq(pluginPipelineChecks.checkType, "security"),
						),
					)
					.orderBy(
						pluginPipelineChecks.pluginId,
						desc(pluginPipelineChecks.createdAt),
					)
			: [];
		const checksByPlugin = new Map(
			checks.map((check) => [check.pluginId, check]),
		);
		return pending.map((plugin) => ({
			...plugin,
			securityCheck: checksByPlugin.get(plugin.id) ?? null,
		}));
	}),

	pipelineFailures: protectedProcedure.query(async ({ ctx }) => {
		assertAdmin(ctx);

		const failures = await ctx.db
			.select({
				id: pluginPipelineQueue.id,
				pluginId: pluginPipelineQueue.pluginId,
				pluginName: plugins.name,
				pluginSlug: plugins.slug,
				errorMessage: pluginPipelineQueue.errorMessage,
				retryCount: pluginPipelineQueue.retryCount,
				maxRetries: pluginPipelineQueue.maxRetries,
				completedAt: pluginPipelineQueue.completedAt,
			})
			.from(pluginPipelineQueue)
			.leftJoin(plugins, eq(pluginPipelineQueue.pluginId, plugins.id))
			.where(eq(pluginPipelineQueue.status, "failed"))
			.orderBy(desc(pluginPipelineQueue.completedAt))
			.limit(5);

		return failures;
	}),
});
