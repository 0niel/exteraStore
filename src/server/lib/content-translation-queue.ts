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
	isCategoryContentUsable,
	isCategoryTranslationUsable,
	isCollectionTranslationUsable,
	isPipelineCheckTranslationUsable,
	isPluginContentUsable,
	isPluginTranslationUsable,
	isVersionTranslationUsable,
	pipelineCheckSourceHash,
	pluginSourceHash,
	pluginTranslationInput,
	versionSourceHash,
} from "~/server/lib/content-localization";
import {
	ContentTranslationRateLimitError,
	normalizeTranslationBatchSize,
	type TranslationEntityType,
	translationRetryAt,
} from "~/server/lib/content-translation-policy";

export type { TranslationEntityType } from "~/server/lib/content-translation-policy";

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
	const translations = await database.select().from(pluginTranslations);
	const existing = new Map(
		translations.map((row) => [`${row.pluginId}:${row.locale}`, row]),
	);
	return rows.flatMap((row): TranslationJob[] => {
		const source = pluginTranslationInput(row);
		const declared =
			row.contentLocale === "ru" || row.contentLocale === "en"
				? row.contentLocale
				: null;
		const targets = [
			targetLocale(row.contentLocale),
			declared && !isPluginContentUsable(source, declared) ? declared : null,
		].filter((target): target is ContentLocale => Boolean(target));
		return targets.flatMap((target): TranslationJob[] => {
			const translation = existing.get(`${row.id}:${target}`);
			const stale =
				translation?.origin === "ai" &&
				(translation.sourceHash !== pluginSourceHash(source) ||
					!isPluginTranslationUsable(source, translation, target));
			return !translation || stale
				? [{ entityType: "plugin", entityId: row.id, targetLocale: target }]
				: [];
		});
	});
}

async function missingCategoryJobs(database: Database) {
	const [rows, translations] = await Promise.all([
		database.select().from(pluginCategories),
		database.select().from(categoryTranslations),
	]);
	const existing = new Map(
		translations.map((row) => [`${row.categoryId}:${row.locale}`, row]),
	);
	return rows.flatMap((row): TranslationJob[] => {
		const source = categoryTranslationInput(row);
		const declared =
			row.contentLocale === "ru" || row.contentLocale === "en"
				? row.contentLocale
				: null;
		const targets = [
			targetLocale(row.contentLocale),
			declared && !isCategoryContentUsable(source, declared) ? declared : null,
		].filter((target): target is ContentLocale => Boolean(target));
		return targets.flatMap((target): TranslationJob[] => {
			const translation = existing.get(`${row.id}:${target}`);
			const stale =
				translation?.origin === "ai" &&
				(translation.sourceHash !== categorySourceHash(source) ||
					!isCategoryTranslationUsable(source, translation, target));
			return !translation || stale
				? [{ entityType: "category", entityId: row.id, targetLocale: target }]
				: [];
		});
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
	const translations = await database.select().from(pluginVersionTranslations);
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
			target &&
			(translation.sourceHash !== versionSourceHash(row.version.changelog) ||
				!isVersionTranslationUsable(
					row.version.changelog,
					translation,
					target,
				));
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
		.select()
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
			target &&
			(translation.sourceHash !== pipelineCheckSourceHash(row.check) ||
				!isPipelineCheckTranslationUsable(row.check, translation, target));
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
		database.select().from(aiPluginCollectionTranslations),
	]);
	const existing = new Map(
		translations.map((row) => [`${row.collectionId}:${row.locale}`, row]),
	);
	return rows.flatMap((row): TranslationJob[] => {
		const target = targetLocale(row.contentLocale);
		const translation = target ? existing.get(`${row.id}:${target}`) : null;
		const stale =
			translation?.origin === "ai" &&
			target &&
			(translation.sourceHash !== collectionSourceHash(row) ||
				!isCollectionTranslationUsable(row, translation, target));
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
		if (!row) throw new Error("Plugin translation source not found");
		const result = await generatePluginTranslation(
			database,
			row,
			job.targetLocale as ContentLocale,
			subject,
		);
		return { generated: result.generated, label: row.slug };
	}
	if (job.entityType === "category") {
		const row = await database.query.pluginCategories.findFirst({
			where: eq(pluginCategories.id, job.entityId),
		});
		if (!row) throw new Error("Category translation source not found");
		const result = await generateCategoryTranslation(
			database,
			row,
			job.targetLocale as ContentLocale,
			subject,
		);
		return { generated: result.generated, label: row.slug };
	}
	if (job.entityType === "version") {
		const row = await database.query.pluginVersions.findFirst({
			where: eq(pluginVersions.id, job.entityId),
		});
		if (!row?.changelog) throw new Error("Version changelog not found");
		const result = await generateVersionTranslation(database, {
			versionId: row.id,
			changelog: row.changelog,
			targetLocale: job.targetLocale as ContentLocale,
			subjectKey: subject,
		});
		return { generated: result.generated, label: row.version };
	}
	if (job.entityType === "pipeline_check") {
		const row = await database.query.pluginPipelineChecks.findFirst({
			where: eq(pluginPipelineChecks.id, job.entityId),
		});
		if (!row) throw new Error("Pipeline check translation source not found");
		const result = await generatePipelineCheckTranslation(
			database,
			row,
			job.targetLocale as ContentLocale,
			subject,
		);
		return { generated: result.generated, label: row.checkType };
	}
	if (job.entityType === "collection") {
		const row = await database.query.aiPluginCollections.findFirst({
			where: eq(aiPluginCollections.id, job.entityId),
		});
		if (!row) throw new Error("Collection translation source not found");
		const result = await generateCollectionTranslation(
			database,
			row,
			job.targetLocale as ContentLocale,
			subject,
		);
		return { generated: result.generated, label: row.name };
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
		.orderBy(
			sql<number>`CASE ${contentTranslationQueue.entityType}
				WHEN 'plugin' THEN 0
				WHEN 'category' THEN 1
				WHEN 'collection' THEN 2
				WHEN 'version' THEN 3
				WHEN 'pipeline_check' THEN 4
				ELSE 5
			END`,
			asc(contentTranslationQueue.createdAt),
			asc(contentTranslationQueue.id),
		)
		.limit(normalizeTranslationBatchSize(limit));

	let completed = 0;
	let skipped = 0;
	let failed = 0;
	let limited = false;
	const items: Array<{
		queueId: number;
		entityType: string;
		entityId: number;
		targetLocale: string;
		label: string | null;
		status: "completed" | "skipped" | "failed" | "limited";
		error: string | null;
	}> = [];
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
			const result = await runTranslationJob(database, claimed);
			await database
				.update(contentTranslationQueue)
				.set({
					status: "completed",
					completedAt: nowSeconds(),
					errorMessage: null,
					updatedAt: nowSeconds(),
				})
				.where(eq(contentTranslationQueue.id, claimed.id));
			if (result.generated) completed += 1;
			else skipped += 1;
			items.push({
				queueId: claimed.id,
				entityType: claimed.entityType,
				entityId: claimed.entityId,
				targetLocale: claimed.targetLocale,
				label: result.label,
				status: result.generated ? "completed" : "skipped",
				error: null,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Translation failed";
			if (error instanceof ContentTranslationRateLimitError) {
				const resetAt = translationRetryAt(nowSeconds(), error.resetAt);
				await database
					.update(contentTranslationQueue)
					.set({
						status: "pending",
						availableAt: resetAt,
						errorMessage: null,
						updatedAt: nowSeconds(),
					})
					.where(eq(contentTranslationQueue.id, claimed.id));
				limited = true;
				items.push({
					queueId: claimed.id,
					entityType: claimed.entityType,
					entityId: claimed.entityId,
					targetLocale: claimed.targetLocale,
					label: null,
					status: "limited",
					error: `${message}:${resetAt}`,
				});
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
			items.push({
				queueId: claimed.id,
				entityType: claimed.entityType,
				entityId: claimed.entityId,
				targetLocale: claimed.targetLocale,
				label: null,
				status: "failed",
				error: message,
			});
		}
	}
	return { claimed: items.length, completed, skipped, failed, limited, items };
}
