import { z } from "zod";
import { generateAIObject, generateAIText } from "~/server/lib/ai-client";

const CHUNK_SIZE = 90_000;
const CHUNK_OVERLAP = 4_000;

export type AILocale = "en" | "ru";

const CheckResultSchema = z.object({
	status: z.enum(["safe", "warning", "danger"]),
	classification: z.enum(["safe", "potentially_unsafe", "unsafe", "critical"]),
	shortDescription: z.string().max(200),
	issues: z
		.array(
			z.object({
				type: z.string().max(100),
				severity: z.enum(["low", "medium", "high", "critical"]),
				description: z.string().max(1_000),
				recommendation: z.string().max(1_000),
			}),
		)
		.max(50),
});

const AICollectionResultSchema = z.object({
	collectionName: z.string().max(120),
	collectionDescription: z.string().max(1_000),
	pluginIds: z.array(z.number().int().positive()).max(20),
});

type CheckResult = z.infer<typeof CheckResultSchema>;
type AICollectionResult = z.infer<typeof AICollectionResultSchema>;

export type CheckType = "security" | "performance";

export type CheckPrompt = {
	instructions: string;
	prompt: string;
};

export type CheckPromptInput = {
	name: string;
	description?: string | null;
	category?: string | null;
	version?: string | null;
	code: string;
	locale?: AILocale;
};

export type ParsedCheckResult = {
	status: "passed" | "failed";
	classification: CheckResult["classification"];
	score: number;
	shortDescription: string;
	details: string;
};

const RESPONSE_FORMAT_DIRECTIVE = `Верни ровно один JSON-объект без markdown-обёртки, без комментариев и без текста вокруг:
{"status":"safe|warning|danger","classification":"safe|potentially_unsafe|unsafe|critical","shortDescription":"не длиннее 200 символов","issues":[{"type":"не длиннее 100 символов","severity":"low|medium|high|critical","description":"не длиннее 1000 символов","recommendation":"не длиннее 1000 символов"}]}
Если проблем нет, верни пустой массив issues.`;

export function languageDirective(locale: AILocale): string {
	return locale === "en"
		? "Write every user-facing text in English."
		: "Пиши весь текст для пользователя на русском языке.";
}

function securityInstructions(locale: AILocale) {
	return `Ты эксперт по безопасности плагинов ExteraGram. Анализируй код кратко и точно.

Безопасными считаются официальные API ExteraGram: client_utils, TLRPC через send_request, HookStrategy, HookResult, AlertDialogBuilder, BulletinHelper, android_utils, запросы к GitHub и файлы в папке плагина или кеше.

Критические признаки: eval, exec, os.system, кража или отправка паролей и токенов.
Опасные признаки: неизвестные HTTP-серверы, доступ к SMS и контактам.
Не придумывай поведение, которого нет в предоставленном фрагменте. ${languageDirective(locale)}`;
}

function performanceInstructions(locale: AILocale) {
	return `Ты эксперт по производительности плагинов ExteraGram. Ищи бесконечные циклы, утечки памяти, блокировку UI, алгоритмы O(n²) и хуже, загрузку больших файлов целиком в память. Не придумывай поведение, которого нет в предоставленном фрагменте. Отвечай кратко. ${languageDirective(locale)}`;
}

function checkInstructions(checkType: CheckType, locale: AILocale) {
	return checkType === "security"
		? securityInstructions(locale)
		: performanceInstructions(locale);
}

function checkTask(checkType: CheckType) {
	return checkType === "security"
		? "Проанализируй безопасность этого фрагмента."
		: "Проанализируй производительность этого фрагмента.";
}

function splitCode(code: string): string[] {
	if (code.length <= CHUNK_SIZE) {
		return [code];
	}

	const chunks: string[] = [];
	let start = 0;

	while (start < code.length) {
		let end = Math.min(start + CHUNK_SIZE, code.length);
		if (end < code.length) {
			const newline = code.lastIndexOf("\n", end);
			if (newline >= start + CHUNK_SIZE - 10_000) {
				end = newline + 1;
			}
		}

		chunks.push(code.slice(start, end));
		if (end === code.length) {
			break;
		}
		start = end - CHUNK_OVERLAP;
	}

	return chunks;
}

function mergeChunkResults(
	results: CheckResult[],
	locale: AILocale,
): CheckResult {
	const [onlyResult] = results;
	if (results.length === 1 && onlyResult) {
		return onlyResult;
	}

	const issues = results.flatMap((result) => result.issues);
	const statuses = results.map((result) => result.status);
	const classifications = results.map((result) => result.classification);

	const classification: CheckResult["classification"] =
		classifications.includes("critical")
			? "critical"
			: classifications.includes("unsafe")
				? "unsafe"
				: classifications.includes("potentially_unsafe")
					? "potentially_unsafe"
					: "safe";

	const status: CheckResult["status"] = statuses.includes("danger")
		? "danger"
		: statuses.includes("warning")
			? "warning"
			: "safe";

	return {
		status,
		classification,
		shortDescription:
			locale === "en"
				? `Analyzed ${results.length} chunks. Issues found: ${issues.length}.`
				: `Проанализировано ${results.length} частей. Найдено проблем: ${issues.length}.`,
		issues: issues.slice(0, 20),
	};
}

function scoreFor(result: CheckResult) {
	return result.status === "safe" ? 90 : result.status === "warning" ? 60 : 20;
}

export function buildCheckPrompts(
	checkType: CheckType,
	input: CheckPromptInput,
): CheckPrompt[] {
	const locale = input.locale ?? "ru";
	const instructions = `${checkInstructions(checkType, locale)}\n\n${RESPONSE_FORMAT_DIRECTIVE}`;
	const task = checkTask(checkType);
	const chunks = splitCode(input.code);

	const meta = [
		`Плагин: ${input.name}`,
		input.version ? `Version: ${input.version}` : null,
		input.category ? `Категория: ${input.category}` : null,
		input.description ? `Описание: ${input.description.slice(0, 2_000)}` : null,
	].filter((line): line is string => line !== null);

	return chunks.map((chunk, index) => ({
		instructions,
		prompt: `${meta.join("\n")}\nФрагмент ${index + 1} из ${chunks.length}\n\n${task}\n\nКод:\n${chunk}`,
	}));
}

function extractJsonObject(raw: string): unknown {
	const trimmed = raw.trim();
	const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
	const body = (fenced?.[1] ?? trimmed).trim();

	try {
		return JSON.parse(body);
	} catch {
		const start = body.indexOf("{");
		const end = body.lastIndexOf("}");
		if (start === -1 || end <= start) {
			throw new Error("AI response does not contain a JSON object");
		}
		return JSON.parse(body.slice(start, end + 1));
	}
}

export function parseCheckResults(
	checkType: CheckType,
	rawResponses: string[],
	locale: AILocale = "ru",
): ParsedCheckResult {
	if (rawResponses.length === 0) {
		throw new Error(`No ${checkType} responses to parse`);
	}

	const results = rawResponses.map((raw) =>
		CheckResultSchema.parse(extractJsonObject(raw)),
	);
	const details = mergeChunkResults(results, locale);
	const score = scoreFor(details);

	return {
		status: score >= 70 ? "passed" : "failed",
		classification: details.classification,
		score,
		shortDescription: details.shortDescription,
		details: JSON.stringify(details),
	};
}

export class PluginAIChecker {
	private getTextImprovementPrompt(
		textType: "description" | "changelog",
		locale: AILocale,
	): string {
		if (textType === "description") {
			return `Улучши описание плагина ExteraGram: сделай его привлекательным, информативным и технически точным, используй Markdown, заголовки и списки уместно. Верни только улучшенный текст. ${languageDirective(locale)}`;
		}

		return `Улучши changelog плагина ExteraGram: сделай изменения конкретными и понятными, сгруппируй их по типам, используй Markdown. Верни только улучшенный текст. ${languageDirective(locale)}`;
	}

	private getAICollectionPrompt(locale: AILocale) {
		return `Создай полезную тематическую подборку из 8–12 одобренных плагинов для exteraGram и exteraless. Поле exteralessCompatible показывает подтверждённую совместимость с exteraless. Не называй несовместимый или непроверенный плагин подходящим для exteraless. Выбирай только идентификаторы из предоставленного списка, учитывай релевантность, качество, популярность и разнообразие. ${languageDirective(locale)} Название и описание подборки должны быть на этом языке.`;
	}

	async generateAICollection(
		allPlugins: {
			id: number;
			name: string;
			shortDescription: string | null;
			category: string;
			tags: string | null;
			rating: number;
			downloadCount: number;
			exteralessCompatible: boolean | null;
		}[],
		theme: string,
		locale: AILocale = "ru",
	): Promise<AICollectionResult> {
		const result = await generateAIObject(
			AICollectionResultSchema,
			this.getAICollectionPrompt(locale),
			`Тема: ${theme}\n\nДоступные плагины:\n${JSON.stringify(allPlugins)}`,
		);
		const validIds = new Set(allPlugins.map((plugin) => plugin.id));
		const pluginIds = [...new Set(result.pluginIds)].filter((id) =>
			validIds.has(id),
		);

		if (pluginIds.length === 0) {
			throw new Error("AI did not select any valid plugins");
		}

		return { ...result, pluginIds };
	}

	async improveText(
		text: string,
		textType: "description" | "changelog",
		pluginName?: string,
		locale: AILocale = "ru",
	): Promise<{ improvedText: string }> {
		const improvedText = await generateAIText(
			this.getTextImprovementPrompt(textType, locale),
			`${pluginName ? `Плагин: ${pluginName}\n\n` : ""}Исходный текст:\n${text}`,
		);

		return { improvedText };
	}

	async checkSecurity(
		pluginCode: string,
		pluginName: string,
		locale: AILocale = "ru",
	): Promise<{ score: number; details: CheckResult; issues: string[] }> {
		return this.runCheck("security", pluginCode, pluginName, locale);
	}

	async checkPerformance(
		pluginCode: string,
		pluginName: string,
		locale: AILocale = "ru",
	): Promise<{ score: number; details: CheckResult; issues: string[] }> {
		return this.runCheck("performance", pluginCode, pluginName, locale);
	}

	private async runCheck(
		checkType: CheckType,
		pluginCode: string,
		pluginName: string,
		locale: AILocale,
	) {
		const prompts = buildCheckPrompts(checkType, {
			name: pluginName,
			code: pluginCode,
			locale,
		});
		const results: CheckResult[] = [];

		for (const { instructions, prompt } of prompts) {
			const result = await generateAIObject(
				CheckResultSchema,
				instructions,
				prompt,
			);
			results.push(result);
		}

		const details = mergeChunkResults(results, locale);
		return {
			score: scoreFor(details),
			details,
			issues: details.issues.map((issue) => issue.description),
		};
	}

	cleanup() {}
}
