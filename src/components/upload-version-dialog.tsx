"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SmartCaptcha } from "~/components/captcha/smart-captcha";
import { MarkdownEditor } from "~/components/markdown-editor";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";

interface UploadVersionDialogProps {
	pluginId: number;
	onUploadSuccess: () => void;
	pluginName?: string;
}

interface UploadVersionForm {
	version: string;
	fileContent: string;
	changelog?: string;
	isStable: boolean;
}

export function UploadVersionDialog({
	pluginId,
	onUploadSuccess,
	pluginName,
}: UploadVersionDialogProps) {
	const t = useTranslations("UploadVersionDialog");
	const [open, setOpen] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [captchaToken, setCaptchaToken] = useState<string>("");
	const [captchaKey, setCaptchaKey] = useState(0);

	const uploadVersionSchema = useMemo(
		() =>
			z.object({
				version: z
					.string()
					.min(1, t("version_required"))
					.max(50, t("version_too_long")),
				fileContent: z.string().min(1, t("file_required")),
				changelog: z.string().optional(),
				isStable: z.boolean(),
			}),
		[t],
	);

	const form = useForm<UploadVersionForm>({
		resolver: zodResolver(uploadVersionSchema),
		defaultValues: {
			version: "",
			fileContent: "",
			changelog: "",
			isStable: true,
		},
	});

	const createVersionMutation = api.pluginUpload.createVersion.useMutation({
		onSuccess: () => {
			toast.success(t("upload_success"));
			setOpen(false);
			form.reset();
			setFile(null);
			setCaptchaToken("");
			onUploadSuccess();
		},
		onError: (error) => {
			setCaptchaToken("");
			setCaptchaKey((value) => value + 1);
			toast.error(t("upload_error", { error: error.message }));
		},
	});

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = event.target.files?.[0];
		if (
			selectedFile &&
			(selectedFile.name.endsWith(".py") ||
				selectedFile.name.endsWith(".plugin") ||
				selectedFile.name.endsWith(".txt"))
		) {
			setFile(selectedFile);
			const reader = new FileReader();
			reader.onload = (e) => {
				const content = e.target?.result as string;
				form.setValue("fileContent", content);
			};
			reader.readAsText(selectedFile);
		} else {
			toast.error(t("invalid_file_type"));
		}
	};

	const onSubmit = (data: UploadVersionForm) => {
		if (!captchaToken) {
			toast.error(t("captcha_required"));
			return;
		}

		createVersionMutation.mutate({
			pluginId,
			...data,
			filename: file?.name,
			captchaToken,
		});
	};

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		setCaptchaToken("");
		setCaptchaKey((value) => value + 1);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button className="press-scale min-h-11 w-full sm:w-auto">
					<Upload className="mr-2 h-4 w-4" />
					<span className="hidden sm:inline">{t("upload_new_version")}</span>
					<span className="sm:hidden">{t("upload_version")}</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-h-[85vh]">
				<DialogHeader>
					<DialogTitle className="text-lg sm:text-xl">
						{t("upload_new_version")}
					</DialogTitle>
					<DialogDescription className="text-sm">
						{t("upload_new_version_description")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4 sm:space-y-6"
					>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
							<FormField
								control={form.control}
								name="version"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="font-medium text-sm">
											{t("version")} *
										</FormLabel>
										<FormControl>
											<Input
												placeholder={t("version_placeholder")}
												{...field}
												className="text-sm"
											/>
										</FormControl>
										<FormDescription className="text-xs">
											{t("semantic_version")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isStable"
								render={({ field }) => (
									<FormItem className="flex flex-col space-y-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:p-4">
										<div className="space-y-0.5">
											<FormLabel className="font-medium text-sm sm:text-base">
												{t("stable_version")}
											</FormLabel>
											<FormDescription className="text-xs sm:text-sm">
												{t("stable_version_description")}
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="fileContent"
							render={() => (
								<FormItem>
									<FormLabel className="font-medium text-sm">
										{t("plugin_file")} *
									</FormLabel>
									<FormControl>
										<div className="space-y-2">
											<Input
												type="file"
												accept=".py,.plugin,.txt"
												onChange={handleFileChange}
												className="cursor-pointer text-sm"
											/>
											{file && (
												<p className="break-all text-muted-foreground text-xs sm:text-sm">
													{t("selected_file")}: {file.name}
												</p>
											)}
										</div>
									</FormControl>
									<FormDescription className="text-xs sm:text-sm">
										{t("upload_plugin_file_description")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="changelog"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="font-medium text-sm">
										{t("changelog")}
									</FormLabel>
									<FormControl>
										<MarkdownEditor
											value={field.value || ""}
											onChange={field.onChange}
											height={120}
											placeholder={t("changelog_placeholder")}
											showImproveButton={true}
											textType="changelog"
											pluginName={pluginName}
										/>
									</FormControl>
									<FormDescription className="text-xs sm:text-sm">
										{t("changelog_description")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<SmartCaptcha
							key={captchaKey}
							onSuccess={setCaptchaToken}
							onError={() => setCaptchaToken("")}
						/>

						<div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								className="min-h-11 w-full sm:w-auto"
							>
								{t("cancel")}
							</Button>
							<Button
								type="submit"
								disabled={createVersionMutation.isPending || !captchaToken}
								className="press-scale min-h-11 w-full sm:w-auto"
							>
								{createVersionMutation.isPending && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								{t("upload_version")}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
