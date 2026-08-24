import assert from "node:assert/strict";
import test from "node:test";
import {
	buildRussianReviewSummaryFallback,
	isRussianReviewSummary,
} from "./review-summary";

test("accepts a fully Russian review summary", () => {
	assert.equal(
		isRussianReviewSummary({
			verdict: "Пользователи положительно оценивают плагин.",
			pros: ["Удобная настройка"],
			cons: ["Иногда возникают ошибки"],
			sentiment: "positive",
		}),
		true,
	);
});

test("rejects English text in any review summary section", () => {
	assert.equal(
		isRussianReviewSummary({
			verdict: "Пользователи положительно оценивают плагин.",
			pros: ["Easy setup"],
			cons: [],
			sentiment: "positive",
		}),
		false,
	);
});

test("builds a factual Russian fallback from ratings", () => {
	const summary = buildRussianReviewSummaryFallback([
		{ rating: 1 },
		{ rating: 1 },
		{ rating: 5 },
	]);

	assert.equal(summary.sentiment, "negative");
	assert.match(summary.verdict, /2\.3 из 5/);
	assert.deepEqual(summary.pros, [
		"Высоких оценок, от четырёх до пяти звёзд: 1",
	]);
	assert.deepEqual(summary.cons, ["Низких оценок, от одной до двух звёзд: 2"]);
});
