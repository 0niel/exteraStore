import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "~/env";
import { sendSecurityAlerts } from "~/server/api/routers/plugin-pipeline";
import {
	buildCheckPrompts,
	type CheckType,
	getAiCheckRequestCost,
	MAX_AI_CHECK_REQUESTS_PER_PLUGIN,
	parseCheckResults,
} from "~/server/api/routers/plugin-pipeline-ai";
import { db } from "~/server/db";
import {
	pluginPipelineChecks,
	pluginPipelineQueue,
	plugins,
	pluginVersions,
} from "~/server/db/schema";
import { consumeAiRateLimit } from "~/server/lib/ai-rate-limiter";
import {
	type ContentLocale,
	contentLocaleSchema,
	pluginTranslationFieldsSchema,
	saveManualPluginTranslation,
} from "~/server/lib/content-localization";
import {
	BACKGROUND_TRANSLATION_BATCH_SIZE,
	entityTypesForTranslationScope,
	translationScopes,
} from "~/server/lib/content-translation-policy";
import {
	enqueueMissingTranslations,
	enqueuePluginTranslations,
	enqueueTranslationJobs,
	processContentTranslationQueue,
} from "~/server/lib/content-translation-queue";
import { isCronAuthorized } from "~/server/lib/cron-auth";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const STUCK_PROCESSING_SECONDS = 1_800;
const CHECK_TYPES: CheckType[] = ["security", "performance"];
const ALERT_CLASSIFICATIONS = new Set(["unsafe", "critical"]);

const claimSchema = z.object({
	action: z.literal("claim"),
	limit: z.number().int().min(1).max(10).default(3),
});

const submitSchema = z.object({
	action: z.literal("submit"),
	results: z
		.array(
			z.object({
				queueId: z.number().int().positive(),
				checks: z
					.array(
						z.object({
							checkType: z.enum(["security", "performance"]),
							responses: z.array(z.string().max(200_000)).max(40),
						}),
					)
					.max(4)
					.default([]),
				error: z.string().max(1_000).optional(),
			}),
		)
		.max(20),
});

const enqueueSchema = z.object({
	action: z.literal("enqueue"),
	pluginIds: z.array(z.number().int().positive()).max(50).optional(),
	limit: z.number().int().min(1).max(50).default(10),
});

const translateSchema = z.object({
	action: z.literal("translate"),
	scope: z.enum(translationScopes).default("all"),
	discover: z.boolean().default(false),
	pluginIds: z.array(z.number().int().positive()).min(1).max(20).optional(),
	limit: z
		.number()
		.int()
		.min(1)
		.max(12)
		.default(BACKGROUND_TRANSLATION_BATCH_SIZE),
});

const saveTranslationSchema = pluginTranslationFieldsSchema.extend({
	action: z.literal("save_translation"),
	pluginId: z.number().int().positive(),
	locale: contentLocaleSchema,
});

const bodySchema = z.discriminatedUnion("action", [
	claimSchema,
	submitSchema,
	enqueueSchema,
	translateSchema,
	saveTranslationSchema,
]);

function nowSeconds() {
	return Math.floor(Date.now() / 1000);
}

function contentLocale(value: string): ContentLocale {
	return value === "en" ? "en" : "ru";
}

function targetLocale(locale: ContentLocale): ContentLocale {
	return locale === "ru" ? "en" : "ru";
}

async function loadLatestVersion(pluginId: number) {
	const rows = await db
		.select({
			version: pluginVersions.version,
			fileContent: pluginVersions.fileContent,
		})
		.from(pluginVersions)
		.where(eq(pluginVersions.pluginId, pluginId))
		.orderBy(desc(pluginVersions.createdAt))
		.limit(1);

	return rows[0] ?? null;
}

async function processTranslations(
	scope: (typeof translationScopes)[number],
	limit: number,
	discover: boolean,
	pluginIds?: number[],
) {
	const enqueued = pluginIds?.length
		? await enqueuePluginTranslations(db, pluginIds)
		: discover
			? await enqueueMissingTranslations(db, scope)
			: { queued: 0, totalMissing: 0, byType: {} };
	const processed = await processContentTranslationQueue(
		db,
		limit,
		pluginIds?.length
			? entityTypesForTranslationScope("plugins")
			: entityTypesForTranslationScope(scope),
		pluginIds,
	);
	return { enqueued, processed };
}

async function failQueueItem(queueId: number, message: string) {
	await db
		.update(pluginPipelineQueue)
		.set({
			status: "failed",
			errorMessage: message.slice(0, 500),
			retryCount: sql`${pluginPipelineQueue.retryCount} + 1`,
			completedAt: nowSeconds(),
		})
		.where(eq(pluginPipelineQueue.id, queueId));
}

async function handleClaim(limit: number) {
	const now = nowSeconds();

	const candidates = await db
		.select({
			id: pluginPipelineQueue.id,
			pluginId: pluginPipelineQueue.pluginId,
		})
		.from(pluginPipelineQueue)
		.where(
			or(
				eq(pluginPipelineQueue.status, "queued"),
				and(
					eq(pluginPipelineQueue.status, "processing"),
					sql`coalesce(${pluginPipelineQueue.startedAt}, ${pluginPipelineQueue.createdAt}) < ${now - STUCK_PROCESSING_SECONDS}`,
				),
			),
		)
		.orderBy(desc(pluginPipelineQueue.priority), pluginPipelineQueue.createdAt)
		.limit(limit);

	const claimedCandidates: typeof candidates = [];
	for (const candidate of candidates) {
		const [claimed] = await db
			.update(pluginPipelineQueue)
			.set({ status: "processing", startedAt: now, completedAt: null })
			.where(
				and(
					eq(pluginPipelineQueue.id, candidate.id),
					or(
						eq(pluginPipelineQueue.status, "queued"),
						and(
							eq(pluginPipelineQueue.status, "processing"),
							sql`coalesce(${pluginPipelineQueue.startedAt}, ${pluginPipelineQueue.createdAt}) < ${now - STUCK_PROCESSING_SECONDS}`,
						),
					),
				),
			)
			.returning({
				id: pluginPipelineQueue.id,
				pluginId: pluginPipelineQueue.pluginId,
			});
		if (claimed) claimedCandidates.push(claimed);
	}

	if (claimedCandidates.length === 0) {
		return NextResponse.json({ jobs: [] });
	}

	const jobs: {
		queueId: number;
		pluginId: number;
		version: string;
		checks: {
			checkType: CheckType;
			chunks: { instructions: string; prompt: string }[];
		}[];
	}[] = [];

	for (const candidate of claimedCandidates) {
		const pluginRows = await db
			.select({
				name: plugins.name,
				description: plugins.description,
				category: plugins.category,
				slug: plugins.slug,
				contentLocale: plugins.contentLocale,
			})
			.from(plugins)
			.where(eq(plugins.id, candidate.pluginId))
			.limit(1);

		const plugin = pluginRows[0];
		if (!plugin) {
			await failQueueItem(candidate.id, "Plugin not found");
			continue;
		}

		const latestVersion = await loadLatestVersion(candidate.pluginId);
		if (!latestVersion?.fileContent) {
			await failQueueItem(candidate.id, "Plugin version or source not found");
			continue;
		}
		try {
			getAiCheckRequestCost(latestVersion.fileContent);
		} catch (error) {
			await failQueueItem(
				candidate.id,
				error instanceof Error ? error.message : "Plugin source is too large",
			);
			continue;
		}

		jobs.push({
			queueId: candidate.id,
			pluginId: candidate.pluginId,
			version: latestVersion.version,
			checks: CHECK_TYPES.map((checkType) => ({
				checkType,
				chunks: buildCheckPrompts(checkType, {
					name: plugin.name,
					description: plugin.description,
					category: plugin.category,
					version: latestVersion.version,
					code: latestVersion.fileContent,
					locale: contentLocale(plugin.contentLocale),
				}),
			})),
		});
	}

	return NextResponse.json({ jobs });
}

async function insertErrorCheck(
	pluginId: number,
	checkType: CheckType,
	version: string,
	message: string,
	locale: ContentLocale,
) {
	await db.insert(pluginPipelineChecks).values({
		pluginId,
		checkType,
		status: "error",
		errorMessage: message.slice(0, 500),
		llmModel: env.OPENROUTER_MODEL,
		llmPrompt: `Version: ${version}`,
		contentLocale: locale,
		completedAt: nowSeconds(),
	});
}

async function handleSubmit(
	results: z.infer<typeof submitSchema>["results"],
): Promise<NextResponse> {
	let completed = 0;
	let failed = 0;

	for (const result of results) {
		const queueRows = await db
			.select({
				id: pluginPipelineQueue.id,
				pluginId: pluginPipelineQueue.pluginId,
				contentLocale: plugins.contentLocale,
			})
			.from(pluginPipelineQueue)
			.innerJoin(plugins, eq(pluginPipelineQueue.pluginId, plugins.id))
			.where(eq(pluginPipelineQueue.id, result.queueId))
			.limit(1);

		const queueItem = queueRows[0];
		if (!queueItem) {
			continue;
		}

		const latestVersion = await loadLatestVersion(queueItem.pluginId);
		const version = latestVersion?.version ?? "unknown";
		const locale = contentLocale(queueItem.contentLocale);

		if (result.error) {
			for (const checkType of CHECK_TYPES) {
				await insertErrorCheck(
					queueItem.pluginId,
					checkType,
					version,
					result.error,
					locale,
				);
			}
			await failQueueItem(queueItem.id, result.error);
			failed += 1;
			continue;
		}

		let succeeded = 0;
		let needsAlert = false;

		for (const check of result.checks) {
			try {
				const parsed = parseCheckResults(
					check.checkType,
					check.responses,
					locale,
				);

				const [createdCheck] = await db
					.insert(pluginPipelineChecks)
					.values({
						pluginId: queueItem.pluginId,
						checkType: check.checkType,
						status: "completed",
						score: parsed.score,
						classification: parsed.classification,
						shortDescription: parsed.shortDescription,
						details: parsed.details,
						llmModel: env.OPENROUTER_MODEL,
						llmPrompt: `Version: ${version}`,
						contentLocale: locale,
						completedAt: nowSeconds(),
					})
					.returning({ id: pluginPipelineChecks.id });
				if (createdCheck) {
					await enqueueTranslationJobs(db, [
						{
							entityType: "pipeline_check",
							entityId: createdCheck.id,
							targetLocale: targetLocale(locale),
						},
					]);
				}

				succeeded += 1;
				if (ALERT_CLASSIFICATIONS.has(parsed.classification)) {
					needsAlert = true;
				}
			} catch {
				await insertErrorCheck(
					queueItem.pluginId,
					check.checkType,
					version,
					"Failed to parse AI response",
					locale,
				);
			}
		}

		if (succeeded === 0) {
			await failQueueItem(queueItem.id, "No AI check produced a usable result");
			failed += 1;
			continue;
		}

		await db
			.update(pluginPipelineQueue)
			.set({
				status: "completed",
				errorMessage: null,
				completedAt: nowSeconds(),
			})
			.where(eq(pluginPipelineQueue.id, queueItem.id));

		completed += 1;

		if (needsAlert) {
			const pluginRows = await db
				.select({ name: plugins.name, slug: plugins.slug })
				.from(plugins)
				.where(eq(plugins.id, queueItem.pluginId))
				.limit(1);

			const plugin = pluginRows[0];
			if (plugin) {
				try {
					await sendSecurityAlerts(db, queueItem.pluginId, plugin);
				} catch {
					console.error("ai-worker: failed to send security alerts");
				}
			}
		}
	}

	return NextResponse.json({ ok: true, completed, failed });
}

async function handleEnqueue(pluginIds: number[] | undefined, limit: number) {
	const now = nowSeconds();

	const candidates = await db
		.select({ id: plugins.id })
		.from(plugins)
		.where(
			pluginIds?.length
				? and(eq(plugins.status, "approved"), inArray(plugins.id, pluginIds))
				: eq(plugins.status, "approved"),
		)
		.orderBy(desc(plugins.updatedAt))
		.limit(limit);

	if (candidates.length === 0) {
		return NextResponse.json({ enqueued: 0, skipped: 0 });
	}

	const ids = candidates.map((row: { id: number }) => row.id);

	const active = await db
		.select({ pluginId: pluginPipelineQueue.pluginId })
		.from(pluginPipelineQueue)
		.where(
			and(
				inArray(pluginPipelineQueue.pluginId, ids),
				sql`${pluginPipelineQueue.status} IN ('queued', 'processing')`,
			),
		);

	const busy = new Set(active.map((row: { pluginId: number }) => row.pluginId));
	const pending = ids.filter((id: number) => !busy.has(id));

	if (pending.length === 0) {
		return NextResponse.json({ enqueued: 0, skipped: ids.length });
	}

	await db.insert(pluginPipelineQueue).values(
		pending.map((pluginId: number) => ({
			pluginId,
			priority: 5,
			scheduledAt: now,
		})),
	);

	return NextResponse.json({
		enqueued: pending.length,
		skipped: ids.length - pending.length,
	});
}

export async function POST(request: Request) {
	if (!isCronAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: z.infer<typeof bodySchema>;
	try {
		body = bodySchema.parse(await request.json());
	} catch {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	try {
		if (body.action === "claim") {
			return await handleClaim(body.limit);
		}
		if (body.action === "enqueue") {
			const requested = body.pluginIds?.length ?? body.limit;
			const rateLimit = await consumeAiRateLimit(
				db,
				"system:ai-worker-enqueue",
				"worker_pipeline",
				requested * MAX_AI_CHECK_REQUESTS_PER_PLUGIN,
			);
			if (rateLimit.limited) {
				return NextResponse.json({ error: "AI_RATE_LIMITED" }, { status: 429 });
			}
			return await handleEnqueue(body.pluginIds, body.limit);
		}
		if (body.action === "translate") {
			return NextResponse.json({
				translations: await processTranslations(
					body.scope,
					body.limit,
					body.discover,
					body.pluginIds,
				),
			});
		}
		if (body.action === "save_translation") {
			const plugin = await db.query.plugins.findFirst({
				where: eq(plugins.id, body.pluginId),
			});
			if (plugin?.status !== "approved") {
				return NextResponse.json(
					{ error: "Plugin not found" },
					{ status: 404 },
				);
			}
			const translation = await saveManualPluginTranslation(db, plugin, body);
			return NextResponse.json({ translation });
		}
		return await handleSubmit(body.results);
	} catch (error) {
		console.error("ai-worker: request failed", error);
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
