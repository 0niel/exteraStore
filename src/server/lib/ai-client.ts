import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import type { z } from "zod";
import { env } from "~/env";

const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;
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

function getModel() {
	if (!env.OPENROUTER_API_KEY) {
		throw new Error("OpenRouter API key is not configured");
	}

	const openrouter = createOpenRouter({
		apiKey: env.OPENROUTER_API_KEY,
		baseURL: env.OPENROUTER_BASE_URL,
		compatibility: "strict",
		appName: "exteraGram Plugin Store",
		appUrl: env.NEXTAUTH_URL,
	});

	return openrouter.chat(env.OPENROUTER_MODEL);
}

export async function generateAIObject<T>(
	schema: z.ZodType<T>,
	instructions: string,
	prompt: string,
): Promise<T> {
	try {
		const result = await generateText({
			model: getModel(),
			output: Output.object({ schema }),
			instructions,
			prompt,
			temperature: 0.1,
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
): Promise<string> {
	try {
		const result = await generateText({
			model: getModel(),
			instructions,
			prompt,
			temperature: 0.2,
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
