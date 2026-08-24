import { type NextRequest, NextResponse } from "next/server";
import {
	deleteFile,
	generateFileName,
	isImage,
	uploadFile,
	validateImageSize,
} from "~/lib/yandex-storage";
import { auth } from "~/server/auth";

export async function POST(request: NextRequest) {
	try {
		const session = await auth();
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const formData = await request.formData();
		const fileEntries = formData.getAll("files");
		const files = fileEntries.filter(
			(entry): entry is File => entry instanceof File,
		);
		const pluginSlugEntry = formData.get("pluginSlug");
		const pluginSlug =
			typeof pluginSlugEntry === "string" ? pluginSlugEntry.trim() : "";
		const imageTypeEntry = formData.get("imageType");
		const requestedImageType =
			typeof imageTypeEntry === "string" ? imageTypeEntry : "screenshot";
		const imageType = requestedImageType === "icon" ? "icon" : "screenshot";

		if (files.length === 0 || files.length !== fileEntries.length) {
			return NextResponse.json({ error: "No files provided" }, { status: 400 });
		}
		if (files.length > 10) {
			return NextResponse.json({ error: "Too many files" }, { status: 400 });
		}

		if (!pluginSlug || pluginSlug.length > 160) {
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
				if (!isImage(file.type)) {
					errors.push(`File ${file.name} is not an image`);
					continue;
				}

				const arrayBuffer = await file.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				if (!validateImageSize(buffer, 5)) {
					errors.push(`File ${file.name} is too large (max 5MB)`);
					continue;
				}

				const safeFileName = generateFileName(
					file.name,
					`${pluginSlug}-${imageType}`,
				);
				const uploadedUrl = await uploadFile(
					buffer,
					safeFileName,
					file.type || "image/jpeg",
				);

				uploadedUrls.push(uploadedUrl);
			} catch {
				errors.push(`Error uploading file ${file.name}`);
			}
		}

		return NextResponse.json({
			success: true,
			uploadedUrls,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch {
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
	} catch {
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

		await deleteFile(imageUrl);

		return NextResponse.json({
			success: true,
			message: "Image deleted successfully",
		});
	} catch {
		return NextResponse.json(
			{ error: "Failed to delete image" },
			{ status: 500 },
		);
	}
}
