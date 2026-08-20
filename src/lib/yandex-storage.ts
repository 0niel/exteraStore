import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env.js";

const s3Client = new S3Client({
	region: "ru-central1",
	endpoint: "https://storage.yandexcloud.net",
	credentials: {
		accessKeyId: env.YANDEX_STORAGE_ACCESS_KEY || "",
		secretAccessKey: env.YANDEX_STORAGE_SECRET_KEY || "",
	},
	forcePathStyle: true,
});

const BUCKET_NAME = env.YANDEX_STORAGE_BUCKET || "exteragram-plugins";

console.log("Yandex Storage initialized:", {
	bucket: BUCKET_NAME,
	hasAccessKey: !!env.YANDEX_STORAGE_ACCESS_KEY,
	hasSecretKey: !!env.YANDEX_STORAGE_SECRET_KEY,
});

export async function uploadFile(
	file: Buffer,
	fileName: string,
	contentType = "image/jpeg",
): Promise<string> {
	if (!env.YANDEX_STORAGE_ACCESS_KEY || !env.YANDEX_STORAGE_SECRET_KEY) {
		throw new Error("Yandex Storage credentials not configured");
	}

	try {
		const timestamp = Date.now();
		const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
		const key = `images/${timestamp}-${safeName}`;

		console.log(`Uploading file to Yandex Storage: ${key}`);
		console.log(`Bucket: ${BUCKET_NAME}`);
		console.log(`Content-Type: ${contentType}`);

		const command = new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
			Body: file,
			ContentType: contentType,
		});

		const result = await s3Client.send(command);
		console.log("Upload successful:", result);

		return `https://exteragram-plugins.storage.yandexcloud.net/images/${timestamp}-${safeName}`;
	} catch (error) {
		console.error("Error uploading file to Yandex Storage:", error);
		console.error("Error details:", {
			name: error instanceof Error ? error.name : "Unknown",
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw new Error(
			`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

export async function uploadFiles(
	files: Array<{ buffer: Buffer; fileName: string; contentType?: string }>,
): Promise<string[]> {
	try {
		const uploadPromises = files.map((file) =>
			uploadFile(file.buffer, file.fileName, file.contentType),
		);

		return await Promise.all(uploadPromises);
	} catch (error) {
		console.error("Error uploading files to Yandex Storage:", error);
		throw new Error("Failed to upload files");
	}
}

export async function deleteFile(fileUrl: string): Promise<void> {
	try {
		const key = fileUrl.replace(
			`https://storage.yandexcloud.net/${BUCKET_NAME}/`,
			"",
		);

		const command = new DeleteObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		});

		await s3Client.send(command);
	} catch (error) {
		console.error("Error deleting file from Yandex Storage:", error);
		throw new Error("Failed to delete file");
	}
}

export async function getSignedUrl(
	fileUrl: string,
	expiresIn = 3600,
): Promise<string> {
	try {
		const key = fileUrl.replace(
			`https://storage.yandexcloud.net/${BUCKET_NAME}/`,
			"",
		);

		const command = new GetObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		});

		return await getS3SignedUrl(s3Client, command, { expiresIn });
	} catch (error) {
		console.error("Error generating signed URL:", error);
		throw new Error("Failed to generate signed URL");
	}
}

export async function uploadPluginImage(
	imageBuffer: Buffer,
	pluginSlug: string,
	imageType: "screenshot" | "icon" = "screenshot",
): Promise<string> {
	const fileName = `${pluginSlug}-${imageType}-${Date.now()}.jpg`;
	return uploadFile(imageBuffer, fileName, "image/jpeg");
}

export async function uploadPluginScreenshots(
	screenshots: Array<{ buffer: Buffer; index: number }>,
	pluginSlug: string,
): Promise<string[]> {
	const files = screenshots.map(({ buffer, index }) => ({
		buffer,
		fileName: `${pluginSlug}-screenshot-${index}-${Date.now()}.jpg`,
		contentType: "image/jpeg",
	}));

	return uploadFiles(files);
}

export async function deletePluginImages(imageUrls: string[]): Promise<void> {
	try {
		const deletePromises = imageUrls.map((url) => deleteFile(url));
		await Promise.all(deletePromises);
	} catch (error) {
		console.error("Error deleting plugin images:", error);
	}
}

export async function storageHealthCheck(): Promise<boolean> {
	try {
		const command = new GetObjectCommand({
			Bucket: BUCKET_NAME,
			Key: "health-check",
		});

		await s3Client.send(command);
		return true;
	} catch (error) {
		if (error instanceof Error && error.name === "NoSuchKey") {
			return true;
		}
		console.error("Yandex Storage health check failed:", error);
		return false;
	}
}

export function isImage(contentType: string): boolean {
	return contentType?.startsWith("image/") ?? false;
}

export function getExtensionFromMimeType(mimeType: string): string {
	const extensions: Record<string, string> = {
		"image/jpeg": "jpg",
		"image/jpg": "jpg",
		"image/png": "png",
		"image/gif": "gif",
		"image/webp": "webp",
		"image/svg+xml": "svg",
	};

	return extensions[mimeType] || "jpg";
}

export function validateImageSize(buffer: Buffer, maxSizeMB = 5): boolean {
	const sizeInMB = buffer.length / (1024 * 1024);
	return sizeInMB <= maxSizeMB;
}

export function generateFileName(
	originalName: string,
	prefix?: string,
): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	const extension = originalName.split(".").pop() || "jpg";

	return prefix
		? `${prefix}-${timestamp}-${random}.${extension}`
		: `${timestamp}-${random}.${extension}`;
}
