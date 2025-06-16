"use client";

import {
	AlertTriangle,
	ArrowLeft,
	Eye,
	FileText,
	GitBranch,
	Image as ImageIcon,
	Info,
	Loader2,
	Save,
	Settings,
	Tags,
	Trash2,
	UploadCloud,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";

import { MarkdownEditor } from "~/components/markdown-editor";
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

type FormData = {
	name: string;
	shortDescription: string;
	description: string;
	categorySlug: string;
	tags: string[];
};

export default function PluginManagePage() {
	const params = useParams();
	const router = useRouter();
	const { data: session } = useSession();
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
	});
	const [screenshots, setScreenshots] = useState<string[]>([]);

	useEffect(() => {
		if (plugin) {
			setFormData({
				name: plugin.name,
				shortDescription: plugin.shortDescription ?? "",
				description: plugin.description,
				categorySlug: plugin.category,
				tags: plugin.tags ? JSON.parse(plugin.tags) : [],
			});
			setScreenshots(plugin.screenshots ? JSON.parse(plugin.screenshots) : []);
		}
	}, [plugin]);

	const updatePlugin = api.plugins.update.useMutation({
		onSuccess: (updatedPlugin) => {
			if (!updatedPlugin) return;
			toast.success("Плагин успешно обновлен!");
			router.push(`/my-plugins/${updatedPlugin.slug}/manage`);
		},
		onError: (error) => {
			toast.error(`Ошибка при обновлении плагина: ${error.message}`);
		},
	});

	const deletePlugin = api.plugins.delete.useMutation({
		onSuccess: () => {
			toast.success("Плагин успешно удален.");
			router.push("/my-plugins");
		},
		onError: (error) => {
			toast.error(`Ошибка при удалении плагина: ${error.message}`);
		},
	});

	const handleSave = () => {
		if (!plugin) return;
		updatePlugin.mutate({
			id: plugin.id,
			...formData,
			tags: JSON.stringify(formData.tags),
			screenshots: JSON.stringify(screenshots),
		});
	};

	const handleDelete = () => {
		if (!plugin) return;
		deletePlugin.mutate({ id: plugin.id });
	};

	const isLoading = isPluginLoading || areCategoriesLoading;

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!plugin || error) {
		return (
			<div className="flex h-screen flex-col items-center justify-center p-4 text-center">
				<AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
				<CardTitle className="mb-2 text-2xl">Плагин не найден</CardTitle>
				<CardDescription>
					Мы не смогли найти плагин с таким именем. Возможно, он был удален.
				</CardDescription>
				<Button asChild variant="link" className="mt-4">
					<Link href="/my-plugins">Вернуться к моим плагинам</Link>
				</Button>
			</div>
		);
	}

	if (session?.user?.id !== plugin.authorId) {
		return (
			<div className="flex h-screen flex-col items-center justify-center p-4 text-center">
				<AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
				<CardTitle className="mb-2 text-2xl">Доступ запрещен</CardTitle>
				<CardDescription>
					У вас нет прав для управления этим плагином.
				</CardDescription>
				<Button asChild variant="link" className="mt-4">
					<Link href="/plugins">Просмотреть другие плагины</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background py-8">
			<div className="container mx-auto max-w-6xl px-4">
				{/* Header */}
				<div className="mb-8">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => router.push("/my-plugins")}
						className="mb-4"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к моим плагинам
					</Button>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h1 className="mb-2 font-bold text-4xl">{plugin.name}</h1>
							<p className="text-muted-foreground text-xl">
								Управляйте настройками и версиями вашего плагина
							</p>
						</div>
						<div className="flex gap-2">
							<Button asChild variant="outline">
								<Link href={`/plugins/${plugin.slug}`} target="_blank">
									<Eye className="mr-2 h-4 w-4" />
									Просмотреть публичную страницу
								</Link>
							</Button>
						</div>
					</div>
				</div>

				<Tabs defaultValue="edit" className="space-y-6">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="edit" className="flex items-center gap-2">
							<FileText className="h-4 w-4" />
							Редактировать
						</TabsTrigger>
						<TabsTrigger value="versions" className="flex items-center gap-2">
							<GitBranch className="h-4 w-4" />
							Версии
						</TabsTrigger>
						<TabsTrigger
							value="settings"
							className="flex items-center gap-2 text-destructive"
						>
							<Settings className="h-4 w-4" />
							Настройки
						</TabsTrigger>
					</TabsList>

					<TabsContent value="edit">
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
							<div className="space-y-6 lg:col-span-2">
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Info className="h-5 w-5" />
											Основная информация
										</CardTitle>
										<CardDescription>
											Обновите основные данные о вашем плагине
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-6">
										<div className="space-y-2">
											<Label htmlFor="name">Название плагина *</Label>
											<Input
												id="name"
												value={formData.name}
												onChange={(e) =>
													setFormData((f) => ({ ...f, name: e.target.value }))
												}
												placeholder="Введите название плагина"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="shortDescription">
												Краткое описание *
											</Label>
											<Input
												id="shortDescription"
												value={formData.shortDescription}
												onChange={(e) =>
													setFormData((f) => ({
														...f,
														shortDescription: e.target.value,
													}))
												}
												placeholder="Краткое описание плагина"
											/>
										</div>
										<div className="space-y-2">
											<Label>Полное описание *</Label>
											<MarkdownEditor
												value={formData.description}
												onChange={(val) =>
													setFormData((f) => ({ ...f, description: val }))
												}
											/>
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
										<CardTitle className="flex items-center gap-2">
											<Tags className="h-5 w-5" />
											Категоризация
										</CardTitle>
										<CardDescription>
											Настройте категорию и теги для лучшего поиска
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="space-y-2">
											<Label>Категория *</Label>
											<Select
												value={formData.categorySlug}
												onValueChange={(val) =>
													setFormData((f) => ({ ...f, categorySlug: val }))
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Выберите категорию" />
												</SelectTrigger>
												<SelectContent>
													{categories?.map((cat) => (
														<SelectItem key={cat.id} value={cat.slug}>
															{cat.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label>Теги</Label>
											<TagInput
												value={formData.tags}
												onChange={(val) =>
													setFormData((f) => ({ ...f, tags: val }))
												}
												placeholder="Добавьте до 5 тегов..."
											/>
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardContent className="pt-6">
										<Button
											className="w-full"
											onClick={handleSave}
											disabled={updatePlugin.isPending}
										>
											{updatePlugin.isPending ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : (
												<Save className="mr-2 h-4 w-4" />
											)}
											Сохранить изменения
										</Button>
									</CardContent>
								</Card>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="versions">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between">
								<div>
									<CardTitle>Версии плагина</CardTitle>
									<CardDescription>
										Управляйте всеми версиями вашего плагина
									</CardDescription>
								</div>
								<UploadVersionDialog
									pluginId={plugin.id}
									onUploadSuccess={() => refetch()}
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
						<Card className="border-destructive">
							<CardHeader>
								<CardTitle className="text-destructive">Опасная зона</CardTitle>
								<CardDescription>
									Эти действия необратимы. Будьте осторожны.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<h4 className="font-semibold">Удалить плагин</h4>
									<p className="mb-2 text-muted-foreground text-sm">
										После удаления плагина восстановить его будет невозможно.
									</p>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button variant="destructive">
												<Trash2 className="mr-2 h-4 w-4" />
												Удалить этот плагин
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>
													Вы абсолютно уверены?
												</AlertDialogTitle>
												<AlertDialogDescription>
													Это действие нельзя отменить. Плагин будет
													безвозвратно удален со всеми данными с наших серверов.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Отмена</AlertDialogCancel>
												<AlertDialogAction
													onClick={handleDelete}
													disabled={deletePlugin.isPending}
												>
													{deletePlugin.isPending && (
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													)}
													Продолжить
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
