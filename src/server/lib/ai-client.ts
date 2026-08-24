import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import type { z } from "zod";
import { env } from "~/env";
import {
	type AiBudgetGrant,
	assertAiBudgetGrant,
} from "~/server/lib/ai-rate-limiter";

const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 1;
const MAX_OBJECT_OUTPUT_TOKENS = 5_000;
const MAX_TEXT_OUTPUT_TOKENS = 2_000;
const UNAVAILABLE_STATUS = new Set([
	401, 402, 403, 408, 429, 500, 502, 503, 504,
]);

export class AiUnavailableError extends Error {
	constructor(cause?: unknown) {
		super("AI provider is unreachable");
		this.name = "AiUnavailableError";
		this.cause = cause;
	}
}

export function isAiUnavailableError(error: unknown): boolean {
	if (error instanceof AiUnavailableError) {
		return true;
	}

	if (!(error instanceof Error)) {
		return false;
	}

	if (error.name === "AbortError" || error.name === "TimeoutError") {
		return true;
	}

	const status = (error as { statusCode?: number }).statusCode;
	if (typeof status === "number" && UNAVAILABLE_STATUS.has(status)) {
		return true;
	}

	if (error instanceof TypeError && error.message.includes("fetch")) {
		return true;
	}

	const code = (error as { cause?: { code?: string } }).cause?.code;
	if (
		typeof code === "string" &&
		[
			"ECONNREFUSED",
			"ETIMEDOUT",
			"ENOTFOUND",
			"EAI_AGAIN",
			"ECONNRESET",
		].includes(code)
	) {
		return true;
	}

	return isAiUnavailableError(error.cause);
}

function rethrow(error: unknown): never {
	if (isAiUnavailableError(error)) {
		throw new AiUnavailableError(error);
	}
	throw error;
}

const BROWSER_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function getProvider() {
	if (env.AI_GATEWAY_BASE_URL && env.AI_GATEWAY_API_KEY) {
		return {
			apiKey: env.AI_GATEWAY_API_KEY,
			baseURL: env.AI_GATEWAY_BASE_URL,
			model: env.AI_GATEWAY_MODEL ?? env.OPENROUTER_MODEL,
		};
	}

	if (!env.OPENROUTER_API_KEY) {
		return null;
	}

	return {
		apiKey: env.OPENROUTER_API_KEY,
		baseURL: env.OPENROUTER_BASE_URL,
		model: env.OPENROUTER_MODEL,
	};
}

function getModel() {
	const provider = getProvider();
	if (!provider) {
		throw new AiUnavailableError();
	}

	const openrouter = createOpenRouter({
		apiKey: provider.apiKey,
		baseURL: provider.baseURL,
		compatibility: "strict",
		appName: "exteraGram Plugin Store",
		appUrl: env.NEXTAUTH_URL,
		headers: { "User-Agent": BROWSER_USER_AGENT },
	});

	return openrouter.chat(provider.model);
}

export async function generateAIObject<T>(
	schema: z.ZodType<T>,
	instructions: string,
	prompt: string,
	budget: AiBudgetGrant,
): Promise<T> {
	assertAiBudgetGrant(budget);
	try {
		const result = await generateText({
			model: getModel(),
			output: Output.object({ schema }),
			instructions,
			prompt,
			temperature: 0.1,
			maxOutputTokens: MAX_OBJECT_OUTPUT_TOKENS,
			maxRetries: MAX_RETRIES,
			timeout: REQUEST_TIMEOUT_MS,
		});

		return result.output;
	} catch (error) {
		rethrow(error);
	}
}

export async function generateAIText(
	instructions: string,
	prompt: string,
	budget: AiBudgetGrant,
): Promise<string> {
	assertAiBudgetGrant(budget);
	try {
		const result = await generateText({
			model: getModel(),
			instructions,
			prompt,
			temperature: 0.2,
			maxOutputTokens: MAX_TEXT_OUTPUT_TOKENS,
			maxRetries: MAX_RETRIES,
			timeout: REQUEST_TIMEOUT_MS,
		});

		const text = result.text.trim();
		if (!text) {
			throw new Error("AI returned an empty response");
		}

		return text;
	} catch (error) {
		rethrow(error);
	}
}
