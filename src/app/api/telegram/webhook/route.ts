import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import {
	processTelegramUpdate,
	type TelegramUpdate,
} from "~/server/lib/telegram-bot";

export async function POST(request: NextRequest) {
	if (
		!env.TELEGRAM_WEBHOOK_SECRET ||
		request.headers.get("x-telegram-bot-api-secret-token") !==
			env.TELEGRAM_WEBHOOK_SECRET
	) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await request.json().catch(() => null);
		if (!body || typeof body !== "object") {
			return NextResponse.json({ error: "Invalid update" }, { status: 400 });
		}

		await processTelegramUpdate(body as TelegramUpdate);
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Webhook error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function GET() {
	return NextResponse.json({ status: "Telegram webhook is active" });
}
