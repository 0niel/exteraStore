const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const JSON_DIRECTIVE =
	"Respond with a single valid JSON object only. No markdown fences, no commentary.";

function extractJson(text) {
	const trimmed = text.trim();
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced ? fenced[1].trim() : trimmed;

	try {
		JSON.parse(candidate);
		return candidate;
	} catch {}

	const start = candidate.indexOf("{");
	const end = candidate.lastIndexOf("}");
	if (start >= 0 && end > start) {
		const slice = candidate.slice(start, end + 1);
		try {
			JSON.parse(slice);
			return slice;
		} catch {}
	}

	return candidate;
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (request.method === "GET" && url.pathname.endsWith("/models")) {
			return Response.json({
				data: [{ id: DEFAULT_MODEL, object: "model", owned_by: "cloudflare" }],
			});
		}

		if (
			request.method !== "POST" ||
			!url.pathname.endsWith("/chat/completions")
		) {
			return new Response("Not found", { status: 404 });
		}

		const auth = request.headers.get("authorization") ?? "";
		if (!env.RELAY_TOKEN || auth !== `Bearer ${env.RELAY_TOKEN}`) {
			return Response.json(
				{ error: { message: "Unauthorized" } },
				{ status: 401 },
			);
		}

		let body;
		try {
			body = await request.json();
		} catch {
			return Response.json(
				{ error: { message: "Invalid JSON" } },
				{ status: 400 },
			);
		}

		const messages = Array.isArray(body.messages) ? [...body.messages] : [];
		const wantsJson =
			body.response_format &&
			(body.response_format.type === "json_object" ||
				body.response_format.type === "json_schema");

		if (wantsJson) {
			const directiveSchema = body.response_format?.json_schema?.schema;
			const extra = directiveSchema
				? `${JSON_DIRECTIVE} It must match this JSON schema: ${JSON.stringify(directiveSchema)}`
				: JSON_DIRECTIVE;
			const first = messages[0];
			if (first && first.role === "system") {
				messages[0] = { ...first, content: `${first.content}\n\n${extra}` };
			} else {
				messages.unshift({ role: "system", content: extra });
			}
		}

		const schema = body.response_format?.json_schema?.schema;
		const options = {
			messages,
			max_tokens: Math.min(Number(body.max_tokens) || 2048, 4096),
			temperature:
				typeof body.temperature === "number" ? body.temperature : 0.2,
		};

		if (wantsJson && schema) {
			options.response_format = { type: "json_schema", json_schema: schema };
		}

		try {
			let result;
			try {
				result = await env.AI.run(DEFAULT_MODEL, options);
			} catch (structuredError) {
				if (!options.response_format) {
					throw structuredError;
				}
				const { response_format, ...plain } = options;
				result = await env.AI.run(DEFAULT_MODEL, plain);
			}

			let content =
				typeof result?.response === "string"
					? result.response
					: result?.response
						? JSON.stringify(result.response)
						: "";

			if (wantsJson) {
				content = extractJson(content);
			}

			return Response.json({
				id: `cf-${crypto.randomUUID()}`,
				object: "chat.completion",
				created: Math.floor(Date.now() / 1000),
				model: body.model ?? DEFAULT_MODEL,
				choices: [
					{
						index: 0,
						message: { role: "assistant", content },
						finish_reason: "stop",
					},
				],
				usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
			});
		} catch (error) {
			return Response.json(
				{ error: { message: `Workers AI failed: ${error}` } },
				{ status: 502 },
			);
		}
	},
};
