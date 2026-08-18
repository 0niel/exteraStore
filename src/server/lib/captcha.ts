import { env } from "~/env";

export async function verifyCaptcha(
	token: string,
	ip?: string | null,
): Promise<boolean> {
	if (!env.YANDEX_CAPTCHA_SECRET_KEY) {
		console.warn("YANDEX_CAPTCHA_SECRET_KEY not configured");
		return process.env.NODE_ENV === "development";
	}

	if (!token) {
		return false;
	}

	try {
		const params = new URLSearchParams({
			secret: env.YANDEX_CAPTCHA_SECRET_KEY,
			token,
		});

		if (ip) {
			params.append("ip", ip);
		}

		const response = await fetch(
			"https://smartcaptcha.yandexcloud.net/validate",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: params.toString(),
				signal: AbortSignal.timeout(10_000),
			},
		);

		if (!response.ok) {
			console.error(`Captcha validation error: status=${response.status}`);
			return false;
		}

		const result: unknown = await response.json().catch(() => null);
		return (
			typeof result === "object" &&
			result !== null &&
			"status" in result &&
			result.status === "ok"
		);
	} catch {
		console.error("Captcha validation request failed");
		return false;
	}
}
