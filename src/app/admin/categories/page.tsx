"use client";

import { Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { env } from "~/env";
import { api } from "~/trpc/react";

const ADMINS = (env.NEXT_PUBLIC_INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

// Добавить тип для категории
interface Category {
	id: number;
	name: string;
	slug: string;
	description?: string;
	icon?: string;
	color?: string;
	pluginCount?: number;
}

export default function AdminCategoriesPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const t = useTranslations("AdminCategories");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<any>(null);
	const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(
		null,
	);

	// Форма
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [icon, setIcon] = useState("");
	const [color, setColor] = useState("");

	const isAdmin =
		session?.user?.role === "admin" ||
		(session?.user?.telegramUsername &&
			ADMINS.includes(session.user.telegramUsername.toLowerCase()));

	useEffect(() => {
		if (session && !isAdmin) {
			router.push("/");
		}
	}, [session, router, isAdmin]);

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

	const resetForm = () => {
		setName("");
		setSlug("");
		setDescription("");
		setIcon("");
		setColor("");
		setEditingCategory(null);
	};

	const handleOpenDialog = (category?: Category) => {
		if (category) {
			setEditingCategory(category);
			setName(category.name);
			setSlug(category.slug);
			setDescription(category.description || "");
			setIcon(category.icon || "");
			setColor(category.color || "");
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

		if (editingCategory) {
			updateCategory.mutate({
				id: editingCategory.id,
				name,
				slug,
				description: description || undefined,
				icon: icon || undefined,
				color: color || undefined,
			});
		} else {
			createCategory.mutate({
				name,
				slug,
				description: description || undefined,
				icon: icon || undefined,
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
		// Автоматически генерировать slug из имени, если не редактируем существующую категорию
		if (!editingCategory) {
			setSlug(
				e.target.value
					.toLowerCase()
					.replace(/\s+/g, "-")
					.replace(/[^a-z0-9-]/g, ""),
			);
		}
	};

	if (!session || !isAdmin) {
		return null;
	}

	return (
		<div className="py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-6 flex items-center justify-between">
					<h1 className="font-bold text-3xl">{t("title")}</h1>
					<Button onClick={() => handleOpenDialog()}>
						<Plus className="mr-2 h-4 w-4" />
						{t("add_category")}
					</Button>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center p-8">
						<Loader2 className="h-8 w-8 animate-spin" />
					</div>
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
							<Card key={category.id}>
								<CardHeader className="pb-2">
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="flex items-center gap-2">
												{category.icon && <span>{category.icon}</span>}
												{category.name}
											</CardTitle>
											<CardDescription>{category.slug}</CardDescription>
										</div>
										{category.color && (
											<div
												className="h-4 w-4 rounded-full"
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
										<Badge variant="outline">
											{category.pluginCount || 0} {t("plugins")}
										</Badge>
										<div className="flex gap-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleOpenDialog(category)}
											>
												<Edit className="h-4 w-4" />
											</Button>
											<Button
												size="sm"
												variant="destructive"
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

				{/* Диалог создания/редактирования */}
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
								<Label htmlFor="name">{t("name")} *</Label>
								<Input
									id="name"
									value={name}
									onChange={handleNameChange}
									placeholder={t("name_placeholder")}
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="slug">{t("slug")} *</Label>
								<Input
									id="slug"
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
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="icon">{t("icon")}</Label>
									<Input
										id="icon"
										value={icon}
										onChange={(e) => setIcon(e.target.value)}
										placeholder={t("icon_placeholder")}
									/>
									<p className="text-muted-foreground text-xs">
										{t("icon_help")}
									</p>
								</div>

								<div className="space-y-2">
									<Label htmlFor="color">{t("color")}</Label>
									<div className="flex gap-2">
										<Input
											id="color"
											value={color}
											onChange={(e) => setColor(e.target.value)}
											placeholder={t("color_placeholder")}
										/>
										{color && (
											<div
												className="h-10 w-10 rounded-md border"
												style={{ backgroundColor: color }}
											/>
										)}
									</div>
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

				{/* Диалог подтверждения удаления */}
				<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t("delete_category")}</DialogTitle>
							<DialogDescription>
								{t("delete_category_description")}
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setIsDeleteDialogOpen(false)}
							>
								{t("cancel")}
							</Button>
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
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
