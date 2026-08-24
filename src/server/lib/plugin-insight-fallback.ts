export interface PluginInsightFallback {
	verdict: "recommended" | "conditional" | "specialized";
	summary: string;
	bestFor: string[];
	requirements: string[];
	caveats: string[];
	privacy: "low" | "medium" | "high" | "unknown";
	privacyReason: string;
	setupComplexity: "simple" | "moderate" | "advanced";
}

function parseDeclaredRequirements(value: string | null): string[] {
	if (!value?.trim()) return [];

	const parsed = (() => {
		try {
			return JSON.parse(value) as unknown;
		} catch {
			return null;
		}
	})();
	if (Array.isArray(parsed)) {
		return parsed
			.filter((item): item is string => typeof item === "string")
			.map((item) => item.trim())
			.filter(Boolean)
			.slice(0, 4);
	}

	return value
		.split(/\n|;/)
		.map((item) => item.trim())
		.filter(Boolean)
		.slice(0, 4);
}

function localizeRussianRequirement(requirement: string): string | null {
	const normalized = requirement.trim();
	if (!normalized) return null;
	if (/[а-яё]/i.test(normalized)) return normalized;
	if (/^requires? internet connection$/i.test(normalized)) {
		return "Требуется подключение к интернету";
	}
	if (/^may not work with all devices$/i.test(normalized)) {
		return "Совместимость со всеми устройствами не гарантирована";
	}
	const versionMatch = normalized.match(
		/^(Android|Telegram|exteraGram|exteraless)\s+(.+?)\s+or higher$/i,
	);
	if (versionMatch?.[1] && versionMatch[2]) {
		return `${versionMatch[1]} ${versionMatch[2]} или новее`;
	}
	if (!/\b[a-z]{3,}\b/i.test(normalized)) return normalized;
	return null;
}

export function buildFallbackPluginInsight(
	plugin: {
		name: string;
		category: string;
		description: string;
		shortDescription: string | null;
		requirements: string | null;
		minExteraVersion: string | null;
		exteralessCompatible?: boolean | null;
		minExteralessVersion?: string | null;
	},
	locale: "en" | "ru",
): PluginInsightFallback {
	const declaredRequirements = parseDeclaredRequirements(plugin.requirements);
	const conciseDescription = (
		plugin.shortDescription?.trim() || plugin.description.trim()
	).replace(/[.!?]+$/, "");

	if (locale === "en") {
		return {
			verdict: "specialized",
			summary: conciseDescription
				? `“${plugin.name}” ${conciseDescription.charAt(0).toLowerCase()}${conciseDescription.slice(1)}. The detailed automated analysis is temporarily unavailable, so verify the declared requirements before installing.`
				: `“${plugin.name}” is a plugin in the “${plugin.category}” category. The detailed automated analysis is temporarily unavailable, so compare the author description and declared requirements with your use case before installing.`,
			bestFor: [
				`People looking for features in the “${plugin.category}” category`,
				"Users prepared to verify compatibility before installation",
			],
			requirements: [
				...(plugin.minExteraVersion
					? [`exteraGram ${plugin.minExteraVersion} or newer`]
					: []),
				...(plugin.exteralessCompatible
					? [
							plugin.minExteralessVersion
								? `exteraless ${plugin.minExteralessVersion} or newer`
								: "Compatible with exteraless",
						]
					: []),
				...declaredRequirements,
			].slice(0, 5),
			caveats: [
				"Detailed automated code analysis is temporarily unavailable",
				...(declaredRequirements.length === 0
					? ["The author did not provide explicit technical requirements"]
					: []),
			],
			privacy: "unknown",
			privacyReason:
				"The available metadata is insufficient for a reliable privacy assessment. Review the source code and requested permissions before installation.",
			setupComplexity: "moderate",
		};
	}

	const localizedRequirements = declaredRequirements
		.map(localizeRussianRequirement)
		.filter((item): item is string => Boolean(item));
	const russianDescription = /[а-яё]/i.test(conciseDescription)
		? conciseDescription
		: null;

	return {
		verdict: "specialized",
		summary: russianDescription
			? `«${plugin.name}» ${russianDescription.charAt(0).toLowerCase()}${russianDescription.slice(1)}. Подробный автоматический разбор временно недоступен, поэтому перед установкой проверьте заявленные требования.`
			: `«${plugin.name}» — плагин из каталога exteraStore. Подробный автоматический разбор временно недоступен, поэтому перед установкой сопоставьте описание автора и заявленные требования со своим сценарием.`,
		bestFor: [
			russianDescription
				? `Тем, кому нужна заявленная функция: ${russianDescription}`
				: "Тем, кому подходит назначение из описания автора",
			"Пользователям, готовым проверить совместимость перед установкой",
		],
		requirements: [
			...(plugin.minExteraVersion
				? [`exteraGram ${plugin.minExteraVersion} или новее`]
				: []),
			...(plugin.exteralessCompatible
				? [
						plugin.minExteralessVersion
							? `exteraless ${plugin.minExteralessVersion} или новее`
							: "Совместим с exteraless",
					]
				: []),
			...localizedRequirements,
		].slice(0, 5),
		caveats: [
			"Подробный автоматический разбор кода временно недоступен",
			...(declaredRequirements.length === 0
				? ["Автор не указал явные технические требования"]
				: []),
		],
		privacy: "unknown",
		privacyReason:
			"Доступных метаданных недостаточно для надёжной оценки приватности. Перед установкой проверьте исходный код и запрашиваемые разрешения.",
		setupComplexity: "moderate",
	};
}
