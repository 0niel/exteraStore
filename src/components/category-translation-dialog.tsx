"use client";

import { AlertCircle, Languages, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

type Locale = "ru" | "en";

export function CategoryTranslationDialog({
	categoryId,
	open,
	onOpenChange,
}: {
	categoryId: number | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const t = useTranslations("CategoryTranslations");
	const utils = api.useUtils();
	const [locale, setLocale] = useState<Locale>("ru");
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const { data, isLoading } = api.translations.getCategory.useQuery(
		{ categoryId: categoryId ?? 0 },
		{ enabled: open && categoryId !== null },
	);
	const translation = useMemo(
		() => data?.translations.find((item) => item.locale === locale),
		[data, locale],
	);
	const isSource = data?.sourceLocale === locale || !data?.sourceLocale;

	useEffect(() => {
		if (!data) return;
		if (isSource) {
			setName(data.source.name);
			setDescription(data.source.description ?? "");
		} else {
			setName(translation?.name ?? "");
			setDescription(translation?.description ?? "");
		}
	}, [data, isSource, translation]);

	const save = api.translations.saveCategory.useMutation({
		onSuccess: async () => {
			if (categoryId) {
				await Promise.all([
					utils.translations.getCategory.invalidate({ categoryId }),
					utils.adminPlugins.getCategories.invalidate(),
					utils.categories.getAll.invalidate(),
				]);
			}
			toast.success(t("saved"));
		},
		onError: (error) => toast.error(error.message),
	});
	const generate = api.translations.generateCategory.useMutation({
		onSuccess: async () => {
			if (categoryId) {
				await utils.translations.getCategory.invalidate({ categoryId });
			}
			toast.success(t("generated"));
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Languages className="size-5 text-primary" />
						{t("title")}
					</DialogTitle>
					<DialogDescription>{t("description")}</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-2 rounded-xl bg-muted p-1">
					{(["ru", "en"] as const).map((item) => (
						<button
							key={item}
							type="button"
							onClick={() => setLocale(item)}
							className={`min-h-10 rounded-lg font-semibold text-sm ${
								locale === item
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground"
							}`}
						>
							{item === "ru" ? "Русский" : "English"}
						</button>
					))}
				</div>

				{isLoading ? (
					<div className="skeleton-shimmer h-48 rounded-xl" />
				) : (
					<div className="space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<Badge variant="secondary">
								{isSource
									? t("original")
									: translation?.origin === "manual"
										? t("manual")
										: translation
											? t("ai_generated")
											: t("missing")}
							</Badge>
							{translation?.stale && (
								<Badge variant="outline" className="gap-1 text-amber-600">
									<AlertCircle className="size-3.5" />
									{t("outdated")}
								</Badge>
							)}
						</div>
						{!isSource && (
							<Button
								type="button"
								variant="secondary"
								className="w-full"
								disabled={
									generate.isPending || translation?.origin === "manual"
								}
								onClick={() =>
									categoryId &&
									generate.mutate({ categoryId, targetLocale: locale })
								}
							>
								{generate.isPending ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<Sparkles className="mr-2 size-4" />
								)}
								{translation ? t("refresh_ai") : t("generate_ai")}
							</Button>
						)}
						<div className="space-y-2">
							<Label htmlFor={`category-translation-name-${locale}`}>
								{t("name")}
							</Label>
							<Input
								id={`category-translation-name-${locale}`}
								value={name}
								onChange={(event) => setName(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`category-translation-description-${locale}`}>
								{t("category_description")}
							</Label>
							<Textarea
								id={`category-translation-description-${locale}`}
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								rows={4}
							/>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						{t("close")}
					</Button>
					<Button
						type="button"
						disabled={!categoryId || !name.trim() || save.isPending}
						onClick={() =>
							categoryId &&
							save.mutate({
								categoryId,
								locale,
								name,
								description: description || null,
							})
						}
					>
						{save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
						{t("save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
