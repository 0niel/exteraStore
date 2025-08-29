import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
	pluginActivities,
	plugins,
	pluginVersions,
	pluginReviews,
	users,
} from "~/server/db/schema";

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
				input.types && input.types.length
					? inArray(pluginActivities.type, input.types)
					: undefined,
				input.pluginId ? eq(pluginActivities.pluginId, input.pluginId) : undefined,
				input.actorId ? eq(pluginActivities.actorId, input.actorId) : undefined,
			].filter(Boolean) as any[];

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

			return {
				items,
				pagination: {
					page: input.page,
					limit: input.limit,
					total,
					totalPages: Math.ceil(total / input.limit),
				},
			};
		}),
});


