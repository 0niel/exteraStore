import { Document } from "@langchain/core/documents";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { z } from "zod";

const CheckResultSchema = z.object({
	score: z.number().min(0).max(100),
	classification: z.enum(["safe", "potentially_unsafe", "unsafe", "critical"]),
	shortDescription: z.string().max(500),
	issues: z.array(
		z.object({
			type: z.string(),
			severity: z.enum(["low", "medium", "high", "critical"]),
			description: z.string(),
			line: z.number().optional(),
			recommendation: z.string(),
		}),
	),
	performanceMetrics: z
		.object({
			memoryLeaks: z.number().min(0).max(10),
			cpuEfficiency: z.number().min(0).max(10),
			ioEfficiency: z.number().min(0).max(10),
			algorithmicComplexity: z.number().min(0).max(10),
		})
		.optional(),
	dependencies: z.array(z.string()).optional(),
	pythonVersion: z.string().optional(),
});

type CheckResult = z.infer<typeof CheckResultSchema>;

export class PluginAIChecker {
	private gemini: ChatOpenAI;
	private textSplitter: RecursiveCharacterTextSplitter;

	constructor() {
		const openRouterApiKey =
			process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

		this.gemini = new ChatOpenAI({
			modelName: "google/gemini-2.5-pro-exp-03-25",
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
	}

	private async splitLargeCode(code: string): Promise<Document[]> {
		if (code.length < 1000000) {
			return [new Document({ pageContent: code })];
		}

		return await this.textSplitter.createDocuments([code]);
	}

	private getSecurityPrompt(): string {
		return `Ты эксперт по безопасности Python кода, специализирующийся на плагинах exteraGram.
Проанализируй предоставленный Python код на наличие уязвимостей безопасности.

exteraGram - это модификация Telegram клиента, поэтому плагины имеют доступ к функциям обмена сообщениями.

Проверь на наличие:
1. Опасные импорты (os, subprocess, eval, exec, __import__, compile)
2. Сетевые запросы без должной валидации
3. Операции с файловой системой (особенно запись)
4. SQL инъекции или инъекции команд
5. Утечка пользовательских данных или нарушение приватности
6. Криптографические слабости
7. Небезопасная десериализация
8. Уязвимости обхода пути (path traversal)
9. XXE или другие XML уязвимости
10. Состояния гонки или проблемы с потоками

Для каждой найденной проблемы укажи:
- Тип уязвимости
- Серьёзность (low/medium/high/critical)
- Точный номер строки, если возможно
- Ясное описание на русском языке
- Рекомендация по исправлению на русском языке

Классифицируй плагин как:
- safe: проблем безопасности не найдено
- potentially_unsafe: есть незначительные проблемы, требующие внимания
- unsafe: серьёзные проблемы безопасности
- critical: использовать нельзя, критические уязвимости

Верни JSON ответ в точном соответствии с этой структурой:
{
  "score": 0-100 (100 = полностью безопасен),
  "classification": "safe|potentially_unsafe|unsafe|critical",
  "shortDescription": "Краткое описание статуса безопасности на русском (максимум 500 символов)",
  "issues": [
    {
      "type": "тип уязвимости",
      "severity": "low|medium|high|critical",
      "description": "детальное описание на русском",
      "line": номер_строки_если_известен,
      "recommendation": "как исправить на русском"
    }
  ]
}`;
	}

	private getPerformancePrompt(): string {
		return `Ты эксперт по оптимизации производительности Python. Проанализируй этот плагин exteraGram на наличие проблем производительности.

Проверь на наличие:
1. Незакрытые файловые дескрипторы, сокеты, соединения с БД
2. Утечки памяти (циклические ссылки, неудалённые большие объекты)
3. Неэффективные циклы (вложенные циклы с O(n²) или хуже)
4. Блокирующие I/O операции без async/await
5. Неэффективные строковые операции (конкатенация в циклах)
6. Большие структуры данных, хранящиеся в памяти без необходимости
7. Повторяющиеся дорогие операции, которые можно кешировать
8. Утечки потоков/процессов или неправильная очистка ресурсов
9. Бесконечные циклы или неограниченная рекурсия
10. Неэффективные regex паттерны или повторные компиляции

Оцени:
- Риск утечек памяти (0-10, 10 = нет риска)
- Эффективность CPU (0-10, 10 = оптимально)
- Эффективность I/O (0-10, 10 = оптимально)
- Алгоритмическая сложность (0-10, 10 = оптимально O(1) или O(log n))

Верни JSON ответ:
{
  "score": 0-100 (оценка производительности, 100 = отлично),
  "classification": "safe|potentially_unsafe|unsafe|critical",
  "shortDescription": "Краткая оценка производительности на русском (максимум 500 символов)",
  "issues": [
    {
      "type": "тип проблемы производительности",
      "severity": "low|medium|high|critical",
      "description": "детальное описание на русском",
      "line": номер_строки_если_применимо,
      "recommendation": "предложение по оптимизации на русском"
    }
  ],
  "performanceMetrics": {
    "memoryLeaks": 0-10,
    "cpuEfficiency": 0-10,
    "ioEfficiency": 0-10,
    "algorithmicComplexity": 0-10
  }
}`;
	}

	private getCompatibilityPrompt(): string {
		return `Ты эксперт по совместимости плагинов exteraGram. Проанализируй код этого плагина.

Требования к плагинам exteraGram:
1. Должны использовать правильные exteraGram API вызовы
2. Должны быть совместимы с Python 3.7+
3. Должны следовать соглашениям о структуре плагинов
4. Должны корректно работать с Telegram API
5. Не должны мешать основной функциональности

Проверь:
1. Корректное использование exteraGram API
2. Совместимость с версиями Python
3. Необходимые зависимости и импорты
4. Метаданные и структура плагина
5. Соответствие Telegram API
6. Использование ресурсов (память, CPU)
7. Совместимость с потоками/async
8. Совместимость с платформами (Windows/Linux/Mac)

Перечисли все найденные внешние зависимости.
Определи минимальную требуемую версию Python.

Верни JSON ответ:
{
  "score": 0-100 (оценка совместимости),
  "classification": "safe|potentially_unsafe|unsafe|critical",
  "shortDescription": "Краткое описание совместимости на русском (максимум 500 символов)",
  "issues": [
    {
      "type": "проблема совместимости",
      "severity": "low|medium|high|critical",
      "description": "детальное описание на русском",
      "line": номер_строки_если_применимо,
      "recommendation": "предложение по исправлению на русском"
    }
  ],
  "dependencies": ["список", "зависимостей"],
  "pythonVersion": "минимальная версия, например 3.7"
}`;
	}

	private async mergeChunkResults(
		results: CheckResult[],
	): Promise<CheckResult> {
		if (results.length === 1) return results[0]!;

		const allIssues = results.flatMap((r) => r.issues);
		const avgScore = Math.round(
			results.reduce((sum, r) => sum + r.score, 0) / results.length,
		);

		const classifications = results.map((r) => r.classification);
		let finalClassification: CheckResult["classification"] = "safe";
		if (classifications.includes("critical")) finalClassification = "critical";
		else if (classifications.includes("unsafe")) finalClassification = "unsafe";
		else if (classifications.includes("potentially_unsafe"))
			finalClassification = "potentially_unsafe";

		const performanceResults = results
			.filter((r) => r.performanceMetrics)
			.map((r) => r.performanceMetrics!);
		const performanceMetrics =
			performanceResults.length > 0
				? {
						memoryLeaks: Math.round(
							performanceResults.reduce((sum, p) => sum + p.memoryLeaks, 0) /
								performanceResults.length,
						),
						cpuEfficiency: Math.round(
							performanceResults.reduce((sum, p) => sum + p.cpuEfficiency, 0) /
								performanceResults.length,
						),
						ioEfficiency: Math.round(
							performanceResults.reduce((sum, p) => sum + p.ioEfficiency, 0) /
								performanceResults.length,
						),
						algorithmicComplexity: Math.round(
							performanceResults.reduce(
								(sum, p) => sum + p.algorithmicComplexity,
								0,
							) / performanceResults.length,
						),
					}
				: undefined;

		const allDependencies = [
			...new Set(results.flatMap((r) => r.dependencies || [])),
		];

		return {
			score: avgScore,
			classification: finalClassification,
			shortDescription: `Проанализировано ${results.length} частей кода. ${allIssues.length} проблем найдено.`,
			issues: allIssues.slice(0, 20),
			performanceMetrics,
			dependencies: allDependencies.length > 0 ? allDependencies : undefined,
			pythonVersion: results.find((r) => r.pythonVersion)?.pythonVersion,
		};
	}

	async checkSecurity(
		pluginCode: string,
		pluginName: string,
	): Promise<{ score: number; details: CheckResult; issues: string[] }> {
		try {
			const chunks = await this.splitLargeCode(pluginCode);
			const results: CheckResult[] = [];

			for (const [index, chunk] of chunks.entries()) {
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

				const response = await this.gemini.invoke(messages);
				const content = response.content.toString();

				try {
					const jsonMatch = content.match(/\{[\s\S]*\}/);
					if (!jsonMatch) throw new Error("No JSON found in response");

					const result = CheckResultSchema.parse(JSON.parse(jsonMatch[0]));
					results.push(result);
				} catch (parseError) {
					console.error("Failed to parse LLM response:", parseError);
					results.push({
						score: 0,
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

			const finalResult = await this.mergeChunkResults(results);

			return {
				score: finalResult.score,
				details: finalResult,
				issues: finalResult.issues.map((i) => i.description),
			};
		} catch (error) {
			console.error("Security check failed:", error);
			return {
				score: 0,
				details: {
					score: 0,
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
		try {
			const chunks = await this.splitLargeCode(pluginCode);
			const results: CheckResult[] = [];

			for (const [index, chunk] of chunks.entries()) {
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

				const response = await this.gemini.invoke(messages);
				const content = response.content.toString();

				try {
					const jsonMatch = content.match(/\{[\s\S]*\}/);
					if (!jsonMatch) throw new Error("No JSON found in response");

					const result = CheckResultSchema.parse(JSON.parse(jsonMatch[0]));
					results.push(result);
				} catch (parseError) {
					console.error("Failed to parse performance response:", parseError);
					results.push({
						score: 50,
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

			return {
				score: finalResult.score,
				details: finalResult,
				issues: finalResult.issues.map((i) => i.description),
			};
		} catch (error) {
			console.error("Performance check failed:", error);
			return {
				score: 0,
				details: {
					score: 0,
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

	async checkCompatibility(
		pluginCode: string,
		pluginName: string,
	): Promise<{ score: number; details: CheckResult; issues: string[] }> {
		try {
			const chunks = await this.splitLargeCode(pluginCode);
			const results: CheckResult[] = [];

			for (const [index, chunk] of chunks.entries()) {
				const messages = [
					new SystemMessage(this.getCompatibilityPrompt()),
					new HumanMessage(`Plugin name: ${pluginName}
Part ${index + 1} of ${chunks.length}

Plugin code:
\`\`\`python
${chunk.pageContent}
\`\`\`

Проверь совместимость и верни JSON ответ. Отвечай только на русском языке.`),
				];

				const response = await this.gemini.invoke(messages);
				const content = response.content.toString();

				try {
					const jsonMatch = content.match(/\{[\s\S]*\}/);
					if (!jsonMatch) throw new Error("No JSON found in response");

					const result = CheckResultSchema.parse(JSON.parse(jsonMatch[0]));
					results.push(result);
				} catch (parseError) {
					console.error("Failed to parse compatibility response:", parseError);
					results.push({
						score: 50,
						classification: "potentially_unsafe",
						shortDescription: "Ошибка анализа совместимости",
						issues: [
							{
								type: "analysis_error",
								severity: "medium",
								description: "Не удалось проанализировать совместимость",
								recommendation: "Повторите проверку позже",
							},
						],
					});
				}
			}

			const finalResult = await this.mergeChunkResults(results);

			return {
				score: finalResult.score,
				details: finalResult,
				issues: finalResult.issues.map((i) => i.description),
			};
		} catch (error) {
			console.error("Compatibility check failed:", error);
			return {
				score: 0,
				details: {
					score: 0,
					classification: "potentially_unsafe",
					shortDescription: "Ошибка при проверке совместимости",
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
				issues: ["Системная ошибка при проверке совместимости"],
			};
		}
	}

	cleanup() {}
}
