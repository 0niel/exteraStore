export interface PluginInsightText {
	summary: string;
	bestFor: string[];
	requirements: string[];
	caveats: string[];
	privacyReason: string;
}

const CYRILLIC_TEXT = /[а-яё]/i;

export function isRussianPluginInsight(insight: PluginInsightText): boolean {
	return [
		insight.summary,
		...insight.bestFor,
		...insight.requirements,
		...insight.caveats,
		insight.privacyReason,
	].every((text) => CYRILLIC_TEXT.test(text));
}
