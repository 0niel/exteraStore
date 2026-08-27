import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeJsonParse } from "~/lib/utils";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	categoryTranslations,
	pluginCategories,
	plugins,
	pluginTranslations,
} from "~/server/db/schema";
import {
	categorySourceHash,
	categoryTranslationInput,
	contentLocaleSchema,
	generateCategoryTranslation,
	generatePluginTranslation,
	pluginSourceHash,
	pluginTranslationInput,
} from "~/server/lib/content-localization";
import {
	enqueueMissingTranslations,
	processContentTranslationQueue,
} from "~/server/lib/content-translation-queue";

const nullableText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.nullable()
		.transform((value) => value || null);

const pluginTranslationSchema = z.object({
	pluginId: z.number().int().positive(),
	locale: contentLocaleSchema,
	name: z.string().trim().min(1).max(256),
	shortDescription: nullableText(500),
	description: z.string().trim().min(1).max(50_000),
	requirements: nullableText(20_000),
	changelog: nullableText(20_000),
	tags: z.array(z.string().trim().min(1).max(50)).max(30),
});

const categoryTranslationSchema = z.object({
	categoryId: z.number().int().positive(),
	locale: contentLocaleSchema,
	name: z.string().trim().min(1).max(80),
	description: nullableText(2_000),
});

function assertAdmin(role?: string | null) {
	if (role !== "admin") {
		throw new TRPCError({ code: "FORBIDDEN" });
	}
}

export const translationsRouter = createTRPCRouter({
	getPlugin: protectedProcedure
		.input(z.object({ pluginId: z.number().int().positive() }))
		.query(async ({ ctx, input }) => {
			const plugin = await ctx.db.query.plugins.findFirst({
				where: eq(plugins.id, input.pluginId),
			});
			if (
				!plugin ||
				(plugin.authorId !== ctx.session.user.id &&
					ctx.session.user.role !== "admin")
			) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			const translations = await ctx.db
				.select()
				.from(pluginTranslations)
				.where(eq(pluginTranslations.pluginId, plugin.id));
			const source = pluginTranslationInput(plugin);
			const sourceHash = pluginSourceHash(source);

			return {
				sourceLocale:
					plugin.contentLocale === "en" || plugin.contentLocale === "ru"
						? plugin.contentLocale
						: null,
				source,
				translations: translations.map((translation) => ({
					...translation,
					tags: safeJsonParse<string[]>(translation.tags ?? "[]", []),
					stale: translation.sourceHash !== sourceHash,
				})),
			};
		}),

	savePlugin: protectedProcedure
		.input(pluginTranslationSchema)
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db.query.plugins.findFirst({
				where: eq(plugins.id, input.pluginId),
			});
			if (
				!plugin ||
				(plugin.authorId !== ctx.session.user.id &&
					ctx.session.user.role !== "admin")
			) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			const now = Math.floor(Date.now() / 1_000);
			if (
				plugin.contentLocale === input.locale ||
				plugin.contentLocale === "und"
			) {
				await ctx.db
					.update(plugins)
					.set({
						contentLocale: input.locale,
						name: input.name,
						shortDescription: input.shortDescription,
						description: input.description,
						requirements: input.requirements,
						changelog: input.changelog,
						tags: JSON.stringify(input.tags),
						updatedAt: now,
					})
					.where(eq(plugins.id, plugin.id));
			} else {
				const sourceHash = pluginSourceHash(pluginTranslationInput(plugin));
				await ctx.db
					.insert(pluginTranslations)
					.values({
						pluginId: plugin.id,
						locale: input.locale,
						name: input.name,
						shortDescription: input.shortDescription,
						description: input.description,
						requirements: input.requirements,
						changelog: input.changelog,
						tags: JSON.stringify(input.tags),
						origin: "manual",
						sourceHash,
						updatedAt: now,
					})
					.onConflictDoUpdate({
						target: [pluginTranslations.pluginId, pluginTranslations.locale],
						set: {
							name: input.name,
							shortDescription: input.shortDescription,
							description: input.description,
							requirements: input.requirements,
							changelog: input.changelog,
							tags: JSON.stringify(input.tags),
							origin: "manual",
							sourceHash,
							updatedAt: now,
						},
					});
			}

			revalidatePath(`/plugins/${plugin.slug}`);
			return { success: true };
		}),

	generatePlugin: protectedProcedure
		.input(
			z.object({
				pluginId: z.number().int().positive(),
				targetLocale: contentLocaleSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const plugin = await ctx.db.query.plugins.findFirst({
				where: eq(plugins.id, input.pluginId),
			});
			if (
				!plugin ||
				(plugin.authorId !== ctx.session.user.id &&
					ctx.session.user.role !== "admin")
			) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}
			if (plugin.contentLocale === input.targetLocale) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Target locale matches the source locale",
				});
			}

			try {
				const result = await generatePluginTranslation(
					ctx.db,
					plugin,
					input.targetLocale,
					`user:${ctx.session.user.id}`,
				);
				revalidatePath(`/plugins/${plugin.slug}`);
				return result;
			} catch (error) {
				if (
					error instanceof Error &&
					error.message === "AI_TRANSLATION_RATE_LIMITED"
				) {
					throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
				}
				throw error;
			}
		}),

	getCategory: protectedProcedure
		.input(z.object({ categoryId: z.number().int().positive() }))
		.query(async ({ ctx, input }) => {
			assertAdmin(ctx.session.user.role);
			const category = await ctx.db.query.pluginCategories.findFirst({
				where: eq(pluginCategories.id, input.categoryId),
			});
			if (!category) throw new TRPCError({ code: "NOT_FOUND" });
			const translations = await ctx.db
				.select()
				.from(categoryTranslations)
				.where(eq(categoryTranslations.categoryId, category.id));
			const source = categoryTranslationInput(category);
			const sourceHash = categorySourceHash(source);
			return {
				sourceLocale:
					category.contentLocale === "en" || category.contentLocale === "ru"
						? category.contentLocale
						: null,
				source,
				translations: translations.map((translation) => ({
					...translation,
					stale: translation.sourceHash !== sourceHash,
				})),
			};
		}),

	saveCategory: protectedProcedure
		.input(categoryTranslationSchema)
		.mutation(async ({ ctx, input }) => {
			assertAdmin(ctx.session.user.role);
			const category = await ctx.db.query.pluginCategories.findFirst({
				where: eq(pluginCategories.id, input.categoryId),
			});
			if (!category) throw new TRPCError({ code: "NOT_FOUND" });
			const now = Math.floor(Date.now() / 1_000);

			if (
				category.contentLocale === input.locale ||
				category.contentLocale === "und"
			) {
				await ctx.db
					.update(pluginCategories)
					.set({
						contentLocale: input.locale,
						name: input.name,
						description: input.description,
					})
					.where(eq(pluginCategories.id, category.id));
			} else {
				const sourceHash = categorySourceHash(
					categoryTranslationInput(category),
				);
				await ctx.db
					.insert(categoryTranslations)
					.values({
						categoryId: category.id,
						locale: input.locale,
						name: input.name,
						description: input.description,
						origin: "manual",
						sourceHash,
						updatedAt: now,
					})
					.onConflictDoUpdate({
						target: [
							categoryTranslations.categoryId,
							categoryTranslations.locale,
						],
						set: {
							name: input.name,
							description: input.description,
							origin: "manual",
							sourceHash,
							updatedAt: now,
						},
					});
			}
			revalidatePath("/categories");
			return { success: true };
		}),

	generateCategory: protectedProcedure
		.input(
			z.object({
				categoryId: z.number().int().positive(),
				targetLocale: contentLocaleSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertAdmin(ctx.session.user.role);
			const category = await ctx.db.query.pluginCategories.findFirst({
				where: eq(pluginCategories.id, input.categoryId),
			});
			if (!category) throw new TRPCError({ code: "NOT_FOUND" });
			if (category.contentLocale === input.targetLocale) {
				throw new TRPCError({ code: "BAD_REQUEST" });
			}
			return generateCategoryTranslation(
				ctx.db,
				category,
				input.targetLocale,
				`user:${ctx.session.user.id}`,
			);
		}),

	enqueueMissing: protectedProcedure
		.input(
			z.object({
				entity: z.enum(["plugins", "categories"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertAdmin(ctx.session.user.role);
			const enqueued = await enqueueMissingTranslations(
				ctx.db,
				input.entity,
				ctx.session.user.id,
			);
			const processed = await processContentTranslationQueue(
				ctx.db,
				2,
				input.entity === "plugins" ? ["plugin"] : ["category"],
			);
			return { ...enqueued, processed };
		}),
});
