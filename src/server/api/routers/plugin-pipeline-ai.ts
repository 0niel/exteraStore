import { Document } from "@langchain/core/documents";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { z } from "zod";

const CheckResultSchema = z.object({
	status: z.enum(["safe", "warning", "danger"]),
	classification: z.enum(["safe", "potentially_unsafe", "unsafe", "critical"]),
	shortDescription: z.string().max(200),
	issues: z.array(
		z.object({
			type: z.string(),
			severity: z.enum(["low", "medium", "high", "critical"]),
			description: z.string(),
			recommendation: z.string(),
		}),
	),
});

const AICollectionResultSchema = z.object({
	collectionName: z.string(),
	collectionDescription: z.string(),
	pluginIds: z.array(z.number()),
});

type CheckResult = z.infer<typeof CheckResultSchema>;
type AICollectionResult = z.infer<typeof AICollectionResultSchema>;

export class PluginAIChecker {
	private gemini: ChatOpenAI;
	private textSplitter: RecursiveCharacterTextSplitter;

	constructor() {
		const openRouterApiKey =
			process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

		console.log(
			"[PluginAIChecker] Initializing with API key:",
			openRouterApiKey ? "✓ Found" : "✗ Missing",
		);
		console.log("[PluginAIChecker] Using model: google/gemini-2.5-pro");
		console.log("[PluginAIChecker] Base URL:", "https://openrouter.ai/api/v1");

		this.gemini = new ChatOpenAI({
			modelName: "google/gemini-2.5-pro",
			temperature: 0.1,
			openAIApiKey: openRouterApiKey,
			configuration: {
				baseURL: "https://openrouter.ai/api/v1",
				defaultHeaders: {
					"HTTP-Referer": process.env.NEXTAUTH_URL || "https://exterastore.app",
					"X-Title": "exteraGram Plugin Store",
				},
			},
		});

		this.textSplitter = new RecursiveCharacterTextSplitter({
			chunkSize: 500000,
			chunkOverlap: 10000,
			separators: ["\nclass ", "\ndef ", "\n\n", "\n", " ", ""],
		});

		console.log("[PluginAIChecker] Initialized successfully");
	}

	private async splitLargeCode(code: string): Promise<Document[]> {
		console.log(`[PluginAIChecker] Code size: ${code.length} characters`);

		if (code.length < 1000000) {
			console.log(
				"[PluginAIChecker] Code is small enough, processing as single chunk",
			);
			return [new Document({ pageContent: code })];
		}

		console.log("[PluginAIChecker] Code is large, splitting into chunks...");
		const chunks = await this.textSplitter.createDocuments([code]);
		console.log(`[PluginAIChecker] Split into ${chunks.length} chunks`);
		chunks.forEach((chunk, index) => {
			console.log(
				`[PluginAIChecker] Chunk ${index + 1}: ${chunk.pageContent.length} characters`,
			);
		});

		return chunks;
	}

	private getSecurityPrompt(): string {
		return `Ты эксперт по безопасности плагинов ExteraGram. Анализируй код КРАТКО и точно.

БЕЗОПАСНЫЕ ПРАКТИКИ ExteraGram (НЕ считай угрозой):
• client_utils: send_message, get_user, get_messages_controller
• TLRPC объекты через send_request
• HookStrategy, HookResult для перехвата вызовов
• AlertDialogBuilder, BulletinHelper для UI
• android_utils: runOnUIThread, addToClipboard
• requests/http к GitHub, известным доменам
• Файлы в /Download/[plugin_folder]/ или кеш приложения

ПРОВЕРЯЙ:
🔴 КРИТИЧНО: eval(), exec(), os.system(), отправка паролей/токенов
🟡 ОСТОРОЖНО: Неизвестные HTTP серверы, доступ к SMS/контактам
🟢 БЕЗОПАСНО: Только официальные API ExteraGram

Формат ответа:
{
  "status": "safe|warning|danger",
  "classification": "safe|potentially_unsafe|unsafe|critical", 
  "shortDescription": "Краткое описание (макс 200 символов)",
  "issues": [{"type": "тип", "severity": "low|medium|high|critical", "description": "описание", "recommendation": "решение"}]
}`;
	}

	private getPerformancePrompt(): string {
		return `Анализируй производительность плагина ExteraGram КРАТКО.

ИЩИ:
🔴 КРИТИЧНО: Бесконечные циклы, утечки памяти, блокировка UI
🟡 ВНИМАНИЕ: Неэффективные алгоритмы O(n²)+, большие файлы в память
🟢 НОРМАЛЬНО: Стандартные операции, небольшие циклы

Формат:
{
  "status": "safe|warning|danger",
  "classification": "safe|potentially_unsafe|unsafe|critical",
  "shortDescription": "Оценка производительности (макс 200 символов)",
  "issues": [{"type": "тип", "severity": "low|medium|high|critical", "description": "описание", "recommendation": "решение"}]
}`;
	}

	private getTextImprovementPrompt(textType: "description" | "changelog"): string {
		if (textType === "description") {
			return `Ты эксперт по написанию описаний плагинов для exteraGram. Улучши описание плагина:

ЦЕЛИ:
• Сделай текст более привлекательным и информативным
• Подчеркни ключевые возможности и преимущества
• Сохрани техническую точность
• Используй активный залог и живой язык
• Добавь эмодзи для лучшего восприятия
• Структурируй информацию с помощью заголовков и списков

ФОРМАТ ОТВЕТА:
Верни только улучшенный текст в формате Markdown. Не добавляй пояснений или комментариев.`;
		} else {
			return `Ты эксперт по написанию changelog для плагинов exteraGram. Улучши список изменений:

ЦЕЛИ:
• Сделай изменения более понятными для пользователей
• Группируй изменения по типам: ✨ Новое, 🔧 Исправления, 💥 Критические изменения
• Используй активный залог
• Добавь эмодзи для категоризации изменений
• Сделай описания конкретными и полезными

ФОРМАТ ОТВЕТА:
Верни только улучшенный changelog в формате Markdown. Не добавляй пояснений или комментариев.`;
		}
	}

	private getAICollectionPrompt(): string {
		return `Ты — эксперт по плагинам для Telegram и exteraGram. Твоя задача — создавать интересные и полезные подборки плагинов.
Тебе будет предоставлен список всех доступных плагинов в формате JSON и тема для подборки.

Твои действия:
1.  **Внимательно изучи тему подборки.** Пойми, какие плагины будут наиболее релевантны.
2.  **Проанализируй список плагинов.** Обрати внимание на название, описание, категорию и теги каждого плагина.
3.  **Выбери 8-12 наиболее подходящих плагинов.** Не добавляй больше, чтобы подборка была сфокусированной.
4.  **Придумай креативное и привлекательное название для подборки**, соответствующее теме.
5.  **Напиши краткое, но ёмкое описание для подборки (2-3 предложения).** Оно должно объяснять, почему эти плагины вместе и какую пользу они принесут.
6.  **Верни результат в строго заданном формате JSON.**

Критерии отбора плагинов:
*   **Релевантность теме:** Плагин должен максимально соответствовать теме подборки.
*   **Качество и популярность:** Отдавай предпочтение плагинам с хорошим рейтингом и количеством загрузок, но не бойся включать новые и перспективные.
*   **Разнообразие:** Постарайся сделать подборку разнообразной, чтобы она не состояла из однотипных плагинов.

ЗАПРЕЩЕНО:
*   Возвращать плагины, которых нет в предоставленном списке.
*   Возвращать более 15 или менее 5 плагинов.
*   Отвечать что-либо, кроме JSON объекта.

Формат ответа (строго JSON):
{
	 "collectionName": "Название твоей подборки",
	 "collectionDescription": "Описание твоей подборки.",
	 "pluginIds": [1, 2, 3, 4, 5, 6, 7, 8]
}`;
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
		console.log(
			`[PluginAIChecker] Starting AI collection generation for theme: "${theme}"`,
		);

		try {
			const messages = [
				new SystemMessage(this.getAICollectionPrompt()),
				new HumanMessage(`Сгенерируй подборку плагинов на тему "${theme}".

Вот список всех доступных плагинов:
\`\`\`json
${JSON.stringify(allPlugins, null, 2)}
\`\`\`

Верни результат в формате JSON. Отвечай только на русском языке.`),
			];

			console.log(
				`[PluginAIChecker] Sending collection generation request to Gemini`,
			);

			const startTime = Date.now();
			const response = await this.gemini.invoke(messages);
			const duration = Date.now() - startTime;

			console.log(
				`[PluginAIChecker] Received collection response in ${duration}ms`,
			);

			const content = response.content.toString();
			const jsonMatch = content.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error("No JSON found in AI response for collection");
			}

			const parsedJson = JSON.parse(jsonMatch[0]);
			const result = AICollectionResultSchema.parse(parsedJson);

			console.log(
				`[PluginAIChecker] Collection generation completed for theme "${theme}". Found ${result.pluginIds.length} plugins.`,
			);

			return result;
		} catch (error) {
			console.error(
				`[PluginAIChecker] Failed to generate AI collection for theme "${theme}":`,
				error,
			);
			throw new Error(
				`Не удалось сгенерировать подборку: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
			);
		}
	}

	async improveText(
		text: string,
		textType: "description" | "changelog",
		pluginName?: string,
	): Promise<{ improvedText: string }> {
		console.log(
			`[PluginAIChecker] Starting text improvement for ${textType}: ${text.length} characters`,
		);

		try {
			const messages = [
				new SystemMessage(this.getTextImprovementPrompt(textType)),
				new HumanMessage(`${pluginName ? `Плагин: ${pluginName}\n\n` : ""}Исходный текст:
${text}

Улучши этот текст, сделай его более привлекательным и информативным. Отвечай только на русском языке.`),
			];

			console.log(
				`[PluginAIChecker] Sending text improvement request to Gemini`,
			);

			const startTime = Date.now();
			const response = await this.gemini.invoke(messages);
			const duration = Date.now() - startTime;

			console.log(
				`[PluginAIChecker] Received text improvement response in ${duration}ms`,
			);

			const improvedText = response.content.toString().trim();

			console.log(
				`[PluginAIChecker] Text improvement completed: ${improvedText.length} characters`,
			);

			return {
				improvedText,
			};
		} catch (error) {
			console.error(
				`[PluginAIChecker] Failed to improve ${textType}:`,
				error,
			);
			throw new Error(
				`Не удалось улучшить текст: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
			);
		}
	}

	private async mergeChunkResults(
		results: CheckResult[],
	): Promise<CheckResult> {
		console.log(
			`[PluginAIChecker] Merging results from ${results.length} chunks`,
		);

		if (results.length === 1) {
			console.log("[PluginAIChecker] Only one chunk, returning as-is");
			return results[0]!;
		}

		const allIssues = results.flatMap((r) => r.issues);
		const statuses = results.map((r) => r.status);

		console.log(
			`[PluginAIChecker] Individual statuses: ${statuses.join(", ")}`,
		);
		console.log(`[PluginAIChecker] Total issues found: ${allIssues.length}`);

		const classifications = results.map((r) => r.classification);
		let finalClassification: CheckResult["classification"] = "safe";
		if (classifications.includes("critical")) finalClassification = "critical";
		else if (classifications.includes("unsafe")) finalClassification = "unsafe";
		else if (classifications.includes("potentially_unsafe"))
			finalClassification = "potentially_unsafe";

		let finalStatus: CheckResult["status"] = "safe";
		if (statuses.includes("danger")) finalStatus = "danger";
		else if (statuses.includes("warning")) finalStatus = "warning";

		console.log(
			`[PluginAIChecker] Individual classifications: ${classifications.join(", ")}`,
		);
		console.log(
			`[PluginAIChecker] Final classification: ${finalClassification}`,
		);
		console.log(`[PluginAIChecker] Final status: ${finalStatus}`);

		const finalResult = {
			status: finalStatus,
			classification: finalClassification,
			shortDescription: `Проанализировано ${results.length} частей. ${allIssues.length} проблем найдено.`,
			issues: allIssues.slice(0, 10),
		};

		console.log("[PluginAIChecker] Final merged result created");
		return finalResult;
	}

	async checkSecurity(
		pluginCode: string,
		pluginName: string,
	): Promise<{ score: number; details: CheckResult; issues: string[] }> {
		console.log(
			`[PluginAIChecker] Starting security check for plugin: ${pluginName}`,
		);

		try {
			const chunks = await this.splitLargeCode(pluginCode);
			const results: CheckResult[] = [];

			console.log(
				`[PluginAIChecker] Processing ${chunks.length} chunk(s) for security analysis`,
			);

			for (const [index, chunk] of chunks.entries()) {
				console.log(
					`[PluginAIChecker] Processing chunk ${index + 1}/${chunks.length} (${chunk.pageContent.length} chars)`,
				);

				const messages = [
					new SystemMessage(this.getSecurityPrompt()),
					new HumanMessage(`Plugin name: ${pluginName}
Part ${index + 1} of ${chunks.length}

Plugin code:
\`\`\`python
${chunk.pageContent}
\`\`\`

Проанализируй этот код и верни JSON ответ. Отвечай только на русском языке.`),
				];

				console.log(
					`[PluginAIChecker] Sending request to Gemini for chunk ${index + 1}`,
				);
				console.log(
					`[PluginAIChecker] Message length: ${messages[1]?.content?.length} characters`,
				);

				const startTime = Date.now();
				const response = await this.gemini.invoke(messages);
				const duration = Date.now() - startTime;

				console.log(
					`[PluginAIChecker] Received response from Gemini in ${duration}ms`,
				);

				const content = response.content.toString();
				console.log(
					`[PluginAIChecker] Response length: ${content.length} characters`,
				);
				console.log(
					`[PluginAIChecker] Response preview: ${content.substring(0, 200)}...`,
				);

				try {
					const jsonMatch = content.match(/\{[\s\S]*\}/);
					if (!jsonMatch) {
						console.error("[PluginAIChecker] No JSON found in response");
						console.error("[PluginAIChecker] Full response:", content);
						throw new Error("No JSON found in response");
					}

					console.log(
						`[PluginAIChecker] Found JSON in response, length: ${jsonMatch[0].length} characters`,
					);
					console.log(
						`[PluginAIChecker] JSON preview: ${jsonMatch[0].substring(0, 300)}...`,
					);

					const parsedJson = JSON.parse(jsonMatch[0]);
					console.log(
						`[PluginAIChecker] Successfully parsed JSON for chunk ${index + 1}`,
					);

					const result = CheckResultSchema.parse(parsedJson);
					console.log(
						`[PluginAIChecker] Schema validation passed for chunk ${index + 1}`,
					);
					console.log(
						`[PluginAIChecker] Result: status=${result.status}, classification=${result.classification}, issues=${result.issues.length}`,
					);

					results.push(result);
				} catch (parseError) {
					console.error(
						`[PluginAIChecker] Failed to parse LLM response for chunk ${index + 1}:`,
						parseError,
					);
					console.error(
						"[PluginAIChecker] Raw response that failed to parse:",
						content,
					);

					results.push({
						status: "danger",
						classification: "critical",
						shortDescription: "Ошибка анализа безопасности",
						issues: [
							{
								type: "analysis_error",
								severity: "high",
								description: "Не удалось проанализировать код",
								recommendation: "Повторите проверку позже",
							},
						],
					});
				}
			}

			console.log(
				`[PluginAIChecker] All chunks processed, merging results from ${results.length} chunks`,
			);
			const finalResult = await this.mergeChunkResults(results);

			console.log(
				`[PluginAIChecker] Security check completed for ${pluginName}`,
			);
			console.log(
				`[PluginAIChecker] Final result: status=${finalResult.status}, classification=${finalResult.classification}, issues=${finalResult.issues.length}`,
			);

			return {
				score:
					finalResult.status === "safe"
						? 90
						: finalResult.status === "warning"
							? 60
							: 20,
				details: finalResult,
				issues: finalResult.issues.map((i) => i.description),
			};
		} catch (error) {
			console.error(
				`[PluginAIChecker] Security check failed for ${pluginName}:`,
				error,
			);
			console.error(
				"[PluginAIChecker] Error stack:",
				error instanceof Error ? error.stack : "No stack trace",
			);

			return {
				score: 0,
				details: {
					status: "danger",
					classification: "critical",
					shortDescription: "Ошибка при проверке безопасности",
					issues: [
						{
							type: "system_error",
							severity: "critical",
							description:
								error instanceof Error ? error.message : "Unknown error",
							recommendation: "Обратитесь к администратору",
						},
					],
				},
				issues: ["Системная ошибка при проверке безопасности"],
			};
		}
	}

	async checkPerformance(
		pluginCode: string,
		pluginName: string,
	): Promise<{ score: number; details: CheckResult; issues: string[] }> {
		console.log(
			`[PluginAIChecker] Starting performance check for plugin: ${pluginName}`,
		);

		try {
			const chunks = await this.splitLargeCode(pluginCode);
			const results: CheckResult[] = [];

			console.log(
				`[PluginAIChecker] Processing ${chunks.length} chunk(s) for performance analysis`,
			);

			for (const [index, chunk] of chunks.entries()) {
				console.log(
					`[PluginAIChecker] Processing performance chunk ${index + 1}/${chunks.length}`,
				);

				const messages = [
					new SystemMessage(this.getPerformancePrompt()),
					new HumanMessage(`Plugin name: ${pluginName}
Part ${index + 1} of ${chunks.length}

Plugin code:
\`\`\`python
${chunk.pageContent}
\`\`\`

Проанализируй производительность и верни JSON ответ. Отвечай только на русском языке.`),
				];

				const startTime = Date.now();
				const response = await this.gemini.invoke(messages);
				const duration = Date.now() - startTime;

				console.log(
					`[PluginAIChecker] Performance response received in ${duration}ms`,
				);

				const content = response.content.toString();

				try {
					const jsonMatch = content.match(/\{[\s\S]*\}/);
					if (!jsonMatch) {
						console.error(
							"[PluginAIChecker] No JSON found in performance response",
						);
						throw new Error("No JSON found in response");
					}

					const parsedJson = JSON.parse(jsonMatch[0]);
					const result = CheckResultSchema.parse(parsedJson);

					console.log(
						`[PluginAIChecker] Performance result: status=${result.status}, classification=${result.classification}`,
					);
					results.push(result);
				} catch (parseError) {
					console.error(
						`[PluginAIChecker] Failed to parse performance response for chunk ${index + 1}:`,
						parseError,
					);
					console.error(
						"[PluginAIChecker] Performance response content:",
						content,
					);

					results.push({
						status: "warning",
						classification: "potentially_unsafe",
						shortDescription: "Ошибка анализа производительности",
						issues: [
							{
								type: "analysis_error",
								severity: "medium",
								description: "Не удалось проанализировать производительность",
								recommendation: "Повторите проверку позже",
							},
						],
					});
				}
			}

			const finalResult = await this.mergeChunkResults(results);
			console.log(
				`[PluginAIChecker] Performance check completed: status=${finalResult.status}`,
			);

			return {
				score:
					finalResult.status === "safe"
						? 90
						: finalResult.status === "warning"
							? 60
							: 20,
				details: finalResult,
				issues: finalResult.issues.map((i) => i.description),
			};
		} catch (error) {
			console.error(
				`[PluginAIChecker] Performance check failed for ${pluginName}:`,
				error,
			);
			return {
				score: 0,
				details: {
					status: "warning",
					classification: "potentially_unsafe",
					shortDescription: "Ошибка при проверке производительности",
					issues: [
						{
							type: "system_error",
							severity: "medium",
							description:
								error instanceof Error ? error.message : "Unknown error",
							recommendation: "Обратитесь к администратору",
						},
					],
				},
				issues: ["Системная ошибка при проверке производительности"],
			};
		}
	}

	cleanup() {
		console.log("[PluginAIChecker] Cleanup completed");
	}
}
