export const SITE_URL = "https://exterastore.app";
export const SITE_NAME = "exteraStore";
export const SITE_DESCRIPTION =
	"Независимый каталог плагинов для exteraGram и exteraless: находите, проверяйте и публикуйте дополнения для Telegram.";
export const OPEN_GRAPH_IMAGE = `${SITE_URL}/opengraph-image`;
export const TWITTER_IMAGE = `${SITE_URL}/twitter-image`;

export function absoluteUrl(path = "/") {
	return new URL(path, SITE_URL).toString();
}

export function seoDescription(value: string | null | undefined, limit = 160) {
	const normalized = (value ?? "")
		.replace(/<[^>]*>/g, " ")
		.replace(/[`*_>#[\]()~-]/g, " ")
		.replace(/https?:\/\/\S+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	if (normalized.length <= limit) return normalized;
	return `${normalized.slice(0, limit - 1).trimEnd()}…`;
}
