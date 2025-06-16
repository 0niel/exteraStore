"use client";

import {
	AlertCircle,
	CheckCircle,
	Image as ImageIcon,
	Loader2,
	Upload,
	X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";

interface ScreenshotUploaderProps {
	screenshots: string[];
	onScreenshotsChange: (screenshots: string[]) => void;
	pluginSlug?: string;
	maxFiles?: number;
	maxSizeMB?: number;
}

interface UploadingFile {
	file: File;
	progress: number;
	status: "uploading" | "success" | "error";
	url?: string;
	error?: string;
}

export function ScreenshotUploader({
	screenshots,
	onScreenshotsChange,
	pluginSlug = "temp",
	maxFiles = 5,
	maxSizeMB = 5,
}: ScreenshotUploaderProps) {
	const t = useTranslations("ScreenshotUploader");
	const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
	const [isUploading, setIsUploading] = useState(false);

	const uploadFile = async (file: File): Promise<string> => {
		const formData = new FormData();
		formData.append("files", file);
		formData.append("pluginSlug", pluginSlug);
		formData.append("imageType", "screenshot");

		const response = await fetch("/api/upload/images", {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || t("upload_failed"));
		}

		const result = await response.json();
		if (result.errors && result.errors.length > 0) {
			throw new Error(result.errors[0]);
		}

		return result.uploadedUrls[0];
	};

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			if (screenshots.length + acceptedFiles.length > maxFiles) {
				toast.error(t("max_files_error", { maxFiles }));
				return;
			}

			setIsUploading(true);
			const newUploadingFiles: UploadingFile[] = acceptedFiles.map((file) => ({
				file,
				progress: 0,
				status: "uploading",
			}));

			setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

			try {
				const uploadPromises = acceptedFiles.map(async (file, index) => {
					try {
						const url = await uploadFile(file);

						setUploadingFiles((prev) =>
							prev.map((item, i) =>
								i === uploadingFiles.length + index
									? { ...item, status: "success", url, progress: 100 }
									: item,
							),
						);

						return url;
					} catch (error) {
						const errorMessage =
							error instanceof Error ? error.message : t("upload_failed");

						setUploadingFiles((prev) =>
							prev.map((item, i) =>
								i === uploadingFiles.length + index
									? {
											...item,
											status: "error",
											error: errorMessage,
											progress: 0,
										}
									: item,
							),
						);

						toast.error(
							t("upload_error_file", {
								fileName: file.name,
								error: errorMessage,
							}),
						);
						return null;
					}
				});

				const results = await Promise.all(uploadPromises);
				const successfulUploads = results.filter(
					(url): url is string => url !== null,
				);

				if (successfulUploads.length > 0) {
					onScreenshotsChange([...screenshots, ...successfulUploads]);
					toast.success(
						t("upload_success", { count: successfulUploads.length }),
					);
				}
			} catch (error) {
				console.error("Upload error:", error);
				toast.error(t("upload_error"));
			} finally {
				setIsUploading(false);
				setTimeout(() => {
					setUploadingFiles((prev) =>
						prev.filter((item) => item.status === "uploading"),
					);
				}, 3000);
			}
		},
		[
			screenshots,
			onScreenshotsChange,
			pluginSlug,
			maxFiles,
			uploadingFiles.length,
			t,
		],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
		},
		maxSize: maxSizeMB * 1024 * 1024,
		disabled: isUploading || screenshots.length >= maxFiles,
	});

	const removeScreenshot = async (index: number) => {
		const screenshotUrl = screenshots[index];

		try {
			await fetch("/api/upload/images", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ imageUrl: screenshotUrl }),
			});

			const newScreenshots = screenshots.filter((_, i) => i !== index);
			onScreenshotsChange(newScreenshots);
			toast.success(t("screenshot_deleted"));
		} catch (error) {
			console.error("Delete error:", error);
			toast.error(t("delete_error"));
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ImageIcon className="h-5 w-5" />
					{t("screenshots")}
				</CardTitle>
				<CardDescription>
					{t("screenshots_description", { maxFiles, maxSizeMB })}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Dropzone */}
				{screenshots.length < maxFiles && (
					<div
						{...getRootProps()}
						className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
							isDragActive
								? "border-primary bg-primary/5"
								: "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
						}
              ${isUploading ? "cursor-not-allowed opacity-50" : ""}
            `}
					>
						<input {...getInputProps()} />
						<div className="space-y-4">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
								<Upload className="h-6 w-6 text-muted-foreground" />
							</div>
							<div>
								<p className="font-medium text-lg">
									{isDragActive ? t("drop_files") : t("drag_files")}
								</p>
								<p className="text-muted-foreground text-sm">
									{t("or_click_to_select")}
								</p>
							</div>
							<div className="flex justify-center gap-2">
								<Badge variant="outline">PNG</Badge>
								<Badge variant="outline">JPG</Badge>
								<Badge variant="outline">GIF</Badge>
								<Badge variant="outline">WebP</Badge>
							</div>
						</div>
					</div>
				)}

				{/* Uploading Files */}
				{uploadingFiles.length > 0 && (
					<div className="space-y-3">
						<h4 className="font-medium">{t("uploading_files")}</h4>
						{uploadingFiles.map((item, index) => (
							<div key={index} className="rounded-lg bg-muted/30 p-3">
								<div className="mb-2 flex items-center justify-between">
									<span className="truncate font-medium text-sm">
										{item.file.name}
									</span>
									<div className="flex items-center gap-2">
										{item.status === "uploading" && (
											<Loader2 className="h-4 w-4 animate-spin" />
										)}
										{item.status === "success" && (
											<CheckCircle className="h-4 w-4 text-green-500" />
										)}
										{item.status === "error" && (
											<AlertCircle className="h-4 w-4 text-red-500" />
										)}
									</div>
								</div>
								{item.status === "uploading" && (
									<Progress value={item.progress} className="h-2" />
								)}
								{item.status === "error" && item.error && (
									<p className="text-red-500 text-sm">{item.error}</p>
								)}
							</div>
						))}
					</div>
				)}

				{/* Uploaded Screenshots */}
				{screenshots.length > 0 && (
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h4 className="font-medium">{t("uploaded_screenshots")}</h4>
							<Badge variant="outline">
								{screenshots.length} / {maxFiles}
							</Badge>
						</div>
						<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
							{screenshots.map((screenshot, index) => (
								<div key={index} className="group relative">
									<div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
										<Image
											src={screenshot}
											alt={`Screenshot ${index + 1}`}
											fill
											className="object-cover"
											sizes="(max-width: 768px) 50vw, 33vw"
										/>
									</div>
									<Button
										variant="destructive"
										size="sm"
										className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
										onClick={() => removeScreenshot(index)}
									>
										<X className="h-3 w-3" />
									</Button>
									<div className="absolute bottom-2 left-2">
										<Badge variant="secondary" className="text-xs">
											{index + 1}
										</Badge>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Info */}
				<div className="space-y-1 text-muted-foreground text-sm">
					<p>• {t("supported_formats")}</p>
					<p>• {t("max_file_size", { maxSizeMB })}</p>
					<p>• {t("recommended_resolution")}</p>
					<p>• {t("first_screenshot_preview")}</p>
				</div>
			</CardContent>
		</Card>
	);
}
