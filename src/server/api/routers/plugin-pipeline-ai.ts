import { z } from "zod";
import { generateAIObject, generateAIText } from "~/server/lib/ai-client";

const CHUNK_SIZE = 90_000;
const CHUNK_OVERLAP = 4_000;

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

function mergeChunkResults(results: CheckResult[]): CheckResult {
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
		shortDescription: `Проанализировано ${results.length} частей. Найдено проблем: ${issues.length}.`,
		issues: issues.slice(0, 20),
	};
}

function scoreFor(result: CheckResult) {
	return result.status === "safe" ? 90 : result.status === "warning" ? 60 : 20;
}

export class PluginAIChecker {
	private getSecurityPrompt() {
		return `Ты эксперт по безопасности плагинов ExteraGram. Анализируй код кратко и точно.

Безопасными считаются официальные API ExteraGram: client_utils, TLRPC через send_request, HookStrategy, HookResult, AlertDialogBuilder, BulletinHelper, android_utils, запросы к GitHub и файлы в папке плагина или кеше.

Критические признаки: eval, exec, os.system, кража или отправка паролей и токенов.
Опасные признаки: неизвестные HTTP-серверы, доступ к SMS и контактам.
Не придумывай поведение, которого нет в предоставленном фрагменте. Отвечай на русском языке.`;
	}

	private getPerformancePrompt() {
		return `Ты эксперт по производительности плагинов ExteraGram. Ищи бесконечные циклы, утечки памяти, блокировку UI, алгоритмы O(n²) и хуже, загрузку больших файлов целиком в память. Не придумывай поведение, которого нет в предоставленном фрагменте. Отвечай кратко на русском языке.`;
	}

	private getTextImprovementPrompt(
		textType: "description" | "changelog",
	): string {
		if (textType === "description") {
			return `Улучши описание плагина ExteraGram: сделай его привлекательным, информативным и технически точным, используй Markdown, заголовки и списки уместно. Верни только улучшенный текст на русском языке.`;
		}

		return `Улучши changelog плагина ExteraGram: сделай изменения конкретными и понятными, сгруппируй их по типам, используй Markdown. Верни только улучшенный текст на русском языке.`;
	}

	private getAICollectionPrompt() {
		return `Создай полезную тематическую подборку из 8–12 одобренных плагинов ExteraGram. Выбирай только идентификаторы из предоставленного списка, учитывай релевантность, качество, популярность и разнообразие. Название и описание должны быть на русском языке.`;
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
		}[],
		theme: string,
	): Promise<AICollectionResult> {
		const result = await generateAIObject(
			AICollectionResultSchema,
			this.getAICollectionPrompt(),
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
	): Promise<{ improvedText: string }> {
		const improvedText = await generateAIText(
			this.getTextImprovementPrompt(textType),
			`${pluginName ? `Плагин: ${pluginName}\n\n` : ""}Исходный текст:\n${text}`,
		);

		return { improvedText };
	}

	async checkSecurity(
		pluginCode: string,
		pluginName: string,
	): Promise<{ score: number; details: CheckResult; issues: string[] }> {
		return this.runCheck(
			pluginCode,
			pluginName,
			this.getSecurityPrompt(),
			"Проанализируй безопасность этого фрагмента.",
		);
	}

	async checkPerformance(
		pluginCode: string,
		pluginName: string,
	): Promise<{ score: number; details: CheckResult; issues: string[] }> {
		return this.runCheck(
			pluginCode,
			pluginName,
			this.getPerformancePrompt(),
			"Проанализируй производительность этого фрагмента.",
		);
	}

	private async runCheck(
		pluginCode: string,
		pluginName: string,
		instructions: string,
		task: string,
	) {
		const chunks = splitCode(pluginCode);
		const results: CheckResult[] = [];

		for (const [index, chunk] of chunks.entries()) {
			const result = await generateAIObject(
				CheckResultSchema,
				instructions,
				`Плагин: ${pluginName}\nФрагмент ${index + 1} из ${chunks.length}\n\n${task}\n\nКод:\n${chunk}`,
			);
			results.push(result);
		}

		const details = mergeChunkResults(results);
		return {
			score: scoreFor(details),
			details,
			issues: details.issues.map((issue) => issue.description),
		};
	}

	cleanup() {}
}
