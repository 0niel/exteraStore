import { and, count, desc, eq, inArray, type SQL, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
	pluginActivities,
	pluginReviews,
	plugins,
	pluginVersions,
	users,
} from "~/server/db/schema";
import {
	getContentLocale,
	localizePluginRows,
} from "~/server/lib/content-localization";

export const pulseRouter = createTRPCRouter({
	get: publicProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(50).default(20),
				types: z.array(z.string()).optional(),
				pluginId: z.number().optional(),
				actorId: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const offset = (input.page - 1) * input.limit;

			const whereClauses = [
				input.types?.length
					? inArray(pluginActivities.type, input.types)
					: undefined,
				input.pluginId
					? eq(pluginActivities.pluginId, input.pluginId)
					: undefined,
				input.actorId ? eq(pluginActivities.actorId, input.actorId) : undefined,
			].filter((clause): clause is SQL => clause !== undefined);

			const whereExpr = whereClauses.length ? and(...whereClauses) : undefined;

			const listQuery = ctx.db
				.select({
					id: pluginActivities.id,
					type: pluginActivities.type,
					createdAt: pluginActivities.createdAt,
					message: pluginActivities.message,
					data: pluginActivities.data,
					rating: pluginActivities.rating,
					actor: {
						id: users.id,
						name: users.name,
						image: users.image,
					},
					plugin: {
						id: plugins.id,
						name: plugins.name,
						slug: plugins.slug,
					},
					version: {
						id: pluginVersions.id,
						version: pluginVersions.version,
					},
					review: {
						id: pluginReviews.id,
						title: pluginReviews.title,
						comment: pluginReviews.comment,
						rating: pluginReviews.rating,
					},
				})
				.from(pluginActivities)
				.leftJoin(users, eq(pluginActivities.actorId, users.id))
				.leftJoin(plugins, eq(pluginActivities.pluginId, plugins.id))
				.leftJoin(
					pluginVersions,
					eq(pluginActivities.versionId, pluginVersions.id),
				)
				.leftJoin(
					pluginReviews,
					eq(pluginActivities.reviewId, pluginReviews.id),
				)
				.where(whereExpr ?? sql`1=1`)
				.orderBy(desc(pluginActivities.createdAt))
				.limit(input.limit)
				.offset(offset);

			const totalQuery = ctx.db
				.select({ total: count() })
				.from(pluginActivities)
				.where(whereExpr ?? sql`1=1`);

			const [items, totalRes] = await Promise.all([listQuery, totalQuery]);
			const total = totalRes[0]?.total ?? 0;
			const pluginIds = [
				...new Set(
					items
						.map((item) => item.plugin?.id)
						.filter((id): id is number => id !== null),
				),
			];
			const pluginRows = pluginIds.length
				? await ctx.db
						.select()
						.from(plugins)
						.where(inArray(plugins.id, pluginIds))
				: [];
			const localizedPlugins = await localizePluginRows(
				ctx.db,
				pluginRows,
				getContentLocale(ctx.headers),
			);
			const localizedNameById = new Map(
				localizedPlugins.map((plugin) => [plugin.id, plugin.name]),
			);

			return {
				items: items.map((item) => ({
					...item,
					plugin: item.plugin
						? {
								...item.plugin,
								name: localizedNameById.get(item.plugin.id) ?? item.plugin.name,
							}
						: null,
				})),
				pagination: {
					page: input.page,
					limit: input.limit,
					total,
					totalPages: Math.ceil(total / input.limit),
				},
			};
		}),

	stats: publicProcedure.query(async ({ ctx }) => {
		const now = Math.floor(Date.now() / 1000);
		const dayStart = now - (now % 86_400);
		const weekAgo = dayStart - 6 * 86_400;

		const [byDay, byType, activeDevs] = await Promise.all([
			ctx.db
				.select({
					day: sql<number>`floor(${pluginActivities.createdAt} / 86400) * 86400`,
					total: count(),
				})
				.from(pluginActivities)
				.where(sql`${pluginActivities.createdAt} >= ${weekAgo}`)
				.groupBy(sql`floor(${pluginActivities.createdAt} / 86400) * 86400`),
			ctx.db
				.select({ type: pluginActivities.type, total: count() })
				.from(pluginActivities)
				.where(sql`${pluginActivities.createdAt} >= ${weekAgo}`)
				.groupBy(pluginActivities.type),
			ctx.db
				.select({
					total: sql<number>`count(distinct ${pluginActivities.actorId})`,
				})
				.from(pluginActivities)
				.where(sql`${pluginActivities.createdAt} >= ${weekAgo}`),
		]);

		const days: Array<{ day: number; total: number }> = [];
		for (let i = 6; i >= 0; i--) {
			const day = dayStart - i * 86_400;
			const found = byDay.find((d) => Number(d.day) === day);
			days.push({ day, total: found ? Number(found.total) : 0 });
		}

		const typeCount = (type: string) =>
			Number(byType.find((t) => t.type === type)?.total ?? 0);

		return {
			days,
			today: days[days.length - 1]?.total ?? 0,
			week: days.reduce((acc, d) => acc + d.total, 0),
			plugins: typeCount("plugin.created"),
			releases: typeCount("version.released"),
			reviews: typeCount("review.added"),
			activeDevelopers: Number(activeDevs[0]?.total ?? 0),
		};
	}),
});
