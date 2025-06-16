import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import {
	notifications,
	pluginPipelineChecks,
	pluginPipelineQueue,
	userNotificationSettings,
	userPluginSubscriptions
} from "~/server/db/pipeline-schema";
import { plugins } from "~/server/db/schema";


class PluginLLMChecker {
	private static readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
	private static readonly ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

	static async checkSecurity(pluginCode: string, pluginName: string): Promise<{
		score: number;
		details: any;
		issues: string[];
	}> {
		const prompt = `
Analyze this Python plugin for exteraGram for security issues.

Plugin name: ${pluginName}

Plugin code:
\`\`\`python
${pluginCode}
\`\`\`

Check for:
1. Potentially dangerous imports (os, subprocess, eval, exec, etc.)
2. Unverified network requests
3. Filesystem operations
4. Arbitrary code execution
5. User data leaks
6. SQL injections or similar vulnerabilities

Respond in JSON format:
{
  "score": 0-100,
  "issues": ["list of issues"],
  "recommendations": ["fix recommendations"],
  "severity": "low|medium|high|critical"
}
`;

		try {
			const response = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: 'gpt-4o-mini',
					messages: [
						{ role: 'system', content: 'You are a Python code security expert. Respond only in JSON format.' },
						{ role: 'user', content: prompt }
					],
					temperature: 0.1,
					max_tokens: 2000,
				}),
			});

			if (!response.ok) {
				throw new Error(`OpenAI API error: ${response.statusText}`);
			}

			const data = await response.json();
			const result = JSON.parse(data.choices[0].message.content);
			
			return {
				score: result.score,
				details: result,
				issues: result.issues || [],
			};
		} catch (error) {
			console.error('Security check failed:', error);
			return {
				score: 0,
				details: { error: error instanceof Error ? error.message : 'Unknown error' },
				issues: ['Ошибка при проверке безопасности'],
			};
		}
	}

	static async checkQuality(pluginCode: string, pluginName: string): Promise<{
		score: number;
		details: any;
		issues: string[];
	}> {
		const prompt = `
Analyze the code quality of this Python plugin for exteraGram.

Plugin name: ${pluginName}

Plugin code:
\`\`\`python
${pluginCode}
\`\`\`

Check:
1. Code structure and organization
2. PEP 8 compliance
3. Documentation and comments
4. Error handling
5. Performance
6. Code readability
7. Python best practices usage

Respond in JSON format:
{
  "score": 0-100,
  "issues": ["list of issues"],
  "recommendations": ["improvement recommendations"],
  "metrics": {
    "complexity": 0-10,
    "maintainability": 0-10,
    "documentation": 0-10
  }
}
`;

		try {
			const response = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: 'gpt-4o-mini',
					messages: [
						{ role: 'system', content: 'You are a Python code quality expert. Respond only in JSON format.' },
						{ role: 'user', content: prompt }
					],
					temperature: 0.1,
					max_tokens: 2000,
				}),
			});

			if (!response.ok) {
				throw new Error(`OpenAI API error: ${response.statusText}`);
			}

			const data = await response.json();
			const result = JSON.parse(data.choices[0].message.content);
			
			return {
				score: result.score,
				details: result,
				issues: result.issues || [],
			};
		} catch (error) {
			console.error('Quality check failed:', error);
			return {
				score: 0,
				details: { error: error instanceof Error ? error.message : 'Unknown error' },
				issues: ['Ошибка при проверке качества'],
			};
		}
	}

	static async checkCompatibility(pluginCode: string, pluginName: string): Promise<{
		score: number;
		details: any;
		issues: string[];
	}> {
		const prompt = `
Analyze the compatibility of this Python plugin with exteraGram.

Plugin name: ${pluginName}

Plugin code:
\`\`\`python
${pluginCode}
\`\`\`

Check:
1. Correct usage of exteraGram APIs
2. Python version compatibility
3. Dependencies and imports
4. Proper plugin structure
5. Compliance with exteraGram standards

Respond in JSON format:
{
  "score": 0-100,
  "issues": ["compatibility issues list"],
  "recommendations": ["recommendations"],
  "pythonVersion": "minimum Python version",
  "dependencies": ["dependencies list"]
}
`;

		try {
			const response = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: 'gpt-4o-mini',
					messages: [
						{ role: 'system', content: 'You are an exteraGram plugin expert. Respond only in JSON format.' },
						{ role: 'user', content: prompt }
					],
					temperature: 0.1,
					max_tokens: 2000,
				}),
			});

			if (!response.ok) {
				throw new Error(`OpenAI API error: ${response.statusText}`);
			}

			const data = await response.json();
			const result = JSON.parse(data.choices[0].message.content);
			
			return {
				score: result.score,
				details: result,
				issues: result.issues || [],
			};
		} catch (error) {
			console.error('Compatibility check failed:', error);
			return {
				score: 0,
				details: { error: error instanceof Error ? error.message : 'Unknown error' },
				issues: ['Ошибка при проверке совместимости'],
			};
		}
	}
}

export const pluginPipelineRouter = createTRPCRouter({
	
	getChecks: publicProcedure
		.input(z.object({ pluginSlug: z.string() }))
		.query(async ({ ctx, input }) => {
			const plugin = await ctx.db
				.select({ id: plugins.id })
				.from(plugins)
				.where(eq(plugins.slug, input.pluginSlug))
				.limit(1);

			if (!plugin[0]) {
				throw new Error("Plugin not found");
			}

			const checks = await ctx.db
				.select()
				.from(pluginPipelineChecks)
				.where(eq(pluginPipelineChecks.pluginId, plugin[0].id))
				.orderBy(desc(pluginPipelineChecks.createdAt));

			return checks;
		}),

	
	runChecks: protectedProcedure
		.input(z.object({ pluginId: z.number() }))
		.mutation(async ({ ctx, input }) => {
			
			const plugin = await ctx.db
				.select({ 
					authorId: plugins.authorId, 
					name: plugins.name,
					slug: plugins.slug
				})
				.from(plugins)
				.where(eq(plugins.id, input.pluginId))
				.limit(1);

			if (!plugin[0] || (plugin[0].authorId !== ctx.session.user.id && ctx.session.user.role !== 'admin')) {
				throw new Error("Unauthorized");
			}

			
			const [queueItem] = await ctx.db
				.insert(pluginPipelineQueue)
				.values({
					pluginId: input.pluginId,
					priority: 5,
					scheduledAt: new Date(),
				})
				.returning();

			return queueItem;
		}),

	
	processQueue: protectedProcedure
		.input(z.object({ limit: z.number().default(5) }))
		.mutation(async ({ ctx, input }) => {
			
			if (ctx.session.user.role !== 'admin') {
				throw new Error("Unauthorized");
			}

			const queueItems = await ctx.db
				.select()
				.from(pluginPipelineQueue)
				.where(eq(pluginPipelineQueue.status, "queued"))
				.orderBy(desc(pluginPipelineQueue.priority), pluginPipelineQueue.createdAt)
				.limit(input.limit);

			const results = [];

			for (const item of queueItems) {
				try {
					
					await ctx.db
						.update(pluginPipelineQueue)
						.set({
							status: "processing",
							startedAt: new Date(),
						})
						.where(eq(pluginPipelineQueue.id, item.id));

					
					const plugin = await ctx.db
						.select()
						.from(plugins)
						.where(eq(plugins.id, item.pluginId))
						.limit(1);

					if (!plugin[0]) {
						throw new Error("Plugin not found");
					}

					
					const pluginFile = await ctx.db.query.pluginFiles.findFirst({
						where: eq(plugins.id, item.pluginId),
						orderBy: desc(sql`created_at`),
					});

					if (!pluginFile) {
						throw new Error("Plugin file not found");
					}

					
					const checks = [
						{ type: 'security', checker: PluginLLMChecker.checkSecurity },
						{ type: 'quality', checker: PluginLLMChecker.checkQuality },
						{ type: 'compatibility', checker: PluginLLMChecker.checkCompatibility },
					];

					for (const check of checks) {
						const startTime = Date.now();
						
						try {
							await ctx.db
								.insert(pluginPipelineChecks)
								.values({
									pluginId: item.pluginId,
									checkType: check.type,
									status: "running",
									llmModel: "gpt-4o-mini",
								});

							const result = await check.checker(pluginFile.content, plugin[0].name);
							const executionTime = Date.now() - startTime;

							await ctx.db
								.update(pluginPipelineChecks)
								.set({
									status: result.score >= 70 ? "passed" : "failed",
									score: result.score,
									details: JSON.stringify(result.details),
									executionTime,
									completedAt: new Date(),
								})
								.where(and(
									eq(pluginPipelineChecks.pluginId, item.pluginId),
									eq(pluginPipelineChecks.checkType, check.type),
									eq(pluginPipelineChecks.status, "running")
								));

						} catch (error) {
							await ctx.db
								.update(pluginPipelineChecks)
								.set({
									status: "error",
									errorMessage: error instanceof Error ? error.message : "Unknown error",
									completedAt: new Date(),
								})
								.where(and(
									eq(pluginPipelineChecks.pluginId, item.pluginId),
									eq(pluginPipelineChecks.checkType, check.type),
									eq(pluginPipelineChecks.status, "running")
								));
						}
					}

					
					await ctx.db
						.update(pluginPipelineQueue)
						.set({
							status: "completed",
							completedAt: new Date(),
						})
						.where(eq(pluginPipelineQueue.id, item.id));

					results.push({ pluginId: item.pluginId, status: "completed" });

				} catch (error) {
					
					await ctx.db
						.update(pluginPipelineQueue)
						.set({
							status: "failed",
							errorMessage: error instanceof Error ? error.message : "Unknown error",
							retryCount: item.retryCount + 1,
							completedAt: new Date(),
						})
						.where(eq(pluginPipelineQueue.id, item.id));

					results.push({ 
						pluginId: item.pluginId, 
						status: "failed", 
						error: error instanceof Error ? error.message : "Unknown error" 
					});
				}
			}

			return results;
		}),

	
	subscribe: protectedProcedure
		.input(z.object({
			pluginId: z.number(),
			subscriptionType: z.enum(["updates", "reviews", "security_alerts"]),
		}))
		.mutation(async ({ ctx, input }) => {
			const [subscription] = await ctx.db
				.insert(userPluginSubscriptions)
				.values({
					userId: ctx.session.user.id,
					pluginId: input.pluginId,
					subscriptionType: input.subscriptionType,
					telegramChatId: ctx.session.user.telegramId,
				})
				.onConflictDoNothing()
				.returning();

			return subscription;
		}),

	
	unsubscribe: protectedProcedure
		.input(z.object({
			pluginId: z.number(),
			subscriptionType: z.enum(["updates", "reviews", "security_alerts"]),
		}))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(userPluginSubscriptions)
				.set({ isActive: false })
				.where(and(
					eq(userPluginSubscriptions.userId, ctx.session.user.id),
					eq(userPluginSubscriptions.pluginId, input.pluginId),
					eq(userPluginSubscriptions.subscriptionType, input.subscriptionType)
				));

			return { success: true };
		}),

	
	getNotificationSettings: protectedProcedure
		.query(async ({ ctx }) => {
			const settings = await ctx.db
				.select()
				.from(userNotificationSettings)
				.where(eq(userNotificationSettings.userId, ctx.session.user.id))
				.limit(1);

			if (!settings[0]) {
				
				const [newSettings] = await ctx.db
					.insert(userNotificationSettings)
					.values({
						userId: ctx.session.user.id,
						telegramChatId: ctx.session.user.telegramId,
					})
					.returning();

				return newSettings;
			}

			return settings[0];
		}),

	
	updateNotificationSettings: protectedProcedure
		.input(z.object({
			enablePluginUpdates: z.boolean().optional(),
			enableSecurityAlerts: z.boolean().optional(),
			enableReviewNotifications: z.boolean().optional(),
			enableTelegramNotifications: z.boolean().optional(),
		}))
		.mutation(async ({ ctx, input }) => {
			const [settings] = await ctx.db
				.update(userNotificationSettings)
				.set({
					...input,
					updatedAt: new Date(),
				})
				.where(eq(userNotificationSettings.userId, ctx.session.user.id))
				.returning();

			return settings;
		}),
});