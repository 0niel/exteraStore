export type PluginCheckSummary =
	| "critical"
	| "issues"
	| "ok"
	| "running"
	| "unchecked";

type PluginCheck = {
	checkType: string;
	status: string;
	score: number | null;
	classification: string | null;
	createdAt: Date | number | string;
};

const ACTIVE_CHECK_STATUSES = new Set([
	"pending",
	"queued",
	"processing",
	"running",
]);

const ACTIVE_QUEUE_STATUSES = new Set(["queued", "processing"]);

function toTimestamp(value: PluginCheck["createdAt"]): number {
	if (value instanceof Date) return value.getTime();
	if (typeof value === "number") return value * 1_000;
	const timestamp = new Date(value).getTime();
	return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function summarizePluginChecks(
	checks: PluginCheck[],
	queueStatus?: string | null,
): PluginCheckSummary {
	if (queueStatus && ACTIVE_QUEUE_STATUSES.has(queueStatus)) return "running";

	const latestChecks = [
		...[...checks]
			.sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
			.reduce((checksByType, check) => {
				if (!checksByType.has(check.checkType)) {
					checksByType.set(check.checkType, check);
				}
				return checksByType;
			}, new Map<string, PluginCheck>())
			.values(),
	];

	if (latestChecks.length === 0) return "unchecked";
	if (latestChecks.some((check) => ACTIVE_CHECK_STATUSES.has(check.status))) {
		return "running";
	}
	if (
		latestChecks.some(
			(check) =>
				check.classification === "critical" ||
				check.classification === "unsafe" ||
				(check.score !== null && check.score < 50),
		)
	) {
		return "critical";
	}
	if (
		latestChecks.some(
			(check) =>
				check.status === "failed" ||
				check.status === "error" ||
				check.classification === "potentially_unsafe" ||
				(check.score !== null && check.score < 70),
		)
	) {
		return "issues";
	}
	return "ok";
}
