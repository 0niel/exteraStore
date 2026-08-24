import assert from "node:assert/strict";
import test from "node:test";
import { summarizePluginChecks } from "~/lib/plugin-check-summary";

const check = (
	overrides: Partial<Parameters<typeof summarizePluginChecks>[0][number]> = {},
) => ({
	checkType: "security",
	status: "completed",
	score: 100,
	classification: "safe",
	createdAt: 100,
	...overrides,
});

test("reports unchecked when no results exist", () => {
	assert.equal(summarizePluginChecks([]), "unchecked");
});

test("reports running for an active queue or latest check", () => {
	assert.equal(summarizePluginChecks([], "queued"), "running");
	assert.equal(
		summarizePluginChecks([check({ status: "running" })]),
		"running",
	);
});

test("reports critical for unsafe classifications and very low scores", () => {
	assert.equal(
		summarizePluginChecks([check({ classification: "critical" })]),
		"critical",
	);
	assert.equal(summarizePluginChecks([check({ score: 30 })]), "critical");
});

test("reports issues for warnings, failed checks and processing errors", () => {
	assert.equal(
		summarizePluginChecks([check({ classification: "potentially_unsafe" })]),
		"issues",
	);
	assert.equal(
		summarizePluginChecks([check({ status: "failed", score: 60 })]),
		"issues",
	);
	assert.equal(
		summarizePluginChecks([check({ status: "error", score: null })]),
		"issues",
	);
});

test("uses only the newest result of each check type", () => {
	assert.equal(
		summarizePluginChecks([
			check({ classification: "critical", createdAt: 100 }),
			check({ classification: "safe", createdAt: 200 }),
		]),
		"ok",
	);
});

test("reports ok when every latest result is healthy", () => {
	assert.equal(
		summarizePluginChecks([
			check(),
			check({ checkType: "performance", score: 85 }),
		]),
		"ok",
	);
});
