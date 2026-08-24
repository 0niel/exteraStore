export function normalizeDiscoveryTags(tags: string[]) {
	return [
		...new Set(
			tags
				.map((tag) =>
					tag
						.trim()
						.toLowerCase()
						.replace(/^#+/, "")
						.replace(/\s+/g, "-")
						.replace(/[^\p{L}\p{N}-]/gu, "")
						.replace(/-{2,}/g, "-")
						.replace(/^-|-$/g, ""),
				)
				.filter((tag) => tag.length >= 2 && tag.length <= 40),
		),
	].slice(0, 6);
}

type MetadataPlugin = {
	name: string;
	description: string;
	shortDescription: string | null;
	category: string;
	tags: string | null;
};

const CATEGORY_RULES = [
	{
		slug: "security",
		terms: [
			"безопас",
			"security",
			"шифр",
			"encrypt",
			"парол",
			"password",
			"firewall",
			"защит",
		],
	},
	{
		slug: "privacy",
		terms: [
			"приват",
			"privacy",
			"аноним",
			"anonymous",
			"скры",
			"невидим",
			"read status",
			"typing status",
		],
	},
	{
		slug: "stickers",
		terms: ["стикер", "sticker", "эмодзи", "emoji", "реакци", "reaction"],
	},
	{
		slug: "media",
		terms: [
			"фото",
			"photo",
			"image",
			"изображ",
			"видео",
			"video",
			"аудио",
			"audio",
			"голосов",
			"voice",
			"файл",
			"скачив",
			"download",
		],
	},
	{
		slug: "automation",
		terms: [
			"автомат",
			"automation",
			"auto reply",
			"автоответ",
			"бот",
			"bot",
			"сценари",
			"script",
			"расписан",
		],
	},
	{
		slug: "development",
		terms: [
			"разработ",
			"developer",
			"debug",
			"отлад",
			"лог",
			"inspect",
			"исходн",
			"source code",
			"terminal",
		],
	},
	{
		slug: "integrations",
		terms: [
			"интеграц",
			"integration",
			"github",
			"spotify",
			"youtube",
			"tiktok",
			"вконтакте",
			"external service",
			"api",
			"webhook",
		],
	},
	{
		slug: "ui",
		terms: [
			"интерфейс",
			"interface",
			"тем",
			"theme",
			"шрифт",
			"font",
			"цвет",
			"icon",
			"оформлен",
			"layout",
		],
	},
	{
		slug: "customization",
		terms: [
			"кастом",
			"custom",
			"настрой",
			"поведен",
			"behavior",
			"жест",
			"gesture",
			"кнопк",
			"меню",
		],
	},
	{
		slug: "productivity",
		terms: [
			"продуктив",
			"productivity",
			"перевод",
			"translate",
			"поиск",
			"search",
			"замет",
			"note",
			"напомин",
			"folder",
			"текст",
		],
	},
	{
		slug: "fun",
		terms: [
			"игр",
			"game",
			"мем",
			"meme",
			"tetris",
			"шутк",
			"joke",
			"развлеч",
			"fun",
		],
	},
	{
		slug: "utility",
		terms: [
			"утилит",
			"utility",
			"конверт",
			"converter",
			"калькулятор",
			"calculator",
			"qr",
			"погода",
			"weather",
			"инструмент",
		],
	},
] as const;

const CATEGORY_TAGS: Record<string, string[]> = {
	ui: ["интерфейс", "оформление", "дизайн"],
	utility: ["утилиты", "инструменты", "telegram"],
	security: ["безопасность", "защита", "аккаунт"],
	privacy: ["приватность", "анонимность", "контроль-данных"],
	automation: ["автоматизация", "сценарии", "автоответы"],
	productivity: ["продуктивность", "сообщения", "рабочий-процесс"],
	media: ["медиа", "файлы", "контент"],
	stickers: ["стикеры", "эмодзи", "реакции"],
	customization: ["кастомизация", "настройки", "поведение"],
	integrations: ["интеграции", "сервисы", "api"],
	development: ["разработка", "отладка", "инструменты"],
	fun: ["развлечения", "игры", "мемы"],
};

function readTags(value: string | null) {
	if (!value) {
		return [];
	}
	try {
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed)
			? parsed.filter((tag): tag is string => typeof tag === "string")
			: [];
	} catch {
		return [];
	}
}

export function buildFallbackPluginMetadata(
	plugin: MetadataPlugin,
	validCategories: Set<string>,
) {
	const existingTags = readTags(plugin.tags);
	const text = [
		plugin.name,
		plugin.shortDescription,
		plugin.description,
		...existingTags,
	]
		.join(" ")
		.toLocaleLowerCase("ru");
	const scores = CATEGORY_RULES.map((rule) => ({
		slug: rule.slug,
		score: rule.terms.reduce(
			(total, term) => total + (text.includes(term) ? 1 : 0),
			0,
		),
	})).filter((result) => validCategories.has(result.slug));
	const best = scores.sort((left, right) => right.score - left.score)[0];
	const category =
		best && best.score > 0
			? best.slug
			: validCategories.has(plugin.category)
				? plugin.category
				: validCategories.has("utility")
					? "utility"
					: [...validCategories][0];

	if (!category) {
		throw new Error("В каталоге нет доступной категории");
	}

	const matchedTags = CATEGORY_RULES.flatMap((rule) =>
		rule.terms.filter((term) => text.includes(term)),
	);
	const tags = normalizeDiscoveryTags([
		...(CATEGORY_TAGS[category] ?? [category, "telegram", "плагин"]),
		...matchedTags,
		...existingTags,
	]);

	return { category, tags };
}
