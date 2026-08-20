import { and, eq, inArray, lt, sql } from "drizzle-orm";
import type { processQueueItem as ProcessQueueItem } from "~/server/api/routers/plugin-pipeline";
import { db } from "~/server/db";
import { pluginPipelineQueue } from "~/server/db/schema";

const FIRST_RUN_DELAY_MS = 60_000;
const TICK_INTERVAL_MS = 600_000;
const STUCK_PROCESSING_SECONDS = 1_800;
const MAX_FAILURE_AGE_SECONDS = 7 * 86_400;
const EXHAUSTED_COOLDOWN_SECONDS = 6 * 3_600;

const globalState = globalThis as typeof globalThis & {
	__pipelineRetryStarted?: boolean;
};

type PipelineContext = Parameters<typeof ProcessQueueItem>[0];

async function retryTick() {
	const now = Math.floor(Date.now() / 1000);

	const stuck = await db
		.update(pluginPipelineQueue)
		.set({
			status: "failed",
			errorMessage: "Stuck in processing for over 30 minutes",
			completedAt: now,
		})
		.where(
			and(
				eq(pluginPipelineQueue.status, "processing"),
				lt(pluginPipelineQueue.startedAt, now - STUCK_PROCESSING_SECONDS),
			),
		)
		.returning({ id: pluginPipelineQueue.id });

	await db
		.update(pluginPipelineQueue)
		.set({
			retryCount: sql`greatest(${pluginPipelineQueue.maxRetries} - 1, 0)`,
		})
		.where(
			and(
				eq(pluginPipelineQueue.status, "failed"),
				sql`${pluginPipelineQueue.retryCount} >= ${pluginPipelineQueue.maxRetries}`,
				sql`coalesce(${pluginPipelineQueue.completedAt}, ${pluginPipelineQueue.createdAt}) < ${now - EXHAUSTED_COOLDOWN_SECONDS}`,
				sql`coalesce(${pluginPipelineQueue.completedAt}, ${pluginPipelineQueue.createdAt}) >= ${now - MAX_FAILURE_AGE_SECONDS}`,
			),
		);

	const retryable = await db
		.select({ id: pluginPipelineQueue.id })
		.from(pluginPipelineQueue)
		.where(
			and(
				eq(pluginPipelineQueue.status, "failed"),
				sql`${pluginPipelineQueue.retryCount} < ${pluginPipelineQueue.maxRetries}`,
				sql`coalesce(${pluginPipelineQueue.completedAt}, ${pluginPipelineQueue.createdAt}) >= ${now - MAX_FAILURE_AGE_SECONDS}`,
			),
		);

	if (retryable.length === 0) {
		if (stuck.length > 0) {
			console.log(
				`pipeline retry: marked ${stuck.length} stuck item(s) as failed, nothing retryable`,
			);
		}
		return;
	}

	const ids = retryable.map((row: { id: number }) => row.id);

	await db
		.update(pluginPipelineQueue)
		.set({
			status: "queued",
			scheduledAt: now,
			startedAt: null,
			completedAt: null,
		})
		.where(inArray(pluginPipelineQueue.id, ids));

	console.log(
		`pipeline retry: requeued ${ids.length} failed item(s) (${stuck.length} were stuck in processing)`,
	);

	const { processQueueItem } = await import(
		"~/server/api/routers/plugin-pipeline"
	);
	const ctx = { db, session: null, headers: new Headers() } as PipelineContext;

	for (const id of ids) {
		try {
			await processQueueItem(ctx, id);
		} catch {
			console.error(`pipeline retry: queue item ${id} failed again`);
		}
	}
}

export function startPipelineRetryLoop() {
	if (globalState.__pipelineRetryStarted) {
		return;
	}
	globalState.__pipelineRetryStarted = true;

	const run = () => {
		retryTick().catch((error) => {
			console.error("pipeline retry: tick failed", error);
		});
	};

	setTimeout(run, FIRST_RUN_DELAY_MS);
	setInterval(run, TICK_INTERVAL_MS);
	console.log("pipeline retry loop started");
}
