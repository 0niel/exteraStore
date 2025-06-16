import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env.js";

const s3Client = new S3Client({
	region: "ru-central1",
	endpoint: "https://storage.yandexcloud.net",
	credentials: {
		accessKeyId: env.YANDEX_ACCESS_KEY_ID || "",
		secretAccessKey: env.YANDEX_SECRET_ACCESS_KEY || "",
	},
});

const BUCKET_NAME = env.YANDEX_STORAGE_BUCKET || "exteragram-plugins";

export class YandexStorage {
	/**
	 * Загрузить файл в Yandex Object Storage
	 */
	static async uploadFile(
		file: Buffer,
		fileName: string,
		contentType = "image/jpeg",
	): Promise<string> {
		try {
			const key = `images/${Date.now()}-${fileName}`;

			const command = new PutObjectCommand({
				Bucket: BUCKET_NAME,
				Key: key,
				Body: file,
				ContentType: contentType,
				ACL: "public-read",
			});

			await s3Client.send(command);

			return `https://storage.yandexcloud.net/${BUCKET_NAME}/${key}`;
		} catch (error) {
			console.error("Error uploading file to Yandex Storage:", error);
			throw new Error("Failed to upload file");
		}
	}

	static async uploadFiles(
		files: Array<{ buffer: Buffer; fileName: string; contentType?: string }>,
	): Promise<string[]> {
		try {
			const uploadPromises = files.map((file) =>
				YandexStorage.uploadFile(file.buffer, file.fileName, file.contentType),
			);

			return await Promise.all(uploadPromises);
		} catch (error) {
			console.error("Error uploading files to Yandex Storage:", error);
			throw new Error("Failed to upload files");
		}
	}

	static async deleteFile(fileUrl: string): Promise<void> {
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

	static async getSignedUrl(
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

			return await getSignedUrl(s3Client, command, { expiresIn });
		} catch (error) {
			console.error("Error generating signed URL:", error);
			throw new Error("Failed to generate signed URL");
		}
	}

	static async uploadPluginImage(
		imageBuffer: Buffer,
		pluginSlug: string,
		imageType: "screenshot" | "icon" = "screenshot",
	): Promise<string> {
		const fileName = `${pluginSlug}-${imageType}-${Date.now()}.jpg`;
		return YandexStorage.uploadFile(imageBuffer, fileName, "image/jpeg");
	}

	static async uploadPluginScreenshots(
		screenshots: Array<{ buffer: Buffer; index: number }>,
		pluginSlug: string,
	): Promise<string[]> {
		const files = screenshots.map(({ buffer, index }) => ({
			buffer,
			fileName: `${pluginSlug}-screenshot-${index}-${Date.now()}.jpg`,
			contentType: "image/jpeg",
		}));

		return YandexStorage.uploadFiles(files);
	}

	static async deletePluginImages(imageUrls: string[]): Promise<void> {
		try {
			const deletePromises = imageUrls.map((url) =>
				YandexStorage.deleteFile(url),
			);
			await Promise.all(deletePromises);
		} catch (error) {
			console.error("Error deleting plugin images:", error);
		}
	}

	static async healthCheck(): Promise<boolean> {
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
}

export class ImageUtils {
	static isImage(contentType: string): boolean {
		return contentType.startsWith("image/");
	}

	static getExtensionFromMimeType(mimeType: string): string {
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

	static validateImageSize(buffer: Buffer, maxSizeMB = 5): boolean {
		const sizeInMB = buffer.length / (1024 * 1024);
		return sizeInMB <= maxSizeMB;
	}

	static generateFileName(originalName: string, prefix?: string): string {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		const extension = originalName.split(".").pop() || "jpg";

		return prefix
			? `${prefix}-${timestamp}-${random}.${extension}`
			: `${timestamp}-${random}.${extension}`;
	}
}
