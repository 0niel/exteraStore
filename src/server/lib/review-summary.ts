export interface ReviewSummaryText {
	verdict: string;
	pros: string[];
	cons: string[];
	sentiment: "positive" | "mixed" | "negative";
}

interface ReviewRating {
	rating: number;
}

export type ReviewSummaryLocale = "ru" | "en";

const CYRILLIC_TEXT = /[а-яё]/i;

function reviewWord(count: number) {
	const lastTwo = count % 100;
	const last = count % 10;
	if (lastTwo >= 11 && lastTwo <= 14) return "отзывам";
	if (last === 1) return "отзыву";
	if (last >= 2 && last <= 4) return "отзывам";
	return "отзывам";
}

export function isRussianReviewSummary(summary: ReviewSummaryText) {
	return [summary.verdict, ...summary.pros, ...summary.cons].every((text) =>
		CYRILLIC_TEXT.test(text),
	);
}

export function isReviewSummaryInLocale(
	summary: ReviewSummaryText,
	locale: ReviewSummaryLocale,
) {
	return locale === "ru"
		? isRussianReviewSummary(summary)
		: [summary.verdict, ...summary.pros, ...summary.cons].every(
				(text) => !CYRILLIC_TEXT.test(text),
			);
}

export function buildReviewSummaryFallback(
	reviews: ReviewRating[],
	locale: ReviewSummaryLocale,
): ReviewSummaryText {
	if (locale === "ru") return buildRussianReviewSummaryFallback(reviews);
	const count = reviews.length;
	const average =
		count > 0
			? reviews.reduce((total, review) => total + review.rating, 0) / count
			: 0;
	const highRatings = reviews.filter((review) => review.rating >= 4).length;
	const lowRatings = reviews.filter((review) => review.rating <= 2).length;
	const sentiment =
		average >= 4 ? "positive" : average <= 2.5 ? "negative" : "mixed";
	const tone = {
		positive: "Users generally rate the plugin positively.",
		mixed: "User ratings vary noticeably.",
		negative: "Negative experiences dominate the ratings.",
	}[sentiment];
	return {
		verdict: `The average rating is ${average.toFixed(1)} out of 5 across ${count} ${count === 1 ? "rating" : "ratings"}. ${tone}`,
		pros:
			highRatings > 0
				? [`Ratings between four and five stars: ${highRatings}`]
				: [],
		cons:
			lowRatings > 0
				? [`Ratings between one and two stars: ${lowRatings}`]
				: [],
		sentiment,
	};
}

export function buildRussianReviewSummaryFallback(
	reviews: ReviewRating[],
): ReviewSummaryText {
	const count = reviews.length;
	const average =
		count > 0
			? reviews.reduce((total, review) => total + review.rating, 0) / count
			: 0;
	const highRatings = reviews.filter((review) => review.rating >= 4).length;
	const lowRatings = reviews.filter((review) => review.rating <= 2).length;
	const sentiment =
		average >= 4 ? "positive" : average <= 2.5 ? "negative" : "mixed";
	const tone = {
		positive: "Пользователи в целом оценивают плагин положительно.",
		mixed: "Оценки пользователей заметно различаются.",
		negative: "В оценках преобладает негативный опыт.",
	}[sentiment];

	return {
		verdict: `Средняя оценка — ${average.toFixed(1)} из 5 по ${count} ${reviewWord(count)}. ${tone}`,
		pros:
			highRatings > 0
				? [`Высоких оценок, от четырёх до пяти звёзд: ${highRatings}`]
				: [],
		cons:
			lowRatings > 0
				? [`Низких оценок, от одной до двух звёзд: ${lowRatings}`]
				: [],
		sentiment,
	};
}
