const workerUrl = process.env.WORKER_URL;
const cronSecret = process.env.CRON_SECRET;
const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL || "google/gemini-3.6-flash";
const limit = Number.parseInt(process.env.CLAIM_LIMIT || "", 10) || 3;
const daemon = process.env.WORKER_DAEMON === "true";
const configuredInterval = Number.parseInt(
	process.env.WORKER_INTERVAL_MS || "",
	10,
);
const interval =
	Number.isSafeInteger(configuredInterval) && configuredInterval >= 5_000
		? configuredInterval
		: 15_000;
const translationPluginIds = (process.env.TRANSLATION_PLUGIN_IDS || "")
	.split(",")
	.map((value) => Number.parseInt(value.trim(), 10))
	.filter((value) => Number.isInteger(value) && value > 0)
	.slice(0, 20);
const translationOverride = process.env.TRANSLATION_OVERRIDE?.trim();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_ATTEMPTS = 3;

function reason(error) {
	return error instanceof Error ? error.message : "unknown error";
}

function validateConfiguration() {
	if (!workerUrl) throw new Error("WORKER_URL is not configured");
	if (!cronSecret) throw new Error("CRON_SECRET is not configured");
	if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");
}

async function callWorker(payload) {
	const response = await fetch(workerUrl, {
		method: "POST",
		headers: {
			authorization: `Bearer ${cronSecret}`,
			"content-type": "application/json",
		},
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(120_000),
	});
	if (!response.ok) {
		const body = await response.text();
		throw new Error(
			`worker responded ${response.status}: ${body.slice(0, 300)}`,
		);
	}
	return await response.json();
}

async function completion(instructions, prompt) {
	let lastError = "unknown error";
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
		try {
			const response = await fetch(OPENROUTER_URL, {
				method: "POST",
				headers: {
					authorization: `Bearer ${apiKey}`,
					"content-type": "application/json",
					"HTTP-Referer": "https://exterastore.app",
					"X-Title": "exteraGram Plugin Store",
				},
				body: JSON.stringify({
					model,
					messages: [
						{ role: "system", content: instructions },
						{ role: "user", content: prompt },
					],
					max_tokens: 4_000,
					temperature: 0.1,
				}),
				signal: AbortSignal.timeout(180_000),
			});

			if (!response.ok) {
				lastError = `openrouter responded ${response.status}`;
			} else {
				const data = await response.json();
				const content = data?.choices?.[0]?.message?.content;
				if (typeof content === "string" && content.trim()) return content;
				lastError = "openrouter returned an empty completion";
			}
		} catch (error) {
			lastError = reason(error);
		}

		if (attempt < MAX_ATTEMPTS) {
			await new Promise((resolve) => setTimeout(resolve, attempt * 5_000));
		}
	}
	throw new Error(lastError);
}

async function processRequestedTranslations() {
	if (translationPluginIds.length > 0) {
		const response = await callWorker({
			action: "translate",
			scope: "plugins",
			discover: true,
			limit: Math.min(translationPluginIds.length, 6),
			pluginIds: translationPluginIds,
		});
		console.log(
			`requested translations: ${JSON.stringify(response?.translations ?? {})}`,
		);
	}

	if (translationOverride) {
		const translation = JSON.parse(translationOverride);
		const response = await callWorker({
			action: "save_translation",
			...translation,
		});
		console.log(
			`saved translation for plugin ${response?.translation?.pluginId ?? "unknown"}`,
		);
	}
}

async function runOnce() {
	const claim = await callWorker({ action: "claim", limit });
	const jobs = Array.isArray(claim?.jobs) ? claim.jobs : [];
	console.log(`claimed ${jobs.length} job(s), model ${model}`);
	if (jobs.length === 0) return 0;

	const results = [];
	for (const job of jobs) {
		try {
			const checks = [];
			for (const check of job.checks ?? []) {
				const responses = [];
				for (const chunk of check.chunks ?? []) {
					responses.push(await completion(chunk.instructions, chunk.prompt));
				}
				if (responses.length === 0) {
					throw new Error(`no chunks for ${check.checkType}`);
				}
				checks.push({ checkType: check.checkType, responses });
			}
			if (checks.length === 0) throw new Error("job contained no checks");
			console.log(`job ${job.queueId}: ${checks.length} check(s) done`);
			results.push({ queueId: job.queueId, checks });
		} catch (error) {
			const message = reason(error).slice(0, 300);
			console.log(`job ${job.queueId}: failed (${message})`);
			results.push({ queueId: job.queueId, error: message });
		}
	}

	const submit = await callWorker({ action: "submit", results });
	console.log(
		`submitted ${results.length} result(s): completed ${submit?.completed ?? 0}, failed ${submit?.failed ?? 0}`,
	);
	return jobs.length;
}

async function main() {
	validateConfiguration();
	await processRequestedTranslations();
	if (!daemon) {
		await runOnce();
		return;
	}

	for (;;) {
		let delay = interval;
		try {
			const processed = await runOnce();
			if (processed > 0) delay = 1_000;
		} catch (error) {
			console.error(`pipeline worker failed: ${reason(error)}`);
		}
		await new Promise((resolve) => setTimeout(resolve, delay));
	}
}

main().catch((error) => {
	console.error(reason(error));
	process.exitCode = 1;
});
