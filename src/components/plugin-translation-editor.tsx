"use client";

import { AlertCircle, Check, Languages, Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MarkdownEditor } from "~/components/markdown-editor";
import { TagInput } from "~/components/tag-input";
import { TextImprovementButton } from "~/components/text-improvement-button";
import { Badge } from "~/components/ui/badge";
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
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

type Locale = "ru" | "en";

type TranslationForm = {
	name: string;
	shortDescription: string;
	description: string;
	requirements: string;
	changelog: string;
	tags: string[];
};

const EMPTY_FORM: TranslationForm = {
	name: "",
	shortDescription: "",
	description: "",
	requirements: "",
	changelog: "",
	tags: [],
};

function parseTags(tags: string | null) {
	if (!tags) return [];
	try {
		const value: unknown = JSON.parse(tags);
		return Array.isArray(value)
			? value.filter((tag): tag is string => typeof tag === "string")
			: [];
	} catch {
		return [];
	}
}

export function PluginTranslationEditor({ pluginId }: { pluginId: number }) {
	const t = useTranslations("Translations");
	const uiLocale = useLocale();
	const utils = api.useUtils();
	const [activeLocale, setActiveLocale] = useState<Locale>(
		uiLocale === "ru" ? "ru" : "en",
	);
	const [form, setForm] = useState<TranslationForm>(EMPTY_FORM);
	const { data, isLoading } = api.translations.getPlugin.useQuery({ pluginId });
	const activeTranslation = useMemo(
		() =>
			data?.translations.find(
				(translation) => translation.locale === activeLocale,
			),
		[data, activeLocale],
	);
	const isSource = data?.sourceLocale === activeLocale || !data?.sourceLocale;

	useEffect(() => {
		if (!data) return;
		if (data.sourceLocale === activeLocale || !data.sourceLocale) {
			setForm({
				name: data.source.name,
				shortDescription: data.source.shortDescription ?? "",
				description: data.source.description,
				requirements: data.source.requirements ?? "",
				changelog: data.source.changelog ?? "",
				tags: parseTags(data.source.tags),
			});
			return;
		}
		if (activeTranslation) {
			setForm({
				name: activeTranslation.name,
				shortDescription: activeTranslation.shortDescription ?? "",
				description: activeTranslation.description,
				requirements: activeTranslation.requirements ?? "",
				changelog: activeTranslation.changelog ?? "",
				tags: activeTranslation.tags,
			});
			return;
		}
		setForm(EMPTY_FORM);
	}, [data, activeLocale, activeTranslation]);

	const save = api.translations.savePlugin.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.translations.getPlugin.invalidate({ pluginId }),
				utils.plugins.getBySlug.invalidate(),
			]);
			toast.success(t("saved"));
		},
		onError: (error) => toast.error(error.message),
	});

	const generate = api.translations.generatePlugin.useMutation({
		onSuccess: async () => {
			await utils.translations.getPlugin.invalidate({ pluginId });
			toast.success(t("generated"));
		},
		onError: (error) => toast.error(error.message),
	});

	if (isLoading) {
		return <div className="skeleton-shimmer h-96 rounded-2xl" />;
	}

	return (
		<Card className="overflow-hidden">
			<CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<CardTitle className="flex items-center gap-3">
						<span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<Languages className="size-5" />
						</span>
						{t("title")}
					</CardTitle>
					<CardDescription className="mt-2 max-w-2xl">
						{t("description")}
					</CardDescription>
				</div>
				<div className="grid grid-cols-2 rounded-xl bg-muted p-1">
					{(["ru", "en"] as const).map((locale) => (
						<button
							key={locale}
							type="button"
							onClick={() => setActiveLocale(locale)}
							className={`min-h-10 rounded-lg px-4 font-semibold text-sm transition-colors ${
								activeLocale === locale
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{locale === "ru" ? "Русский" : "English"}
						</button>
					))}
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={isSource ? "default" : "secondary"}>
						{isSource
							? t("original")
							: activeTranslation?.origin === "manual"
								? t("manual")
								: activeTranslation
									? t("ai_generated")
									: t("missing")}
					</Badge>
					{activeTranslation?.stale ? (
						<Badge variant="outline" className="gap-1 text-amber-600">
							<AlertCircle className="size-3.5" />
							{t("outdated")}
						</Badge>
					) : activeTranslation || isSource ? (
						<Badge variant="outline" className="gap-1 text-emerald-600">
							<Check className="size-3.5" />
							{t("ready")}
						</Badge>
					) : null}
				</div>

				{!isSource && (
					<div className="rounded-2xl bg-primary/6 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
						<div>
							<p className="font-semibold text-sm">{t("ai_title")}</p>
							<p className="mt-1 text-muted-foreground text-xs">
								{t("ai_hint")}
							</p>
						</div>
						<Button
							type="button"
							className="mt-3 w-full sm:mt-0 sm:w-auto"
							disabled={
								generate.isPending || activeTranslation?.origin === "manual"
							}
							onClick={() =>
								generate.mutate({ pluginId, targetLocale: activeLocale })
							}
						>
							{generate.isPending ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : (
								<Sparkles className="mr-2 size-4" />
							)}
							{activeTranslation ? t("refresh_ai") : t("generate_ai")}
						</Button>
					</div>
				)}

				<div className="grid gap-5">
					<div className="space-y-2">
						<Label htmlFor={`translation-name-${activeLocale}`}>
							{t("name")}
						</Label>
						<Input
							id={`translation-name-${activeLocale}`}
							value={form.name}
							onChange={(event) =>
								setForm((current) => ({ ...current, name: event.target.value }))
							}
							maxLength={256}
						/>
					</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between gap-3">
							<Label htmlFor={`translation-short-${activeLocale}`}>
								{t("short_description")}
							</Label>
							<TextImprovementButton
								text={form.shortDescription}
								textType="shortDescription"
								pluginName={form.name}
								locale={activeLocale}
								onImprovedText={(shortDescription) =>
									setForm((current) => ({ ...current, shortDescription }))
								}
								variant="ghost"
							/>
						</div>
						<Input
							id={`translation-short-${activeLocale}`}
							value={form.shortDescription}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									shortDescription: event.target.value,
								}))
							}
							maxLength={500}
						/>
					</div>
					<div className="space-y-2">
						<Label>{t("description_label")}</Label>
						<MarkdownEditor
							value={form.description}
							onChange={(description) =>
								setForm((current) => ({ ...current, description }))
							}
							showImproveButton={true}
							pluginName={form.name}
							improvementLocale={activeLocale}
						/>
					</div>
					<div className="space-y-2">
						<Label>{t("tags")}</Label>
						<TagInput
							value={form.tags}
							onChange={(tags) => setForm((current) => ({ ...current, tags }))}
						/>
					</div>
					<div className="grid gap-5 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor={`translation-requirements-${activeLocale}`}>
								{t("requirements")}
							</Label>
							<Textarea
								id={`translation-requirements-${activeLocale}`}
								value={form.requirements}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										requirements: event.target.value,
									}))
								}
								rows={5}
							/>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-3">
								<Label htmlFor={`translation-changelog-${activeLocale}`}>
									{t("changelog")}
								</Label>
								<TextImprovementButton
									text={form.changelog}
									textType="changelog"
									pluginName={form.name}
									locale={activeLocale}
									onImprovedText={(changelog) =>
										setForm((current) => ({ ...current, changelog }))
									}
									variant="ghost"
								/>
							</div>
							<Textarea
								id={`translation-changelog-${activeLocale}`}
								value={form.changelog}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										changelog: event.target.value,
									}))
								}
								rows={5}
							/>
						</div>
					</div>
				</div>

				<div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex justify-end rounded-2xl bg-background/92 p-2 backdrop-blur-xl md:static md:bg-transparent md:p-0 md:backdrop-blur-none">
					<Button
						type="button"
						className="w-full sm:w-auto"
						disabled={
							save.isPending || !form.name.trim() || !form.description.trim()
						}
						onClick={() =>
							save.mutate({
								pluginId,
								locale: activeLocale,
								name: form.name,
								shortDescription: form.shortDescription || null,
								description: form.description,
								requirements: form.requirements || null,
								changelog: form.changelog || null,
								tags: form.tags,
							})
						}
					>
						{save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
						{t("save")}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
