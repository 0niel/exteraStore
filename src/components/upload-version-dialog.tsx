"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "~/trpc/react";

import { Loader2, Upload } from "lucide-react";
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
import { MarkdownEditor } from "~/components/markdown-editor";

const uploadVersionSchema = z.object({
	version: z
		.string()
		.min(1, "Версия обязательна")
		.max(50, "Версия слишком длинная"),
	fileContent: z.string().min(1, "Файл обязателен"),
	changelog: z.string().optional(),
	isStable: z.boolean(),
});

interface UploadVersionDialogProps {
	pluginId: number;
	onUploadSuccess: () => void;
	pluginName?: string;
}

type UploadVersionForm = z.infer<typeof uploadVersionSchema>;

export function UploadVersionDialog({
	pluginId,
	onUploadSuccess,
	pluginName,
}: UploadVersionDialogProps) {
	const t = useTranslations("UploadVersionDialog");
	const [open, setOpen] = useState(false);
	const [file, setFile] = useState<File | null>(null);

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
			onUploadSuccess();
		},
		onError: (error) => {
			toast.error(t("upload_error", { error: error.message }));
		},
	});

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = event.target.files?.[0];
		if (selectedFile) {
			setFile(selectedFile);
			const reader = new FileReader();
			reader.onload = (e) => {
				const content = e.target?.result as string;
				form.setValue("fileContent", content);
			};
			reader.readAsText(selectedFile);
		}
	};

	const onSubmit = (data: UploadVersionForm) => {
		createVersionMutation.mutate({
			pluginId,
			...data,
		});
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Upload className="mr-2 h-4 w-4" />
					{t("upload_new_version")}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{t("upload_new_version")}</DialogTitle>
					<DialogDescription>
						{t("upload_new_version_description")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="version"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("version")} *</FormLabel>
										<FormControl>
											<Input
												placeholder={t("version_placeholder")}
												{...field}
											/>
										</FormControl>
										<FormDescription>{t("semantic_version")}</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isStable"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
										<div className="space-y-0.5">
											<FormLabel className="text-base">
												{t("stable_version")}
											</FormLabel>
											<FormDescription>
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
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("plugin_file")} *</FormLabel>
									<FormControl>
										<div className="space-y-2">
											<Input
												type="file"
												accept=".py,.txt"
												onChange={handleFileChange}
												className="cursor-pointer"
											/>
											{file && (
												<p className="text-muted-foreground text-sm">
													{t("selected_file")}: {file.name}
												</p>
											)}
										</div>
									</FormControl>
									<FormDescription>
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
									<FormLabel>{t("changelog")}</FormLabel>
									<FormControl>
										<MarkdownEditor
											value={field.value || ""}
											onChange={field.onChange}
											height={150}
											placeholder={t("changelog_placeholder")}
											showImproveButton={true}
											textType="changelog"
											pluginName={pluginName}
										/>
									</FormControl>
									<FormDescription>
										{t("changelog_description")}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
							>
								{t("cancel")}
							</Button>
							<Button type="submit" disabled={createVersionMutation.isPending}>
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
