import "server-only";

import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import type { Database } from "~/server/db";
import {
	aiPluginCollections,
	aiPluginCollectionTranslations,
	categoryTranslations,
	contentTranslationQueue,
	pluginCategories,
	pluginPipelineChecks,
	pluginPipelineCheckTranslations,
	plugins,
	pluginTranslations,
	pluginVersions,
	pluginVersionTranslations,
} from "~/server/db/schema";
import {
	type ContentLocale,
	categorySourceHash,
	categoryTranslationInput,
	collectionSourceHash,
	generateCategoryTranslation,
	generateCollectionTranslation,
	generatePipelineCheckTranslation,
	generatePluginTranslation,
	generateVersionTranslation,
	pipelineCheckSourceHash,
	pluginSourceHash,
	pluginTranslationInput,
	versionSourceHash,
} from "~/server/lib/content-localization";

export type TranslationEntityType =
	| "plugin"
	| "category"
	| "version"
	| "pipeline_check"
	| "collection";

export type TranslationJob = {
	entityType: TranslationEntityType;
	entityId: number;
	targetLocale: ContentLocale;
};

const MAX_ATTEMPTS = 5;
const STUCK_SECONDS = 15 * 60;

function nowSeconds() {
	return Math.floor(Date.now() / 1_000);
}

function targetLocale(sourceLocale: string): ContentLocale | null {
	if (sourceLocale === "ru") return "en";
	if (sourceLocale === "en") return "ru";
	return null;
}

function jobKey(job: TranslationJob) {
	return `${job.entityType}:${job.entityId}:${job.targetLocale}`;
}

export async function enqueueTranslationJobs(
	database: Database,
	jobs: TranslationJob[],
	requestedById?: string | null,
) {
	const uniqueJobs = [
		...new Map(jobs.map((job) => [jobKey(job), job])).values(),
	];
	if (uniqueJobs.length === 0) return { queued: 0 };
	const now = nowSeconds();
	const inserted = await database
		.insert(contentTranslationQueue)
		.values(
			uniqueJobs.map((job) => ({
				...job,
				requestedById: requestedById ?? null,
				availableAt: now,
				updatedAt: now,
			})),
		)
		.onConflictDoUpdate({
			target: [
				contentTranslationQueue.entityType,
				contentTranslationQueue.entityId,
				contentTranslationQueue.targetLocale,
			],
			set: {
				status: sql`CASE WHEN ${contentTranslationQueue.status} = 'processing' THEN 'processing' ELSE 'pending' END`,
				attempts: sql`CASE WHEN ${contentTranslationQueue.status} = 'processing' THEN ${contentTranslationQueue.attempts} ELSE 0 END`,
				availableAt: sql`CASE WHEN ${contentTranslationQueue.status} = 'processing' THEN ${contentTranslationQueue.availableAt} ELSE ${now} END`,
				errorMessage: null,
				requestedById: requestedById ?? null,
				updatedAt: now,
			},
		})
		.returning({ id: contentTranslationQueue.id });
	return { queued: inserted.length };
}

async function missingPluginJobs(database: Database) {
	const rows = await database
		.select()
		.from(plugins)
		.where(eq(plugins.status, "approved"));
	const translations = await database
		.select({
			pluginId: pluginTranslations.pluginId,
			locale: pluginTranslations.locale,
			origin: pluginTranslations.origin,
			sourceHash: pluginTranslations.sourceHash,
		})
		.from(pluginTranslations);
	const existing = new Map(
		translations.map((row) => [`${row.pluginId}:${row.locale}`, row]),
	);
	return rows.flatMap((row): TranslationJob[] => {
		const target = targetLocale(row.contentLocale);
		const translation = target ? existing.get(`${row.id}:${target}`) : null;
		const stale =
			translation?.origin === "ai" &&
			translation.sourceHash !== pluginSourceHash(pluginTranslationInput(row));
		return target && (!translation || stale)
			? [{ entityType: "plugin", entityId: row.id, targetLocale: target }]
			: [];
	});
}

async function missingCategoryJobs(database: Database) {
	const [rows, translations] = await Promise.all([
		database.select().from(pluginCategories),
		database
			.select({
				categoryId: categoryTranslations.categoryId,
				locale: categoryTranslations.locale,
				origin: categoryTranslations.origin,
				sourceHash: categoryTranslations.sourceHash,
			})
			.from(categoryTranslations),
	]);
	const existing = new Map(
		translations.map((row) => [`${row.categoryId}:${row.locale}`, row]),
	);
	return rows.flatMap((row): TranslationJob[] => {
		const target = targetLocale(row.contentLocale);
		const translation = target ? existing.get(`${row.id}:${target}`) : null;
		const stale =
			translation?.origin === "ai" &&
			translation.sourceHash !==
				categorySourceHash(categoryTranslationInput(row));
		return target && (!translation || stale)
			? [{ entityType: "category", entityId: row.id, targetLocale: target }]
			: [];
	});
}

async function missingVersionJobs(database: Database) {
	const rows = await database
		.select({
			version: pluginVersions,
			contentLocale: plugins.contentLocale,
		})
		.from(pluginVersions)
		.innerJoin(plugins, eq(pluginVersions.pluginId, plugins.id))
		.where(eq(plugins.status, "approved"));
	const translations = await database
		.select({
			versionId: pluginVersionTranslations.versionId,
			locale: pluginVersionTranslations.locale,
			origin: pluginVersionTranslations.origin,
			sourceHash: pluginVersionTranslations.sourceHash,
		})
		.from(pluginVersionTranslations);
	const existing = new Map(
		translations.map((row) => [`${row.versionId}:${row.locale}`, row]),
	);
	return rows.flatMap((row): TranslationJob[] => {
		const target = targetLocale(row.contentLocale);
		const translation = target
			? existing.get(`${row.version.id}:${target}`)
			: null;
		const stale =
			translation?.origin === "ai" &&
			row.version.changelog &&
			translation.sourceHash !== versionSourceHash(row.version.changelog);
		return row.version.changelog?.trim() && target && (!translation || stale)
			? [
					{
						entityType: "version",
						entityId: row.version.id,
						targetLocale: target,
					},
				]
			: [];
	});
}

async function missingPipelineCheckJobs(database: Database) {
	const rows = await database
		.select({ check: pluginPipelineChecks })
		.from(pluginPipelineChecks)
		.innerJoin(plugins, eq(pluginPipelineChecks.pluginId, plugins.id))
		.where(eq(plugins.status, "approved"));
	const translations = await database
		.select({
			checkId: pluginPipelineCheckTranslations.checkId,
			locale: pluginPipelineCheckTranslations.locale,
			origin: pluginPipelineCheckTranslations.origin,
			sourceHash: pluginPipelineCheckTranslations.sourceHash,
		})
		.from(pluginPipelineCheckTranslations);
	const existing = new Map(
		translations.map((row) => [`${row.checkId}:${row.locale}`, row]),
	);
	return rows.flatMap((row): TranslationJob[] => {
		const target = targetLocale(row.check.contentLocale);
		const translation = target
			? existing.get(`${row.check.id}:${target}`)
			: null;
		const stale =
			translation?.origin === "ai" &&
			translation.sourceHash !== pipelineCheckSourceHash(row.check);
		return (row.check.details || row.check.shortDescription) &&
			target &&
			(!translation || stale)
			? [
					{
						entityType: "pipeline_check",
						entityId: row.check.id,
						targetLocale: target,
					},
				]
			: [];
	});
}

async function missingCollectionJobs(database: Database) {
	const [rows, translations] = await Promise.all([
		database.select().from(aiPluginCollections),
		database
			.select({
				collectionId: aiPluginCollectionTranslations.collectionId,
				locale: aiPluginCollectionTranslations.locale,
				origin: aiPluginCollectionTranslations.origin,
				sourceHash: aiPluginCollectionTranslations.sourceHash,
			})
			.from(aiPluginCollectionTranslations),
	]);
	const existing = new Map(
		translations.map((row) => [`${row.collectionId}:${row.locale}`, row]),
	);
	return rows.flatMap((row): TranslationJob[] => {
		const target = targetLocale(row.contentLocale);
		const translation = target ? existing.get(`${row.id}:${target}`) : null;
		const stale =
			translation?.origin === "ai" &&
			translation.sourceHash !== collectionSourceHash(row);
		return target && (!translation || stale)
			? [{ entityType: "collection", entityId: row.id, targetLocale: target }]
			: [];
	});
}

export async function enqueueMissingTranslations(
	database: Database,
	scope: "plugins" | "categories" | "all",
	requestedById?: string | null,
) {
	const groups = await Promise.all([
		scope !== "categories" ? missingPluginJobs(database) : Promise.resolve([]),
		scope !== "categories" ? missingVersionJobs(database) : Promise.resolve([]),
		scope !== "categories"
			? missingPipelineCheckJobs(database)
			: Promise.resolve([]),
		scope !== "categories"
			? missingCollectionJobs(database)
			: Promise.resolve([]),
		scope !== "plugins" ? missingCategoryJobs(database) : Promise.resolve([]),
	]);
	const jobs = groups.flat();
	const result = await enqueueTranslationJobs(database, jobs, requestedById);
	return {
		...result,
		totalMissing: jobs.length,
		byType: jobs.reduce<Record<string, number>>((counts, job) => {
			counts[job.entityType] = (counts[job.entityType] ?? 0) + 1;
			return counts;
		}, {}),
	};
}

async function runTranslationJob(
	database: Database,
	job: typeof contentTranslationQueue.$inferSelect,
) {
	const subject = "system:content-translation-worker";
	if (job.entityType === "plugin") {
		const row = await database.query.plugins.findFirst({
			where: eq(plugins.id, job.entityId),
		});
		if (!row) return;
		await generatePluginTranslation(
			database,
			row,
			job.targetLocale as ContentLocale,
			subject,
		);
		return;
	}
	if (job.entityType === "category") {
		const row = await database.query.pluginCategories.findFirst({
			where: eq(pluginCategories.id, job.entityId),
		});
		if (!row) return;
		await generateCategoryTranslation(
			database,
			row,
			job.targetLocale as ContentLocale,
			subject,
		);
		return;
	}
	if (job.entityType === "version") {
		const row = await database.query.pluginVersions.findFirst({
			where: eq(pluginVersions.id, job.entityId),
		});
		if (!row?.changelog) return;
		await generateVersionTranslation(database, {
			versionId: row.id,
			changelog: row.changelog,
			targetLocale: job.targetLocale as ContentLocale,
			subjectKey: subject,
		});
		return;
	}
	if (job.entityType === "pipeline_check") {
		const row = await database.query.pluginPipelineChecks.findFirst({
			where: eq(pluginPipelineChecks.id, job.entityId),
		});
		if (!row) return;
		await generatePipelineCheckTranslation(
			database,
			row,
			job.targetLocale as ContentLocale,
			subject,
		);
		return;
	}
	if (job.entityType === "collection") {
		const row = await database.query.aiPluginCollections.findFirst({
			where: eq(aiPluginCollections.id, job.entityId),
		});
		if (!row) return;
		await generateCollectionTranslation(
			database,
			row,
			job.targetLocale as ContentLocale,
			subject,
		);
		return;
	}
	throw new Error("Unsupported translation entity");
}

export async function processContentTranslationQueue(
	database: Database,
	limit = 2,
	entityTypes?: TranslationEntityType[],
) {
	const now = nowSeconds();
	const candidates = await database
		.select()
		.from(contentTranslationQueue)
		.where(
			and(
				entityTypes?.length
					? inArray(contentTranslationQueue.entityType, entityTypes)
					: undefined,
				or(
					and(
						eq(contentTranslationQueue.status, "pending"),
						lte(contentTranslationQueue.availableAt, now),
					),
					and(
						eq(contentTranslationQueue.status, "processing"),
						lte(contentTranslationQueue.startedAt, now - STUCK_SECONDS),
					),
				),
			),
		)
		.orderBy(asc(contentTranslationQueue.createdAt))
		.limit(Math.max(1, Math.min(limit, 5)));

	let completed = 0;
	let failed = 0;
	let limited = false;
	for (const candidate of candidates) {
		const [claimed] = await database
			.update(contentTranslationQueue)
			.set({ status: "processing", startedAt: now, updatedAt: now })
			.where(
				and(
					eq(contentTranslationQueue.id, candidate.id),
					or(
						and(
							eq(contentTranslationQueue.status, "pending"),
							lte(contentTranslationQueue.availableAt, now),
						),
						and(
							eq(contentTranslationQueue.status, "processing"),
							lte(contentTranslationQueue.startedAt, now - STUCK_SECONDS),
						),
					),
				),
			)
			.returning();
		if (!claimed) continue;

		try {
			await runTranslationJob(database, claimed);
			await database
				.update(contentTranslationQueue)
				.set({
					status: "completed",
					completedAt: nowSeconds(),
					errorMessage: null,
					updatedAt: nowSeconds(),
				})
				.where(eq(contentTranslationQueue.id, claimed.id));
			completed += 1;
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Translation failed";
			if (message === "AI_TRANSLATION_RATE_LIMITED") {
				await database
					.update(contentTranslationQueue)
					.set({
						status: "pending",
						availableAt: nowSeconds() + 10 * 60,
						errorMessage: null,
						updatedAt: nowSeconds(),
					})
					.where(eq(contentTranslationQueue.id, claimed.id));
				limited = true;
				break;
			}
			const attempts = claimed.attempts + 1;
			await database
				.update(contentTranslationQueue)
				.set({
					status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
					attempts,
					availableAt: nowSeconds() + Math.min(60 * 60, 60 * 2 ** attempts),
					errorMessage: message.slice(0, 500),
					updatedAt: nowSeconds(),
				})
				.where(eq(contentTranslationQueue.id, claimed.id));
			failed += 1;
		}
	}
	return { claimed: candidates.length, completed, failed, limited };
}
