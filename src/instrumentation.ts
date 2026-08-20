export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { startTelegramPolling } = await import(
			"~/server/lib/telegram-polling"
		);
		startTelegramPolling();
		const { startPipelineRetryLoop } = await import(
			"~/server/lib/pipeline-retry"
		);
		startPipelineRetryLoop();
	}
}
