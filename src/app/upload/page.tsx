"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	Check,
	CheckCircle2,
	Code,
	ExternalLink,
	FileCode2,
	FileText,
	Info,
	Loader2,
	Smartphone,
	Tags,
	UploadCloud,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { z } from "zod";
import { TagSuggest } from "~/components/ai/tag-suggest";
import { SmartCaptcha } from "~/components/captcha/smart-captcha";
import { MarkdownEditor } from "~/components/markdown-editor";
import { PageHeader } from "~/components/page-header";
import { PluginDependencyPicker } from "~/components/plugin-dependency-picker";
import { ScreenshotUploader } from "~/components/screenshot-uploader";
import { TagInput } from "~/components/tag-input";
import { TextImprovementButton } from "~/components/text-improvement-button";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import {
	normalizePluginVersion,
	PLUGIN_VERSION_PATTERN,
} from "~/lib/plugin-version";
import { formatBytes } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

const buildFormSchema = (t: (key: string) => string) =>
	z.object({
		name: z
			.string()
			.min(1, t("error_name_required"))
			.max(256, t("error_name_max")),
		shortDescription: z
			.string()
			.min(1, t("error_short_required"))
			.max(500, t("error_short_max")),
		description: z.string().optional(),
		categorySlug: z.string().optional(),
		tags: z.array(z.string()).optional(),
		version: z
			.string()
			.min(1, t("error_version_required"))
			.max(50, t("error_version_max"))
			.regex(PLUGIN_VERSION_PATTERN, t("error_version_invalid")),
		changelog: z.string().optional(),
		githubUrl: z
			.string()
			.optional()
			.refine((val) => !val || val === "" || z.url().safeParse(val).success, {
				message: t("error_github_url"),
			}),
		documentationUrl: z
			.string()
			.optional()
			.refine((val) => !val || val === "" || z.url().safeParse(val).success, {
				message: t("error_docs_url"),
			}),
		minExteraVersion: z
			.string()
			.optional()
			.refine(
				(val) =>
					!val ||
					val.trim() === "" ||
					(val.trim().length <= 20 && /^\d+(\.\d+)*$/.test(val.trim())),
				{
					message: t("error_min_extera_version"),
				},
			),
		exteralessCompatible: z.enum(["unspecified", "yes", "no"]),
		sourceLocale: z.enum(["ru", "en"]),
		minExteralessVersion: z
			.string()
			.optional()
			.refine(
				(val) =>
					!val ||
					val.trim() === "" ||
					(val.trim().length <= 20 && /^\d+(\.\d+)*$/.test(val.trim())),
				{
					message: t("error_min_exteraless_version"),
				},
			),
	});

type FormData = z.infer<ReturnType<typeof buildFormSchema>>;

export default function UploadPluginPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const t = useTranslations("UploadPage");
	const locale = useLocale();
	const reduceMotion = useReducedMotion();
	const [fileContent, setFileContent] = useState("");
	const [fileName, setFileName] = useState<string | null>(null);
	const [screenshots, setScreenshots] = useState<string[]>([]);
	const [captchaToken, setCaptchaToken] = useState<string>("");
	const [isSuccess, setIsSuccess] = useState(false);
	const [dependencyPluginIds, setDependencyPluginIds] = useState<number[]>([]);

	const { data: categories, isLoading: areCategoriesLoading } =
		api.categories.getAll.useQuery();

	const formSchema = useMemo(() => buildFormSchema(t), [t]);

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			shortDescription: "",
			description: "",
			categorySlug: "",
			tags: [],
			version: "1.0.0",
			changelog: "",
			githubUrl: "",
			documentationUrl: "",
			minExteraVersion: "",
			exteralessCompatible: "unspecified",
			sourceLocale: locale === "ru" ? "ru" : "en",
			minExteralessVersion: "",
		},
	});

	const watchedName = form.watch("name");
	const watchedShortDescription = form.watch("shortDescription");
	const watchedSourceLocale = form.watch("sourceLocale");
	const [debouncedName] = useDebounce(watchedName, 300);
	const { data: similar } = api.plugins.similarByName.useQuery(
		{ name: debouncedName || "", limit: 5 },
		{ enabled: (debouncedName || "").trim().length >= 2 },
	);

	type SimilarPlugin = RouterOutputs["plugins"]["similarByName"][number];

	const createPlugin = api.pluginUpload.create.useMutation({
		onSuccess: (plugin) => {
			setIsSuccess(true);
			toast.success(t("toast_success"), {
				id: "plugin-upload",
				description: t("toast_success_description"),
			});
			setTimeout(() => {
				router.push(`/plugins/${plugin.slug}`);
			}, 1600);
		},
		onError: (error) => {
			console.error("Plugin creation error:", error);

			try {
				const errorData = JSON.parse(error.message);
				if (Array.isArray(errorData)) {
					const fieldErrors = errorData.map(
						(err: { path?: string[]; message?: string }) => {
							const fieldName = err.path?.[0];
							const message = err.message ?? "";

							switch (fieldName) {
								case "githubUrl":
									return t("error_github_hint");
								case "documentationUrl":
									return t("error_docs_hint");
								case "name":
									return t("error_name_prefix", { message });
								case "shortDescription":
									return t("error_short_prefix", { message });
								default:
									return `${fieldName}: ${message}`;
							}
						},
					);

					toast.error(`${t("form_errors")}\n${fieldErrors.join("\n")}`, {
						id: "plugin-upload",
					});
					return;
				}
			} catch (_e) {}

			toast.error(t("toast_error", { error: error.message }), {
				id: "plugin-upload",
			});
		},
	});

	const onSubmit = async (data: FormData) => {
		if (!session) {
			router.push("/auth/signin");
			return;
		}

		if (!fileContent) {
			toast.error(t("toast_file_required"));
			return;
		}

		if (!captchaToken) {
			toast.error(t("toast_captcha_required"));
			return;
		}

		const cleanedData = {
			...data,
			version: normalizePluginVersion(data.version),
			category: data.categorySlug || "utility",
			description: data.description || data.shortDescription,
			githubUrl: data.githubUrl?.trim() || undefined,
			documentationUrl: data.documentationUrl?.trim() || undefined,
			minExteraVersion: data.minExteraVersion?.trim() || undefined,
			exteralessCompatible:
				data.exteralessCompatible === "unspecified"
					? undefined
					: data.exteralessCompatible === "yes",
			minExteralessVersion:
				data.exteralessCompatible === "yes"
					? data.minExteralessVersion?.trim() || undefined
					: undefined,
			screenshots: JSON.stringify(screenshots),
			fileContent,
			filename: fileName || undefined,
			dependencyPluginIds,
			captchaToken,
		};

		toast.loading(t("toast_saving"), {
			id: "plugin-upload",
			description: t("toast_saving_description"),
		});
		createPlugin.mutate(cleanedData);
	};

	const onFileDrop = useCallback(
		(acceptedFiles: File[]) => {
			const file = acceptedFiles[0];
			if (
				file &&
				(file.name.endsWith(".py") || file.name.endsWith(".plugin"))
			) {
				setFileName(file.name);
				const reader = new FileReader();
				reader.onload = (event) => {
					setFileContent(event.target?.result as string);
				};
				reader.readAsText(file);
			} else {
				toast.error(t("toast_invalid_file"));
			}
		},
		[t],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop: onFileDrop,
		multiple: false,
	});

	const clearFile = (e: React.MouseEvent) => {
		e.stopPropagation();
		setFileContent("");
		setFileName(null);
	};

	if (!session) {
		return (
			<div className="flex min-h-[60dvh] items-center justify-center px-4">
				<Card className="w-full max-w-md animate-scale-in text-center">
					<CardHeader>
						<CardTitle>{t("login_required")}</CardTitle>
						<CardDescription>{t("login_required_description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild className="w-full">
							<Link href="/auth/signin">{t("login")}</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (isSuccess) {
		return (
			<div className="flex min-h-[60dvh] items-center justify-center px-4">
				<div className="animate-scale-in text-center">
					<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
						<CheckCircle2 className="h-10 w-10 text-primary" />
					</div>
					<h2 className="mb-2 font-bold text-2xl sm:text-3xl">
						{t("success_title")}
					</h2>
					<p className="text-muted-foreground">{t("success_description")}</p>
				</div>
			</div>
		);
	}

	const steps = [
		{
			num: "01",
			label: t("step_details"),
			done:
				watchedName.trim().length > 0 &&
				watchedShortDescription.trim().length > 0,
		},
		{ num: "02", label: t("step_file"), done: !!fileContent },
		{ num: "03", label: t("step_publish"), done: !!captchaToken },
	];

	return (
		<section className="bg-background py-4 sm:py-8 md:py-12">
			<div className="container mx-auto max-w-6xl px-3 sm:px-4">
				<PageHeader
					badge={t("badge")}
					title={t("title")}
					description={t("subtitle")}
					icon={UploadCloud}
				/>

				<div
					className="mb-6 grid animate-fade-up grid-cols-3 gap-2 sm:mb-8 sm:gap-4"
					style={{ animationDelay: "80ms" }}
				>
					{steps.map((step) => (
						<div
							key={step.num}
							className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors duration-300 sm:flex-row sm:gap-3 sm:p-4 sm:text-left ${
								step.done
									? "border-primary/40 bg-primary/5 shadow-primary/5 shadow-sm"
									: "border-border bg-card shadow-soft"
							}`}
						>
							<div
								className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono font-semibold text-sm transition-colors duration-300 ${
									step.done
										? "bg-primary text-primary-foreground"
										: "bg-primary/10 text-primary"
								}`}
							>
								<AnimatePresence mode="wait" initial={false}>
									{step.done ? (
										<motion.span
											key="check"
											initial={
												reduceMotion ? false : { scale: 0.5, opacity: 0 }
											}
											animate={{ scale: 1, opacity: 1 }}
											transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
											className="flex"
										>
											<Check className="h-4 w-4" />
										</motion.span>
									) : (
										<motion.span
											key="num"
											initial={
												reduceMotion ? false : { scale: 0.5, opacity: 0 }
											}
											animate={{ scale: 1, opacity: 1 }}
											transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
										>
											{step.num}
										</motion.span>
									)}
								</AnimatePresence>
							</div>
							<span
								className={`font-medium text-xs sm:text-sm ${
									step.done ? "text-foreground" : "text-muted-foreground"
								}`}
							>
								{step.label}
							</span>
						</div>
					))}
				</div>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4 sm:space-y-6"
					>
						<div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
							<div className="space-y-4 sm:space-y-6 xl:col-span-2">
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-3 text-base sm:text-lg">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
												<Info className="h-4 w-4" />
											</span>
											{t("basic_info")}
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4 sm:space-y-6">
										<FormField
											control={form.control}
											name="sourceLocale"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("source_language_label")}</FormLabel>
													<Select
														value={field.value}
														onValueChange={field.onChange}
													>
														<FormControl>
															<SelectTrigger className="min-h-11 w-full">
																<SelectValue />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															<SelectItem value="ru">Русский</SelectItem>
															<SelectItem value="en">English</SelectItem>
														</SelectContent>
													</Select>
													<FormDescription className="text-xs">
														{t("source_language_hint")}
													</FormDescription>
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="name"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														{t("name_label")}
														<span
															className="text-destructive"
															aria-hidden="true"
														>
															*
														</span>
													</FormLabel>
													<FormControl>
														<Input
															className="min-h-11"
															placeholder={t("name_placeholder")}
															{...field}
														/>
													</FormControl>
													<FormDescription className="text-xs">
														{t("name_hint")}
													</FormDescription>
													<FormMessage />
													{(similar?.length ?? 0) > 0 && (
														<div className="mt-2 rounded-lg border bg-muted/40 p-3 text-xs">
															<div className="mb-2 font-medium text-muted-foreground">
																{t("similar_found")}
															</div>
															<ul className="space-y-1">
																{similar?.map((p: SimilarPlugin) => (
																	<li
																		key={p.id}
																		className="flex items-center justify-between gap-2"
																	>
																		<div className="truncate">
																			<span className="font-medium">
																				{p.name}
																			</span>
																			{p.shortDescription && (
																				<span className="ml-2 text-muted-foreground">
																					{p.shortDescription}
																				</span>
																			)}
																		</div>
																		<Link
																			className="shrink-0 text-primary underline"
																			href={`/plugins/${p.slug}`}
																		>
																			{t("open")}
																		</Link>
																	</li>
																))}
															</ul>
														</div>
													)}
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="shortDescription"
											render={({ field }) => (
												<FormItem>
													<div className="flex items-center justify-between gap-3">
														<FormLabel>
															{t("short_description_label")}
															<span
																className="text-destructive"
																aria-hidden="true"
															>
																*
															</span>
														</FormLabel>
														<TextImprovementButton
															text={field.value}
															textType="shortDescription"
															pluginName={watchedName}
															locale={watchedSourceLocale}
															onImprovedText={field.onChange}
															variant="ghost"
														/>
													</div>
													<FormControl>
														<Input
															className="min-h-11"
															placeholder={t("short_description_placeholder")}
															maxLength={500}
															{...field}
														/>
													</FormControl>
													<div className="flex items-start justify-between gap-2">
														<FormDescription className="text-xs">
															{t("short_description_hint")}
														</FormDescription>
														<span className="shrink-0 font-mono text-muted-foreground text-xs">
															{field.value.length}/500
														</span>
													</div>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="description"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("description_label")}</FormLabel>
													<FormControl>
														<MarkdownEditor
															value={field.value || ""}
															onChange={field.onChange}
															height={300}
															showImproveButton={true}
															textType="description"
															pluginName={watchedName}
															improvementLocale={watchedSourceLocale}
														/>
													</FormControl>
													<FormDescription className="text-xs">
														{t("description_hint")}
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
									</CardContent>
								</Card>

								<ScreenshotUploader
									screenshots={screenshots}
									onScreenshotsChange={setScreenshots}
								/>

								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-3 text-base sm:text-lg">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
												<FileText className="h-4 w-4" />
											</span>
											{t("version_changelog_title")}
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4 sm:space-y-6">
										<FormField
											control={form.control}
											name="version"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														{t("version_label")}
														<span
															className="text-destructive"
															aria-hidden="true"
														>
															*
														</span>
													</FormLabel>
													<FormControl>
														<Input
															className="min-h-11 font-mono"
															placeholder="1.0.0"
															{...field}
														/>
													</FormControl>
													<FormDescription className="text-xs">
														{t("version_hint")}
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
													<FormLabel>{t("changelog_label")}</FormLabel>
													<FormControl>
														<MarkdownEditor
															value={field.value || ""}
															onChange={field.onChange}
															height={150}
															placeholder={t("changelog_placeholder")}
															showImproveButton={true}
															textType="changelog"
															pluginName={watchedName}
															improvementLocale={watchedSourceLocale}
														/>
													</FormControl>
													<FormDescription className="text-xs">
														{t("changelog_hint")}
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
									</CardContent>
								</Card>
							</div>

							<div className="space-y-4 sm:space-y-6 xl:col-span-1">
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-3 text-base sm:text-lg">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
												<Tags className="h-4 w-4" />
											</span>
											{t("organization_title")}
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4 sm:space-y-6">
										<FormField
											control={form.control}
											name="categorySlug"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("category_label")}</FormLabel>
													<Select
														onValueChange={field.onChange}
														value={field.value}
													>
														<FormControl>
															<SelectTrigger className="min-h-11 w-full">
																<SelectValue
																	placeholder={t("category_placeholder")}
																/>
															</SelectTrigger>
														</FormControl>
														<SelectContent className="max-h-[200px] overflow-y-auto">
															{areCategoriesLoading ? (
																<SelectItem value="loading" disabled>
																	{t("loading")}
																</SelectItem>
															) : (
																categories?.map((cat) => (
																	<SelectItem key={cat.id} value={cat.slug}>
																		{cat.name}
																	</SelectItem>
																))
															)}
														</SelectContent>
													</Select>
													<FormDescription className="text-xs">
														{t("category_hint")}
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="tags"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("tags_label")}</FormLabel>
													<FormControl>
														<TagInput
															value={field.value || []}
															onChange={field.onChange}
															placeholder={t("tags_placeholder")}
														/>
													</FormControl>
													<FormDescription className="text-xs">
														{t("tags_hint")}
													</FormDescription>
													<FormMessage />
													<TagSuggest
														name={watchedName}
														description={
															form.watch("description") ||
															watchedShortDescription
														}
														currentTags={field.value || []}
														onAddTag={(tag) =>
															field.onChange([...(field.value || []), tag])
														}
														onApplyCategory={(categorySlug) =>
															form.setValue("categorySlug", categorySlug, {
																shouldDirty: true,
															})
														}
														categories={categories?.map((cat) => ({
															slug: cat.slug,
															name: cat.name,
														}))}
													/>
												</FormItem>
											)}
										/>
									</CardContent>
								</Card>

								<PluginDependencyPicker
									selectedIds={dependencyPluginIds}
									onChange={setDependencyPluginIds}
									disabled={createPlugin.isPending}
								/>

								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-3 text-base sm:text-lg">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
												<ExternalLink className="h-4 w-4" />
											</span>
											{t("links_title")}
											<span className="hidden font-normal text-muted-foreground text-sm sm:inline">
												{t("links_optional")}
											</span>
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3 sm:space-y-4">
										<FormField
											control={form.control}
											name="githubUrl"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("github_label")}</FormLabel>
													<FormControl>
														<Input
															className="min-h-11"
															type="url"
															placeholder="https://github.com/username/repo"
															{...field}
														/>
													</FormControl>
													<FormDescription className="text-xs">
														{t("github_url_hint")}
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="documentationUrl"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("docs_label")}</FormLabel>
													<FormControl>
														<Input
															className="min-h-11"
															type="url"
															placeholder="https://docs.example.com/plugin"
															{...field}
														/>
													</FormControl>
													<FormDescription className="text-xs">
														{t("docs_url_hint")}
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-3 text-base sm:text-lg">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
												<Smartphone className="h-4 w-4" />
											</span>
											{t("compatibility_title")}
											<span className="hidden font-normal text-muted-foreground text-sm sm:inline">
												{t("links_optional")}
											</span>
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3 sm:space-y-4">
										<FormField
											control={form.control}
											name="minExteraVersion"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("min_extera_version_label")}</FormLabel>
													<FormControl>
														<Input
															className="min-h-11 font-mono"
															placeholder="11.9.0"
															maxLength={20}
															inputMode="decimal"
															{...field}
														/>
													</FormControl>
													<FormDescription className="text-xs">
														{t("min_extera_version_hint")}
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="exteralessCompatible"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{t("exteraless_label")}</FormLabel>
													<FormControl>
														<div className="flex flex-wrap gap-2">
															{(
																[
																	{
																		value: "unspecified",
																		label: t("exteraless_unspecified"),
																	},
																	{
																		value: "yes",
																		label: t("exteraless_yes"),
																	},
																	{
																		value: "no",
																		label: t("exteraless_no"),
																	},
																] as const
															).map((option) => (
																<button
																	key={option.value}
																	type="button"
																	onClick={() => field.onChange(option.value)}
																	aria-pressed={field.value === option.value}
																	className={`press-scale min-h-9 rounded-full border px-3 font-medium text-xs transition-colors ${
																		field.value === option.value
																			? "border-primary bg-primary text-primary-foreground"
																			: "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
																	}`}
																>
																	{option.label}
																</button>
															))}
														</div>
													</FormControl>
													<FormDescription className="text-xs">
														{t("exteraless_hint")}
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>

										<AnimatePresence initial={false}>
											{form.watch("exteralessCompatible") === "yes" && (
												<motion.div
													key="min-exteraless-version"
													initial={
														reduceMotion
															? false
															: { opacity: 0, height: 0, y: -6 }
													}
													animate={{ opacity: 1, height: "auto", y: 0 }}
													exit={
														reduceMotion
															? undefined
															: { opacity: 0, height: 0, y: -6 }
													}
													transition={{
														duration: 0.25,
														ease: [0.16, 1, 0.3, 1],
													}}
													className="overflow-hidden"
												>
													<FormField
														control={form.control}
														name="minExteralessVersion"
														render={({ field }) => (
															<FormItem>
																<FormLabel>
																	{t("min_exteraless_version_label")}
																</FormLabel>
																<FormControl>
																	<Input
																		className="min-h-11 font-mono"
																		placeholder="1.2.0"
																		maxLength={20}
																		inputMode="decimal"
																		{...field}
																	/>
																</FormControl>
																<FormDescription className="text-xs">
																	{t("min_exteraless_version_hint")}
																</FormDescription>
																<FormMessage />
															</FormItem>
														)}
													/>
												</motion.div>
											)}
										</AnimatePresence>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-3 text-base sm:text-lg">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
												<Code className="h-4 w-4" />
											</span>
											{t("file_title")}
										</CardTitle>
										<CardDescription className="text-sm">
											{t("file_description")}
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div
											{...getRootProps()}
											className={`tap-highlight-none relative min-h-32 cursor-pointer rounded-2xl bg-surface p-6 text-center outline-none ring-1 ring-transparent transition-[background-color,box-shadow,transform] duration-200 focus-visible:ring-[3px] focus-visible:ring-primary/20 ${
												isDragActive
													? `bg-primary/10 ${reduceMotion ? "" : "scale-[1.02]"}`
													: "hover:bg-accent/75"
											}`}
										>
											<input {...getInputProps()} />
											{fileContent && fileName ? (
												<div className="space-y-2">
													<div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
														<FileCode2 className="h-5 w-5" />
													</div>
													<p className="break-all font-medium text-sm">
														{fileName}
													</p>
													<p className="text-muted-foreground text-xs">
														{t("file_selected", {
															size: formatBytes(fileContent.length),
														})}
													</p>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={clearFile}
														className="text-muted-foreground"
													>
														<X className="mr-1 h-3.5 w-3.5" />
														{t("file_remove")}
													</Button>
												</div>
											) : (
												<div className="space-y-2">
													<div
														className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform ${
															isDragActive && !reduceMotion ? "scale-110" : ""
														}`}
													>
														<UploadCloud className="h-5 w-5" />
													</div>
													<p className="font-medium text-sm">
														{isDragActive
															? t("file_drop_here")
															: t("file_drag_drop")}
													</p>
													<p className="text-muted-foreground text-xs">
														{t("file_or_browse")}
													</p>
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							</div>
						</div>

						<Card>
							<CardContent className="pt-6">
								<SmartCaptcha
									onSuccess={setCaptchaToken}
									onError={() => setCaptchaToken("")}
								/>
							</CardContent>
						</Card>

						<div className="flex flex-col justify-end gap-3 pb-safe sm:flex-row sm:gap-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => router.back()}
								className="w-full sm:w-auto"
							>
								{t("cancel")}
							</Button>
							<Button
								type="submit"
								disabled={
									createPlugin.isPending || !fileContent || !captchaToken
								}
								className="press-scale w-full sm:w-auto"
							>
								{createPlugin.isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<UploadCloud className="mr-2 h-4 w-4" />
								)}
								<span className="hidden sm:inline">{t("submit")}</span>
								<span className="sm:hidden">{t("submit_short")}</span>
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</section>
	);
}
