import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aiRouter = readFileSync(
	new URL("../api/routers/ai.ts", import.meta.url),
	"utf8",
);
const pipelineRouter = readFileSync(
	new URL("../api/routers/plugin-pipeline.ts", import.meta.url),
	"utf8",
);
const aiClient = readFileSync(
	new URL("./ai-client.ts", import.meta.url),
	"utf8",
);
const pipelineAi = readFileSync(
	new URL("../api/routers/plugin-pipeline-ai.ts", import.meta.url),
	"utf8",
);

test("every interactive AI procedure requires an authenticated session", () => {
	for (const procedure of [
		"summarizeReviews",
		"pluginInsight",
		"explainDiff",
		"suggestTags",
		"askAboutPlugin",
	]) {
		assert.match(aiRouter, new RegExp(`${procedure}: protectedProcedure`));
	}

	for (const procedure of [
		"runChecks",
		"improveText",
		"generateAndSaveAICollections",
		"getAICollections",
	]) {
		assert.match(
			pipelineRouter,
			new RegExp(`${procedure}: protectedProcedure`),
		);
	}
});

test("the AI provider client requires and validates a budget grant", () => {
	assert.match(aiClient, /budget: AiBudgetGrant/g);
	assert.match(aiClient, /assertAiBudgetGrant\(budget\)/g);
});

test("pipeline checks cap paid requests for oversized plugin sources", () => {
	assert.match(pipelineAi, /const MAX_CHECK_CHUNKS = 4/);
	assert.match(pipelineAi, /code\.length > MAX_AI_CHECK_CODE_CHARS/);
	assert.match(pipelineAi, /return splitCode\(code\)\.length \* 2/);
});
