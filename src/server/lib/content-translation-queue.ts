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
	generateCollectionTranslationBatch,
	generatePipelineCheckTranslation,
	generatePluginTranslation,
	generatePluginTranslationBatch,
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
	splitAiTranslationBatch,
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

async function missingPluginJobs(database: Database, pluginIds?: number[]) {
	const rows = await database
		.select()
		.from(plugins)
		.where(
			pluginIds?.length
				? and(eq(plugins.status, "approved"), inArray(plugins.id, pluginIds))
				: eq(plugins.status, "approved"),
		);
	const translations = await database
		.select()
		.from(pluginTranslations)
		.where(
			pluginIds?.length
				? inArray(pluginTranslations.pluginId, pluginIds)
				: undefined,
		);
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

export async function enqueuePluginTranslations(
	database: Database,
	pluginIds: number[],
	requestedById?: string | null,
) {
	const jobs = await missingPluginJobs(database, pluginIds);
	const result = await enqueueTranslationJobs(database, jobs, requestedById);
	return { ...result, totalMissing: jobs.length };
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

type QueueRow = typeof contentTranslationQueue.$inferSelect;

type TranslationRunResult = {
	job: QueueRow;
	generated: boolean;
	label: string | null;
	error: Error | null;
};

async function runTranslationJobs(
	database: Database,
	jobs: QueueRow[],
): Promise<TranslationRunResult[]> {
	if (jobs.length === 0) return [];
	const target = jobs[0]?.targetLocale as ContentLocale;
	if (jobs.every((job) => job.entityType === "plugin")) {
		const rows = await database
			.select()
			.from(plugins)
			.where(
				inArray(
					plugins.id,
					jobs.map((job) => job.entityId),
				),
			);
		const byId = new Map(rows.map((row) => [row.id, row]));
		const presentRows = jobs.flatMap((job) => {
			const row = byId.get(job.entityId);
			return row ? [row] : [];
		});
		const batchResults = await generatePluginTranslationBatch(
			database,
			presentRows,
			target,
			"system:content-translation-worker",
		);
		const byResult = new Map(
			batchResults.map((result) => [result.entityId, result]),
		);
		return jobs.map((job) => {
			const row = byId.get(job.entityId);
			const result = byResult.get(job.entityId);
			return {
				job,
				generated: result?.generated ?? false,
				label: row?.slug ?? null,
				error:
					result?.error ??
					(row ? null : new Error("Plugin translation source not found")),
			};
		});
	}
	if (jobs.every((job) => job.entityType === "collection")) {
		const rows = await database
			.select()
			.from(aiPluginCollections)
			.where(
				inArray(
					aiPluginCollections.id,
					jobs.map((job) => job.entityId),
				),
			);
		const byId = new Map(rows.map((row) => [row.id, row]));
		const presentRows = jobs.flatMap((job) => {
			const row = byId.get(job.entityId);
			return row ? [row] : [];
		});
		const batchResults = await generateCollectionTranslationBatch(
			database,
			presentRows,
			target,
			"system:content-translation-worker",
		);
		const byResult = new Map(
			batchResults.map((result) => [result.entityId, result]),
		);
		return jobs.map((job) => {
			const row = byId.get(job.entityId);
			const result = byResult.get(job.entityId);
			return {
				job,
				generated: result?.generated ?? false,
				label: row?.name ?? null,
				error:
					result?.error ??
					(row ? null : new Error("Collection translation source not found")),
			};
		});
	}

	const results: TranslationRunResult[] = [];
	for (const job of jobs) {
		try {
			const result = await runTranslationJob(database, job);
			results.push({ job, ...result, error: null });
		} catch (error) {
			results.push({
				job,
				generated: false,
				label: null,
				error: error instanceof Error ? error : new Error("Translation failed"),
			});
		}
	}
	return results;
}

export async function processContentTranslationQueue(
	database: Database,
	limit = 2,
	entityTypes?: TranslationEntityType[],
	pluginIds?: number[],
) {
	const now = nowSeconds();
	const candidates = await database
		.select()
		.from(contentTranslationQueue)
		.where(
			and(
				pluginIds?.length
					? and(
							eq(contentTranslationQueue.entityType, "plugin"),
							inArray(contentTranslationQueue.entityId, pluginIds),
						)
					: undefined,
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
				WHEN 'collection' THEN 0
				WHEN 'plugin' THEN 1
				WHEN 'category' THEN 2
				WHEN 'version' THEN 3
				WHEN 'pipeline_check' THEN 4
				ELSE 5
			END`,
			asc(contentTranslationQueue.createdAt),
			asc(contentTranslationQueue.id),
		)
		.limit(normalizeTranslationBatchSize(limit));

	const claimedJobs: QueueRow[] = [];
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
		if (claimed) claimedJobs.push(claimed);
	}

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

	const grouped = new Map<string, QueueRow[]>();
	for (const job of claimedJobs) {
		const key = `${job.entityType}:${job.targetLocale}`;
		const group = grouped.get(key) ?? [];
		group.push(job);
		grouped.set(key, group);
	}
	const groups = [...grouped.values()].flatMap(splitAiTranslationBatch);

	async function completeResult(result: TranslationRunResult) {
		await database
			.update(contentTranslationQueue)
			.set({
				status: "completed",
				completedAt: nowSeconds(),
				errorMessage: null,
				updatedAt: nowSeconds(),
			})
			.where(eq(contentTranslationQueue.id, result.job.id));
		if (result.generated) completed += 1;
		else skipped += 1;
		items.push({
			queueId: result.job.id,
			entityType: result.job.entityType,
			entityId: result.job.entityId,
			targetLocale: result.job.targetLocale,
			label: result.label,
			status: result.generated ? "completed" : "skipped",
			error: null,
		});
	}

	async function failResult(result: TranslationRunResult, error: Error) {
		const attempts = result.job.attempts + 1;
		await database
			.update(contentTranslationQueue)
			.set({
				status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
				attempts,
				availableAt: nowSeconds() + Math.min(60 * 60, 60 * 2 ** attempts),
				errorMessage: error.message.slice(0, 500),
				updatedAt: nowSeconds(),
			})
			.where(eq(contentTranslationQueue.id, result.job.id));
		failed += 1;
		items.push({
			queueId: result.job.id,
			entityType: result.job.entityType,
			entityId: result.job.entityId,
			targetLocale: result.job.targetLocale,
			label: result.label,
			status: "failed",
			error: error.message,
		});
	}

	async function deferLimitedJobs(
		jobs: QueueRow[],
		error: ContentTranslationRateLimitError,
	) {
		if (jobs.length === 0) return;
		const resetAt = translationRetryAt(nowSeconds(), error.resetAt);
		await database
			.update(contentTranslationQueue)
			.set({
				status: "pending",
				availableAt: resetAt,
				errorMessage: null,
				updatedAt: nowSeconds(),
			})
			.where(
				inArray(
					contentTranslationQueue.id,
					jobs.map((job) => job.id),
				),
			);
		limited = true;
		for (const job of jobs) {
			items.push({
				queueId: job.id,
				entityType: job.entityType,
				entityId: job.entityId,
				targetLocale: job.targetLocale,
				label: null,
				status: "limited",
				error: `${error.message}:${resetAt}`,
			});
		}
	}

	groupLoop: for (
		let groupIndex = 0;
		groupIndex < groups.length;
		groupIndex += 1
	) {
		const group = groups[groupIndex] ?? [];
		let results: TranslationRunResult[];
		try {
			results = await runTranslationJobs(database, group);
		} catch (error) {
			if (error instanceof ContentTranslationRateLimitError) {
				await deferLimitedJobs(groups.slice(groupIndex).flat(), error);
				break;
			}
			const failure =
				error instanceof Error ? error : new Error("Translation failed");
			for (const job of group) {
				await failResult(
					{ job, generated: false, label: null, error: failure },
					failure,
				);
			}
			continue;
		}

		for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
			const result = results[resultIndex];
			if (!result) continue;
			if (result.error instanceof ContentTranslationRateLimitError) {
				await deferLimitedJobs(
					[
						...results.slice(resultIndex).map((item) => item.job),
						...groups.slice(groupIndex + 1).flat(),
					],
					result.error,
				);
				break groupLoop;
			}
			if (result.error) await failResult(result, result.error);
			else await completeResult(result);
		}
	}
	return { claimed: items.length, completed, skipped, failed, limited, items };
}
