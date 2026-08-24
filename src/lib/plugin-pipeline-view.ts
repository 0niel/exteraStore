export type PipelineCheckState =
	| "queued"
	| "running"
	| "success"
	| "warning"
	| "failed";

export type PipelineIssue = {
	type: string;
	severity: "low" | "medium" | "high" | "critical";
	description: string;
	recommendation: string;
};

export type PipelineDetails = {
	status?: string;
	classification?: string;
	shortDescription?: string;
	issues: PipelineIssue[];
};

export type PipelineCheckLike = {
	status: string;
	score: number | null;
	classification?: string | null;
};

const issueSeverities = new Set(["low", "medium", "high", "critical"]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

export function parsePipelineDetails(details?: string | null): PipelineDetails {
	if (!details) return { issues: [] };

	try {
		const parsed: unknown = JSON.parse(details);
		if (!isRecord(parsed)) return { issues: [] };

		const rawIssues = Array.isArray(parsed.issues) ? parsed.issues : [];
		const issues = rawIssues.flatMap((raw): PipelineIssue[] => {
			if (!isRecord(raw)) return [];
			const severity = asText(raw.severity);
			const description = asText(raw.description);
			if (!description) return [];

			return [
				{
					type: asText(raw.type),
					severity: issueSeverities.has(severity)
						? (severity as PipelineIssue["severity"])
						: "medium",
					description,
					recommendation: asText(raw.recommendation),
				},
			];
		});

		return {
			status: asText(parsed.status) || undefined,
			classification: asText(parsed.classification) || undefined,
			shortDescription: asText(parsed.shortDescription) || undefined,
			issues,
		};
	} catch {
		return { issues: [] };
	}
}

export function getPipelineCheckState(
	check?: PipelineCheckLike | null,
): PipelineCheckState {
	if (!check || check.status === "pending" || check.status === "queued") {
		return "queued";
	}
	if (check.status === "running") return "running";
	if (check.status === "error") return "failed";

	if (
		check.classification === "critical" ||
		check.classification === "unsafe" ||
		(check.score !== null && check.score < 50)
	) {
		return "failed";
	}

	if (
		check.classification === "potentially_unsafe" ||
		check.status === "failed" ||
		(check.score !== null && check.score < 70)
	) {
		return "warning";
	}

	return "success";
}

export function getOverallPipelineState(
	checks: PipelineCheckLike[],
	isQueuedOrRunning: boolean,
): PipelineCheckState {
	if (isQueuedOrRunning || checks.some((check) => check.status === "running")) {
		return "running";
	}
	if (checks.length === 0) return "queued";

	const states = checks.map(getPipelineCheckState);
	if (states.includes("failed")) return "failed";
	if (states.includes("warning")) return "warning";
	if (states.every((state) => state === "success")) return "success";
	return "queued";
}
