import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import type { z } from "zod";
import { env } from "~/env";

const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;

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
}

export async function generateAIText(
	instructions: string,
	prompt: string,
): Promise<string> {
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
}
