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
const SUPPORTED_IMAGE_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
]);

function getObjectKey(fileUrl: string): string {
	const url = new URL(fileUrl);
	if (url.hostname === `${BUCKET_NAME}.storage.yandexcloud.net`) {
		return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
	}

	if (url.hostname === "storage.yandexcloud.net") {
		const prefix = `/${BUCKET_NAME}/`;
		if (url.pathname.startsWith(prefix)) {
			return decodeURIComponent(url.pathname.slice(prefix.length));
		}
	}

	throw new Error("Unsupported storage URL");
}

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

		const command = new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
			Body: file,
			ContentType: contentType,
		});

		await s3Client.send(command);

		return `https://${BUCKET_NAME}.storage.yandexcloud.net/${key}`;
	} catch {
		throw new Error("Failed to upload file");
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
	} catch {
		throw new Error("Failed to upload files");
	}
}

export async function deleteFile(fileUrl: string): Promise<void> {
	try {
		const key = getObjectKey(fileUrl);

		const command = new DeleteObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		});

		await s3Client.send(command);
	} catch {
		throw new Error("Failed to delete file");
	}
}

export async function getSignedUrl(
	fileUrl: string,
	expiresIn = 3600,
): Promise<string> {
	try {
		const key = getObjectKey(fileUrl);

		const command = new GetObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		});

		return await getS3SignedUrl(s3Client, command, { expiresIn });
	} catch {
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
	} catch {}
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
		return false;
	}
}

export function isImage(contentType: string): boolean {
	return SUPPORTED_IMAGE_TYPES.has(contentType.toLowerCase());
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
