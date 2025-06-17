import { and, count, desc, eq, not, sql } from "drizzle-orm";
import { asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "~/env";
import { TelegramNotifications } from "~/lib/telegram-notifications";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { pluginCategories, plugins, users } from "~/server/db/schema";

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
	getCategories: protectedProcedure.query(async ({ ctx }) => {
		if (ctx.session.user.role !== "admin") {
			throw new Error("Unauthorized");
		}

		return await ctx.db
			.select()
			.from(pluginCategories)
			.orderBy(asc(pluginCategories.name));
	}),
	createCategory: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(50),
				slug: z.string().min(1).max(50),
				description: z.string().optional(),
				icon: z.string().optional(),
				color: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new Error("Unauthorized");
			}

			const existingCategory = await ctx.db
				.select({ id: pluginCategories.id })
				.from(pluginCategories)
				.where(eq(pluginCategories.slug, input.slug))
				.limit(1);

			if (existingCategory.length > 0) {
				throw new Error("Категория с таким slug уже существует");
			}

			const [category] = await ctx.db
				.insert(pluginCategories)
				.values({
					name: input.name,
					slug: input.slug,
					description: input.description,
					icon: input.icon,
					color: input.color,
				})
				.returning();

			return category;
		}),
	updateCategory: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				name: z.string().min(1).max(50),
				slug: z.string().min(1).max(50),
				description: z.string().optional(),
				icon: z.string().optional(),
				color: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new Error("Unauthorized");
			}

			const existingCategory = await ctx.db
				.select({ id: pluginCategories.id })
				.from(pluginCategories)
				.where(
					and(
						eq(pluginCategories.slug, input.slug),
						not(eq(pluginCategories.id, input.id)),
					),
				)
				.limit(1);

			if (existingCategory.length > 0) {
				throw new Error("Категория с таким slug уже существует");
			}

			const [category] = await ctx.db
				.update(pluginCategories)
				.set({
					name: input.name,
					slug: input.slug,
					description: input.description,
					icon: input.icon,
					color: input.color,
				})
				.where(eq(pluginCategories.id, input.id))
				.returning();

			return category;
		}),
	deleteCategory: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "admin") {
				throw new Error("Unauthorized");
			}

			const pluginsWithCategory = await ctx.db
				.select({ id: plugins.id })
				.from(plugins)
				.innerJoin(
					pluginCategories,
					eq(plugins.category, pluginCategories.slug),
				)
				.where(eq(pluginCategories.id, input.id))
				.limit(1);

			if (pluginsWithCategory.length > 0) {
				throw new Error(
					"Нельзя удалить категорию, которая используется в плагинах",
				);
			}

			await ctx.db
				.delete(pluginCategories)
				.where(eq(pluginCategories.id, input.id));

			return { success: true };
		}),
});
