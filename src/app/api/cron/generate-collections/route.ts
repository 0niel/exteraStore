import { NextResponse } from "next/server";
import { api } from "~/trpc/server";

export async function GET(request: Request) {
	const authHeader = request.headers.get("authorization");
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return new Response("Unauthorized", {
			status: 401,
		});
	}

	try {
		const result = await api.aiCollections.generateAndSaveAICollections({
			themes: [
				"Полезные инструменты",
				"Удивить друзей",
				"Для работы и учебы",
				"Кастомизация интерфейса",
				"Развлечения и мемы",
				"Продуктивность",
				"Безопасность и приватность",
			],
		});

		return NextResponse.json({ success: true, data: result });
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}