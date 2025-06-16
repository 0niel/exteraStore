import { type NextRequest, NextResponse } from "next/server";
import { ImageUtils, YandexStorage } from "~/lib/yandex-storage";
import { auth } from "~/server/auth";

export async function POST(request: NextRequest) {
	try {
		const session = await auth();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const formData = await request.formData();
		const files = formData.getAll("files") as File[];
		const pluginSlug = formData.get("pluginSlug") as string;
		const imageType = (formData.get("imageType") as string) || "screenshot";

		if (!files || files.length === 0) {
			return NextResponse.json({ error: "No files provided" }, { status: 400 });
		}

		if (!pluginSlug) {
			return NextResponse.json(
				{ error: "Plugin slug is required" },
				{ status: 400 },
			);
		}

		const uploadedUrls: string[] = [];
		const errors: string[] = [];

		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			if (!file) continue;

			try {
				if (!ImageUtils.isImage(file.type)) {
					errors.push(`File ${file.name} is not an image`);
					continue;
				}

				const arrayBuffer = await file.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				if (!ImageUtils.validateImageSize(buffer, 5)) {
					errors.push(`File ${file.name} is too large (max 5MB)`);
					continue;
				}

				let uploadedUrl: string;

				if (imageType === "screenshot") {
					uploadedUrl = await YandexStorage.uploadPluginImage(
						buffer,
						pluginSlug,
						"screenshot",
					);
				} else {
					uploadedUrl = await YandexStorage.uploadPluginImage(
						buffer,
						pluginSlug,
						"icon",
					);
				}

				uploadedUrls.push(uploadedUrl);
			} catch (error) {
				console.error(`Error uploading file ${file.name}:`, error);
				errors.push(
					`Failed to upload ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		return NextResponse.json({
			success: true,
			uploadedUrls,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error) {
		console.error("Upload error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const session = await auth();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const pluginSlug = searchParams.get("pluginSlug");

		if (!pluginSlug) {
			return NextResponse.json(
				{ error: "Plugin slug is required" },
				{ status: 400 },
			);
		}

		return NextResponse.json({
			images: [],
		});
	} catch (error) {
		console.error("Get images error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const session = await auth();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { imageUrl } = await request.json();

		if (!imageUrl) {
			return NextResponse.json(
				{ error: "Image URL is required" },
				{ status: 400 },
			);
		}

		await YandexStorage.deleteFile(imageUrl);

		return NextResponse.json({
			success: true,
			message: "Image deleted successfully",
		});
	} catch (error) {
		console.error("Delete image error:", error);
		return NextResponse.json(
			{ error: "Failed to delete image" },
			{ status: 500 },
		);
	}
}
