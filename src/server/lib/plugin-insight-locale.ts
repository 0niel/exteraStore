export interface PluginInsightText {
	summary: string;
	bestFor: string[];
	requirements: string[];
	caveats: string[];
	privacyReason: string;
}

const CYRILLIC_TEXT = /[а-яё]/i;
const ENGLISH_REQUIREMENT_PROSE =
	/\b(?:and|or|higher|lower|requires?|connection|internet|may|not|work|with|all|devices?|support|installed|version)\b/i;

function isLocalizedRequirement(text: string): boolean {
	return CYRILLIC_TEXT.test(text) || !ENGLISH_REQUIREMENT_PROSE.test(text);
}

export function isRussianPluginInsight(insight: PluginInsightText): boolean {
	const explanatoryText = [
		insight.summary,
		...insight.bestFor,
		...insight.caveats,
		insight.privacyReason,
	];

	return (
		explanatoryText.every((text) => CYRILLIC_TEXT.test(text)) &&
		insight.requirements.every(isLocalizedRequirement)
	);
}
