"use client";

import { Edit, Languages, Loader2, Plus, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { CategoryTranslationDialog } from "~/components/category-translation-dialog";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { isAdminUser } from "~/config/admins";
import { getCategoryEmoji, isCategoryEmoji } from "~/lib/category-icon";
import { api } from "~/trpc/react";

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"];

interface Category {
	id: number;
	name: string;
	slug: string;
	description: string | null;
	icon: string | null;
	color: string | null;
	createdAt: number;
	contentLocale: string;
	pluginCount?: number;
}

function CategoriesSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{SKELETON_KEYS.map((key) => (
				<div key={key} className="skeleton-shimmer h-44 rounded-xl" />
			))}
		</div>
	);
}

export default function AdminCategoriesPage() {
	const { data: session } = useSession();
	const t = useTranslations("AdminCategories");
	const locale = useLocale();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(
		null,
	);

	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [icon, setIcon] = useState("");
	const [color, setColor] = useState("");
	const [sourceLocale, setSourceLocale] = useState<"ru" | "en">(
		locale === "ru" ? "ru" : "en",
	);
	const [translationCategoryId, setTranslationCategoryId] = useState<
		number | null
	>(null);

	const isAdmin = isAdminUser(session?.user);

	const {
		data: categories,
		refetch,
		isLoading,
	} = api.adminPlugins.getCategories.useQuery(undefined, {
		enabled: !!session && !!isAdmin,
	});

	const createCategory = api.adminPlugins.createCategory.useMutation({
		onSuccess: () => {
			refetch();
			resetForm();
			setIsDialogOpen(false);
			toast.success(t("category_created"));
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const updateCategory = api.adminPlugins.updateCategory.useMutation({
		onSuccess: () => {
			refetch();
			resetForm();
			setIsDialogOpen(false);
			toast.success(t("category_updated"));
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const deleteCategory = api.adminPlugins.deleteCategory.useMutation({
		onSuccess: () => {
			refetch();
			setIsDeleteDialogOpen(false);
			setDeletingCategoryId(null);
			toast.success(t("category_deleted"));
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});
	const enqueueTranslations = api.translations.enqueueMissing.useMutation({
		onSuccess: (result) => {
			toast.success(
				t("translation_queue_added", {
					queued: result.queued,
					total: result.totalMissing,
				}),
			);
		},
		onError: (error) => toast.error(error.message),
	});

	const resetForm = () => {
		setName("");
		setSlug("");
		setDescription("");
		setIcon("");
		setColor("");
		setSourceLocale(locale === "ru" ? "ru" : "en");
		setEditingCategory(null);
	};

	const handleOpenDialog = (category?: Category) => {
		if (category) {
			setEditingCategory(category);
			setName(category.name);
			setSlug(category.slug);
			setDescription(category.description || "");
			setIcon(getCategoryEmoji(category.icon, category.slug));
			setColor(category.color || "");
			setSourceLocale(category.contentLocale === "en" ? "en" : "ru");
		} else {
			resetForm();
		}
		setIsDialogOpen(true);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!name || !slug) {
			toast.error(t("fill_required_fields"));
			return;
		}
		if (icon.trim() && !isCategoryEmoji(icon)) {
			toast.error(t("icon_emoji_only"));
			return;
		}

		const normalizedIcon = getCategoryEmoji(icon, slug);

		if (editingCategory) {
			updateCategory.mutate({
				id: editingCategory.id,
				name,
				slug,
				description: description || undefined,
				sourceLocale,
				icon: normalizedIcon,
				color: color || undefined,
			});
		} else {
			createCategory.mutate({
				name,
				slug,
				description: description || undefined,
				sourceLocale,
				icon: normalizedIcon,
				color: color || undefined,
			});
		}
	};

	const handleDelete = (id: number) => {
		setDeletingCategoryId(id);
		setIsDeleteDialogOpen(true);
	};

	const confirmDelete = () => {
		if (deletingCategoryId) {
			deleteCategory.mutate({ id: deletingCategoryId });
		}
	};

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setName(e.target.value);
		if (!editingCategory) {
			setSlug(
				e.target.value
					.toLowerCase()
					.replace(/\s+/g, "-")
					.replace(/[^a-z0-9-]/g, ""),
			);
		}
	};

	return (
		<div className="py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-6 flex animate-fade-up flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div>
						<span className="eyebrow mb-2">{t("eyebrow")}</span>
						<div className="flex flex-wrap items-center gap-3">
							<h1 className="font-bold text-3xl tracking-tight md:text-4xl">
								{t("title")}
							</h1>
							{categories ? (
								<span className="inline-flex h-8 items-center rounded-full border border-primary/15 bg-primary/5 px-3 font-mono font-semibold text-primary text-sm">
									{categories.length}
								</span>
							) : null}
						</div>
					</div>
					<div className="grid w-full gap-2 sm:grid-cols-2 md:flex md:w-auto">
						<Button
							variant="outline"
							onClick={() =>
								enqueueTranslations.mutate({ entity: "categories" })
							}
							disabled={enqueueTranslations.isPending}
						>
							{enqueueTranslations.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Languages className="mr-2 h-4 w-4" />
							)}
							{t("translate_missing")}
						</Button>
						<Button onClick={() => handleOpenDialog()} className="press-scale">
							<Plus className="mr-2 h-4 w-4" />
							{t("add_category")}
						</Button>
					</div>
				</div>

				{isLoading ? (
					<CategoriesSkeleton />
				) : !categories?.length ? (
					<EmptyState
						icon="🗂️"
						title={t("no_categories")}
						description={t("no_categories_description")}
						onAction={() => handleOpenDialog()}
						actionLabel={t("add_first_category")}
					/>
				) : (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{categories.map((category: Category) => (
							<Card key={category.id} className="card-lift animate-fade-in">
								<CardHeader className="pb-2">
									<div className="flex items-start justify-between gap-3">
										<div className="flex min-w-0 items-center gap-3">
											<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg text-primary">
												<span aria-hidden="true">
													{getCategoryEmoji(category.icon, category.slug)}
												</span>
											</span>
											<div className="min-w-0">
												<CardTitle className="truncate">
													{category.name}
												</CardTitle>
												<CardDescription className="mt-1 truncate font-mono text-xs">
													/{category.slug}
												</CardDescription>
											</div>
										</div>
										{category.color && (
											<div
												className="h-4 w-4 shrink-0 rounded-full ring-2 ring-border"
												style={{ backgroundColor: category.color }}
											/>
										)}
									</div>
								</CardHeader>
								<CardContent>
									<p className="mb-4 line-clamp-2 text-muted-foreground text-sm">
										{category.description || t("no_description")}
									</p>
									<div className="flex items-center justify-between">
										<Badge
											variant="outline"
											className="border-primary/20 bg-primary/5 font-mono text-primary"
										>
											{category.pluginCount || 0} {t("plugins")}
										</Badge>
										<div className="flex gap-2">
											<Button
												size="sm"
												variant="outline"
												aria-label={t("translations")}
												onClick={() => setTranslationCategoryId(category.id)}
											>
												<Languages className="h-4 w-4" />
											</Button>
											<Button
												size="sm"
												variant="outline"
												aria-label={t("edit_category")}
												onClick={() => handleOpenDialog(category)}
											>
												<Edit className="h-4 w-4" />
											</Button>
											<Button
												size="sm"
												variant="destructive"
												aria-label={t("delete_category")}
												onClick={() => handleDelete(category.id)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}

				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								{editingCategory ? t("edit_category") : t("add_category")}
							</DialogTitle>
							<DialogDescription>
								{editingCategory
									? t("edit_category_description")
									: t("add_category_description")}
							</DialogDescription>
						</DialogHeader>

						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label>{t("source_language")}</Label>
								<div className="grid grid-cols-2 rounded-xl bg-muted p-1">
									{(["ru", "en"] as const).map((item) => (
										<button
											key={item}
											type="button"
											onClick={() => setSourceLocale(item)}
											className={`min-h-10 rounded-lg font-semibold text-sm transition-colors ${
												sourceLocale === item
													? "bg-background text-foreground shadow-sm"
													: "text-muted-foreground"
											}`}
										>
											{item === "ru" ? "Русский" : "English"}
										</button>
									))}
								</div>
								<p className="text-muted-foreground text-xs">
									{t("source_language_help")}
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="name">{t("name")} *</Label>
								<Input
									id="name"
									className="min-h-11"
									value={name}
									onChange={handleNameChange}
									placeholder={t("name_placeholder")}
									required
								/>
								<p className="text-muted-foreground text-xs">
									{t("name_help")}
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="slug">{t("slug")} *</Label>
								<Input
									id="slug"
									className="min-h-11 font-mono"
									value={slug}
									onChange={(e) => setSlug(e.target.value)}
									placeholder={t("slug_placeholder")}
									required
								/>
								<p className="text-muted-foreground text-xs">
									{t("slug_help")}
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">{t("description")}</Label>
								<Textarea
									id="description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder={t("description_placeholder")}
									rows={3}
								/>
								<p className="text-muted-foreground text-xs">
									{t("description_help")}
								</p>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="icon">{t("icon")}</Label>
									<div className="flex items-center gap-2">
										<Input
											id="icon"
											className="min-h-11 text-xl"
											value={icon}
											onChange={(e) => setIcon(e.target.value)}
											placeholder={t("icon_placeholder")}
											maxLength={16}
										/>
										<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
											<span aria-hidden="true">
												{getCategoryEmoji(icon, slug)}
											</span>
										</span>
									</div>
									<p className="text-muted-foreground text-xs">
										{t("icon_help")}
									</p>
								</div>

								<div className="space-y-2">
									<Label htmlFor="color">{t("color")}</Label>
									<div className="flex gap-2">
										<Input
											id="color"
											className="min-h-11 font-mono"
											value={color}
											onChange={(e) => setColor(e.target.value)}
											placeholder={t("color_placeholder")}
										/>
										{color && (
											<div
												className="h-11 w-11 shrink-0 rounded-md border"
												style={{ backgroundColor: color }}
											/>
										)}
									</div>
									<p className="text-muted-foreground text-xs">
										{t("color_help")}
									</p>
								</div>
							</div>

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsDialogOpen(false)}
								>
									{t("cancel")}
								</Button>
								<Button
									type="submit"
									disabled={
										createCategory.isPending || updateCategory.isPending
									}
								>
									{(createCategory.isPending || updateCategory.isPending) && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{editingCategory ? t("save") : t("create")}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>

				<AlertDialog
					open={isDeleteDialogOpen}
					onOpenChange={(open) => {
						setIsDeleteDialogOpen(open);
						if (!open) {
							setDeletingCategoryId(null);
						}
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t("delete_category")}</AlertDialogTitle>
							<AlertDialogDescription>
								{t("delete_category_description")}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={deleteCategory.isPending}>
								{t("cancel")}
							</AlertDialogCancel>
							<Button
								variant="destructive"
								onClick={confirmDelete}
								disabled={deleteCategory.isPending}
							>
								{deleteCategory.isPending && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								{t("delete")}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<CategoryTranslationDialog
					categoryId={translationCategoryId}
					open={translationCategoryId !== null}
					onOpenChange={(open) => {
						if (!open) setTranslationCategoryId(null);
					}}
				/>
			</div>
		</div>
	);
}
