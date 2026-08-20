"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	AlertTriangle,
	ArrowLeft,
	Eye,
	FileText,
	GitBranch,
	Info,
	Loader2,
	Save,
	Settings,
	Smartphone,
	Tags,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MarkdownEditor } from "~/components/markdown-editor";
import { PageHeader } from "~/components/page-header";
import { PluginManageVersions } from "~/components/plugin-manage-versions";
import { ScreenshotUploader } from "~/components/screenshot-uploader";
import { TagInput } from "~/components/tag-input";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { UploadVersionDialog } from "~/components/upload-version-dialog";
import { safeJsonParse } from "~/lib/utils";
import { api } from "~/trpc/react";

type ExteralessChoice = "unspecified" | "yes" | "no";

type FormData = {
	name: string;
	shortDescription: string;
	description: string;
	categorySlug: string;
	tags: string[];
	minExteraVersion: string;
	exteralessCompatible: ExteralessChoice;
	minExteralessVersion: string;
};

function ManageSkeleton() {
	return (
		<div className="bg-background py-6 sm:py-8" aria-hidden="true">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-6 space-y-4 sm:mb-8">
					<div className="skeleton-shimmer h-9 w-48 rounded-lg" />
					<div className="skeleton-shimmer h-10 w-2/3 max-w-sm rounded-lg" />
					<div className="skeleton-shimmer h-5 w-full max-w-md rounded-md" />
				</div>
				<div className="skeleton-shimmer mb-6 h-11 w-full rounded-lg" />
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<div className="space-y-6 lg:col-span-2">
						<div className="space-y-4 rounded-xl border bg-card p-6">
							<div className="skeleton-shimmer h-5 w-48 rounded-md" />
							<div className="skeleton-shimmer h-11 w-full rounded-lg" />
							<div className="skeleton-shimmer h-11 w-full rounded-lg" />
							<div className="skeleton-shimmer h-48 w-full rounded-lg" />
						</div>
					</div>
					<div className="space-y-6">
						<div className="space-y-4 rounded-xl border bg-card p-6">
							<div className="skeleton-shimmer h-5 w-36 rounded-md" />
							<div className="skeleton-shimmer h-11 w-full rounded-lg" />
							<div className="skeleton-shimmer h-11 w-full rounded-lg" />
						</div>
						<div className="skeleton-shimmer h-16 w-full rounded-xl" />
					</div>
				</div>
			</div>
		</div>
	);
}

export default function PluginManagePage() {
	const params = useParams();
	const router = useRouter();
	const { data: session } = useSession();
	const t = useTranslations("ManagePlugin");
	const reduceMotion = useReducedMotion();
	const slug = params.slug as string;

	const {
		data: plugin,
		isLoading: isPluginLoading,
		error,
		refetch,
	} = api.plugins.getBySlug.useQuery({ slug });
	const { data: categories, isLoading: areCategoriesLoading } =
		api.categories.getAll.useQuery();

	const [formData, setFormData] = useState<FormData>({
		name: "",
		shortDescription: "",
		description: "",
		categorySlug: "",
		tags: [],
		minExteraVersion: "",
		exteralessCompatible: "unspecified",
		minExteralessVersion: "",
	});
	const [screenshots, setScreenshots] = useState<string[]>([]);

	useEffect(() => {
		if (plugin) {
			setFormData({
				name: plugin.name,
				shortDescription: plugin.shortDescription ?? "",
				description: plugin.description,
				categorySlug: plugin.category,
				tags: safeJsonParse<string[]>(plugin.tags ?? "", []),
				minExteraVersion: plugin.minExteraVersion ?? "",
				exteralessCompatible:
					plugin.exteralessCompatible === true
						? "yes"
						: plugin.exteralessCompatible === false
							? "no"
							: "unspecified",
				minExteralessVersion: plugin.minExteralessVersion ?? "",
			});
			setScreenshots(safeJsonParse<string[]>(plugin.screenshots ?? "", []));
		}
	}, [plugin]);

	const updatePlugin = api.plugins.update.useMutation({
		onSuccess: (updatedPlugin) => {
			if (!updatedPlugin) return;
			toast.success(t("toast_updated"));
			router.push(`/my-plugins/${updatedPlugin.slug}/manage`);
		},
		onError: (mutationError) => {
			toast.error(t("toast_update_error", { error: mutationError.message }));
		},
	});

	const deletePlugin = api.plugins.delete.useMutation({
		onSuccess: () => {
			toast.success(t("toast_deleted"));
			router.push("/my-plugins");
		},
		onError: (mutationError) => {
			toast.error(t("toast_delete_error", { error: mutationError.message }));
		},
	});

	const handleSave = () => {
		if (!plugin) return;
		updatePlugin.mutate({
			id: plugin.id,
			...formData,
			tags: JSON.stringify(formData.tags),
			screenshots: JSON.stringify(screenshots),
			minExteraVersion: formData.minExteraVersion.trim() || null,
			exteralessCompatible:
				formData.exteralessCompatible === "unspecified"
					? null
					: formData.exteralessCompatible === "yes",
			minExteralessVersion:
				formData.exteralessCompatible === "yes"
					? formData.minExteralessVersion.trim() || null
					: null,
		});
	};

	const handleDelete = () => {
		if (!plugin) return;
		deletePlugin.mutate({ id: plugin.id });
	};

	const isLoading = isPluginLoading || areCategoriesLoading;

	if (isLoading) {
		return <ManageSkeleton />;
	}

	if (!plugin || error) {
		return (
			<div className="flex min-h-[60dvh] animate-fade-in flex-col items-center justify-center p-4 text-center">
				<AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
				<CardTitle className="mb-2 text-2xl">{t("not_found_title")}</CardTitle>
				<CardDescription>{t("not_found_description")}</CardDescription>
				<Button asChild variant="link" className="mt-4">
					<Link href="/my-plugins">{t("back_to_my_plugins")}</Link>
				</Button>
			</div>
		);
	}

	if (session?.user?.id !== plugin.authorId) {
		return (
			<div className="flex min-h-[60dvh] animate-fade-in flex-col items-center justify-center p-4 text-center">
				<AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
				<CardTitle className="mb-2 text-2xl">
					{t("access_denied_title")}
				</CardTitle>
				<CardDescription>{t("access_denied_description")}</CardDescription>
				<Button asChild variant="link" className="mt-4">
					<Link href="/plugins">{t("browse_plugins")}</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="bg-background py-6 sm:py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<motion.div
					initial={reduceMotion ? false : { opacity: 0, y: 14 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
				>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => router.push("/my-plugins")}
						className="mb-4 -ml-2"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						{t("back")}
					</Button>
					<PageHeader
						badge={t("badge")}
						title={plugin.name}
						description={t("subtitle")}
						icon={Settings}
						align="left"
					>
						<Button asChild className="press-scale w-full sm:w-auto">
							<Link href={`/plugins/${plugin.slug}`} target="_blank">
								<Eye className="mr-2 h-4 w-4" />
								{t("view_public")}
							</Link>
						</Button>
					</PageHeader>
				</motion.div>

				<Tabs defaultValue="edit" className="space-y-6">
					<TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
						<TabsTrigger value="edit" className="min-h-9 gap-2">
							<FileText className="hidden h-4 w-4 sm:block" />
							{t("tab_edit")}
						</TabsTrigger>
						<TabsTrigger value="versions" className="min-h-9 gap-2">
							<GitBranch className="hidden h-4 w-4 sm:block" />
							{t("tab_versions")}
						</TabsTrigger>
						<TabsTrigger value="settings" className="min-h-9 gap-2">
							<Settings className="hidden h-4 w-4 sm:block" />
							{t("tab_settings")}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="edit">
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
							<div className="space-y-6 lg:col-span-2">
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-3">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
												<Info className="h-4 w-4" />
											</span>
											{t("basic_info_title")}
										</CardTitle>
										<CardDescription>
											{t("basic_info_description")}
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-6">
										<div className="space-y-2">
											<Label htmlFor="name">{t("name_label")}</Label>
											<Input
												id="name"
												className="min-h-11"
												value={formData.name}
												onChange={(e) =>
													setFormData((f) => ({ ...f, name: e.target.value }))
												}
												placeholder={t("name_placeholder")}
											/>
											<p className="text-muted-foreground text-xs">
												{t("name_hint")}
											</p>
										</div>
										<div className="space-y-2">
											<Label htmlFor="shortDescription">
												{t("short_description_label")}
											</Label>
											<Input
												id="shortDescription"
												className="min-h-11"
												value={formData.shortDescription}
												onChange={(e) =>
													setFormData((f) => ({
														...f,
														shortDescription: e.target.value,
													}))
												}
												placeholder={t("short_description_placeholder")}
												maxLength={500}
											/>
											<div className="flex items-start justify-between gap-2">
												<p className="text-muted-foreground text-xs">
													{t("short_description_hint")}
												</p>
												<span className="shrink-0 font-mono text-muted-foreground text-xs">
													{formData.shortDescription.length}/500
												</span>
											</div>
										</div>
										<div className="space-y-2">
											<Label>{t("description_label")}</Label>
											<MarkdownEditor
												value={formData.description}
												onChange={(val) =>
													setFormData((f) => ({ ...f, description: val }))
												}
												showImproveButton={true}
												textType="description"
												pluginName={formData.name}
											/>
											<p className="text-muted-foreground text-xs">
												{t("description_hint")}
											</p>
										</div>
									</CardContent>
								</Card>
								<ScreenshotUploader
									screenshots={screenshots}
									onScreenshotsChange={setScreenshots}
								/>
							</div>
							<div className="space-y-6">
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-3">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
												<Tags className="h-4 w-4" />
											</span>
											{t("categorization_title")}
										</CardTitle>
										<CardDescription>
											{t("categorization_description")}
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="space-y-2">
											<Label>{t("category_label")}</Label>
											<Select
												value={formData.categorySlug}
												onValueChange={(val) =>
													setFormData((f) => ({ ...f, categorySlug: val }))
												}
											>
												<SelectTrigger className="min-h-11 w-full">
													<SelectValue
														placeholder={t("category_placeholder")}
													/>
												</SelectTrigger>
												<SelectContent>
													{categories?.map((cat) => (
														<SelectItem key={cat.id} value={cat.slug}>
															{cat.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<p className="text-muted-foreground text-xs">
												{t("category_hint")}
											</p>
										</div>
										<div className="space-y-2">
											<Label>{t("tags_label")}</Label>
											<TagInput
												value={formData.tags}
												onChange={(val) =>
													setFormData((f) => ({ ...f, tags: val }))
												}
												placeholder={t("tags_placeholder")}
											/>
											<p className="text-muted-foreground text-xs">
												{t("tags_hint")}
											</p>
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-3">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
												<Smartphone className="h-4 w-4" />
											</span>
											{t("compatibility_title")}
										</CardTitle>
										<CardDescription>
											{t("compatibility_description")}
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="space-y-2">
											<Label htmlFor="minExteraVersion">
												{t("min_extera_version_label")}
											</Label>
											<Input
												id="minExteraVersion"
												className="min-h-11 font-mono"
												value={formData.minExteraVersion}
												onChange={(e) =>
													setFormData((f) => ({
														...f,
														minExteraVersion: e.target.value,
													}))
												}
												placeholder="11.9.0"
												maxLength={20}
												inputMode="decimal"
											/>
											<p className="text-muted-foreground text-xs">
												{t("min_extera_version_hint")}
											</p>
										</div>
										<div className="space-y-2">
											<Label>{t("exteraless_label")}</Label>
											<div className="flex flex-wrap gap-2">
												{(
													[
														{
															value: "unspecified",
															label: t("exteraless_unspecified"),
														},
														{ value: "yes", label: t("exteraless_yes") },
														{ value: "no", label: t("exteraless_no") },
													] as const
												).map((option) => (
													<button
														key={option.value}
														type="button"
														onClick={() =>
															setFormData((f) => ({
																...f,
																exteralessCompatible: option.value,
															}))
														}
														aria-pressed={
															formData.exteralessCompatible === option.value
														}
														className={`press-scale min-h-9 rounded-full border px-3 font-medium text-xs transition-colors ${
															formData.exteralessCompatible === option.value
																? "border-primary bg-primary text-primary-foreground"
																: "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
														}`}
													>
														{option.label}
													</button>
												))}
											</div>
											<p className="text-muted-foreground text-xs">
												{t("exteraless_hint")}
											</p>
										</div>
										<AnimatePresence initial={false}>
											{formData.exteralessCompatible === "yes" && (
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
													<div className="space-y-2">
														<Label htmlFor="minExteralessVersion">
															{t("min_exteraless_version_label")}
														</Label>
														<Input
															id="minExteralessVersion"
															className="min-h-11 font-mono"
															value={formData.minExteralessVersion}
															onChange={(e) =>
																setFormData((f) => ({
																	...f,
																	minExteralessVersion: e.target.value,
																}))
															}
															placeholder="1.2.0"
															maxLength={20}
															inputMode="decimal"
														/>
														<p className="text-muted-foreground text-xs">
															{t("min_exteraless_version_hint")}
														</p>
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="pt-6">
										<Button
											className="press-scale w-full"
											onClick={handleSave}
											disabled={updatePlugin.isPending}
										>
											{updatePlugin.isPending ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : (
												<Save className="mr-2 h-4 w-4" />
											)}
											{t("save_changes")}
										</Button>
									</CardContent>
								</Card>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="versions">
						<Card>
							<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<span className="eyebrow mb-2">{t("tab_versions")}</span>
									<CardTitle>{t("versions_title")}</CardTitle>
									<CardDescription className="mt-1.5">
										{t("versions_description")}
									</CardDescription>
								</div>
								<UploadVersionDialog
									pluginId={plugin.id}
									onUploadSuccess={() => refetch()}
									pluginName={plugin.name}
								/>
							</CardHeader>
							<CardContent>
								<PluginManageVersions
									pluginId={plugin.id}
									pluginSlug={plugin.slug}
								/>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="settings">
						<Card className="border-destructive/40 bg-destructive/5">
							<CardHeader>
								<CardTitle className="flex items-center gap-3 text-destructive">
									<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
										<AlertTriangle className="h-4 w-4" />
									</span>
									{t("danger_zone_title")}
								</CardTitle>
								<CardDescription>
									{t("danger_zone_description")}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="rounded-lg border border-destructive/30 bg-background p-4">
									<h4 className="font-semibold">{t("delete_plugin_title")}</h4>
									<p className="mb-3 text-muted-foreground text-sm">
										{t("delete_plugin_description")}
									</p>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												variant="destructive"
												className="press-scale w-full sm:w-auto"
											>
												<Trash2 className="mr-2 h-4 w-4" />
												{t("delete_plugin_button")}
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>
													{t("delete_confirm_title")}
												</AlertDialogTitle>
												<AlertDialogDescription>
													{t("delete_confirm_description")}
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
												<AlertDialogAction
													onClick={handleDelete}
													disabled={deletePlugin.isPending}
													className="bg-destructive text-white hover:bg-destructive/90"
												>
													{deletePlugin.isPending && (
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													)}
													{t("confirm_delete")}
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
