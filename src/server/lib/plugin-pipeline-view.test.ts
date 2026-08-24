import assert from "node:assert/strict";
import test from "node:test";
import {
	getOverallPipelineState,
	getPipelineCheckState,
	parsePipelineDetails,
} from "~/lib/plugin-pipeline-view";

test("pipeline state separates warnings from critical failures", () => {
	assert.equal(
		getPipelineCheckState({
			status: "failed",
			score: 60,
			classification: "potentially_unsafe",
		}),
		"warning",
	);
	assert.equal(
		getPipelineCheckState({
			status: "failed",
			score: 20,
			classification: "critical",
		}),
		"failed",
	);
});

test("running workflow has priority over stored results", () => {
	assert.equal(
		getOverallPipelineState(
			[{ status: "passed", score: 90, classification: "safe" }],
			true,
		),
		"running",
	);
});

test("pipeline details retain only usable issues", () => {
	const details = parsePipelineDetails(
		JSON.stringify({
			status: "warning",
			issues: [
				{
					type: "Сеть",
					severity: "high",
					description: "Найден неизвестный адрес",
					recommendation: "Проверьте назначение запроса",
				},
				{ severity: "low" },
			],
		}),
	);

	assert.equal(details.issues.length, 1);
	assert.equal(details.issues[0]?.severity, "high");
	assert.equal(details.issues[0]?.type, "Сеть");
});
