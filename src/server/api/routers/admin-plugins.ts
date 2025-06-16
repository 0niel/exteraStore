import { and, count, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "~/env";
import { TelegramNotifications } from "~/lib/telegram-notifications";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { plugins, users } from "~/server/db/schema";

const ADMINS = (env.INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

export const adminPluginsRouter = createTRPCRouter({
	getPlugins: protectedProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(100).default(20),
				status: z.enum(["pending", "approved", "rejected"]).optional(),
				search: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);
			if (!isAdmin) throw new Error("Unauthorized");
			const offset = (input.page - 1) * input.limit;
			const whereClauses = [] as any[];
			if (input.status) whereClauses.push(eq(plugins.status, input.status));
			if (input.search)
				whereClauses.push(sql`${plugins.name} LIKE ${`%${input.search}%`}`);
			const whereExpr = whereClauses.length ? and(...whereClauses) : undefined;
			const listQuery = ctx.db
				.select()
				.from(plugins)
				.where(whereExpr ?? sql`1=1`)
				.orderBy(desc(plugins.createdAt))
				.limit(input.limit)
				.offset(offset);
			const totalQuery = ctx.db
				.select({ count: count() })
				.from(plugins)
				.where(whereExpr ?? sql`1=1`);
			const [pluginsList, totalRes] = await Promise.all([
				listQuery,
				totalQuery,
			]);
			const total = totalRes[0]?.count ?? 0;
			return {
				plugins: pluginsList,
				pagination: {
					page: input.page,
					limit: input.limit,
					total,
					totalPages: Math.ceil(total / input.limit),
				},
			};
		}),
	approve: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);
			if (!isAdmin) throw new Error("Unauthorized");

			const pluginWithAuthor = await ctx.db
				.select({
					plugin: plugins,
					author: users,
				})
				.from(plugins)
				.leftJoin(users, eq(plugins.authorId, users.id))
				.where(eq(plugins.id, input.id))
				.limit(1);

			if (!pluginWithAuthor[0]) {
				throw new Error("Plugin not found");
			}

			const [updatedPlugin] = await ctx.db
				.update(plugins)
				.set({ status: "approved", updatedAt: sql`extract(epoch from now())` })
				.where(eq(plugins.id, input.id))
				.returning();

			if (pluginWithAuthor[0].author?.telegramId) {
				try {
					await TelegramNotifications.notifyPluginApproved(
						pluginWithAuthor[0].author.telegramId,
						updatedPlugin.name,
						updatedPlugin.slug,
						updatedPlugin.author,
					);
				} catch (error) {
					console.error("Failed to send approval notification:", error);
				}
			}

			revalidatePath(`/plugins/${updatedPlugin.slug}`);
			return updatedPlugin;
		}),
	reject: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				reason: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);
			if (!isAdmin) throw new Error("Unauthorized");

			const pluginWithAuthor = await ctx.db
				.select({
					plugin: plugins,
					author: users,
				})
				.from(plugins)
				.leftJoin(users, eq(plugins.authorId, users.id))
				.where(eq(plugins.id, input.id))
				.limit(1);

			if (!pluginWithAuthor[0]) {
				throw new Error("Plugin not found");
			}

			const [updatedPlugin] = await ctx.db
				.update(plugins)
				.set({ status: "rejected", updatedAt: sql`extract(epoch from now())` })
				.where(eq(plugins.id, input.id))
				.returning();

			if (pluginWithAuthor[0].author?.telegramId) {
				try {
					await TelegramNotifications.notifyPluginRejected(
						pluginWithAuthor[0].author.telegramId,
						updatedPlugin.name,
						updatedPlugin.author,
						input.reason,
					);
				} catch (error) {
					console.error("Failed to send rejection notification:", error);
				}
			}

			revalidatePath(`/plugins/${updatedPlugin.slug}`);
			return updatedPlugin;
		}),
	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const isAdmin =
				ctx.session.user.role === "admin" ||
				ADMINS.includes(
					(ctx.session.user.telegramUsername ?? "").toLowerCase(),
				);
			if (!isAdmin) throw new Error("Unauthorized");
			const pluginRow = await ctx.db
				.select({ slug: plugins.slug })
				.from(plugins)
				.where(eq(plugins.id, input.id))
				.limit(1);
			await ctx.db.delete(plugins).where(eq(plugins.id, input.id));
			if (pluginRow[0]) revalidatePath(`/plugins/${pluginRow[0].slug}`);
			return { success: true };
		}),
});
