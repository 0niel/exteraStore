"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Code, ExternalLink, FileText, Image as ImageIcon, Info, Loader2, Tag, Tags, UploadCloud } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { MarkdownEditor } from "~/components/markdown-editor";
import { ScreenshotUploader } from "~/components/screenshot-uploader";
import { TagInput } from "~/components/tag-input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { api } from "~/trpc/react";

const formSchema = z.object({
	name: z.string()
		.min(1, "Название плагина обязательно")
		.max(256, "Название не должно превышать 256 символов"),
	shortDescription: z.string()
		.min(1, "Краткое описание обязательно")
		.max(500, "Краткое описание не должно превышать 500 символов"),
	description: z.string().optional(),
	categorySlug: z.string().optional(),
	tags: z.array(z.string()).optional(),
	version: z.string()
		.min(1, "Версия обязательна")
		.max(50, "Версия не должна превышать 50 символов"),
	changelog: z.string().optional(),
	githubUrl: z.string()
		.optional()
		.refine((val) => !val || val === "" || z.string().url().safeParse(val).success, {
			message: "Введите корректный URL GitHub репозитория"
		}),
	documentationUrl: z.string()
		.optional()
		.refine((val) => !val || val === "" || z.string().url().safeParse(val).success, {
			message: "Введите корректный URL документации"
		}),
});

type FormData = z.infer<typeof formSchema>;

export default function UploadPluginPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const [fileContent, setFileContent] = useState("");
	const [screenshots, setScreenshots] = useState<string[]>([]);

	const { data: categories, isLoading: areCategoriesLoading } = api.categories.getAll.useQuery();

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
		},
	});

	const createPlugin = api.pluginUpload.create.useMutation({
		onSuccess: (plugin) => {
			toast.success("Плагин отправлен на модерацию!");
			router.push(`/plugins/${plugin.slug}`);
		},
		onError: (error) => {
			console.error("Plugin creation error:", error);
			
			try {
				const errorData = JSON.parse(error.message);
				if (Array.isArray(errorData)) {
					const fieldErrors = errorData.map((err: any) => {
						const fieldName = err.path?.[0];
						const message = err.message;
						
						switch (fieldName) {
							case 'githubUrl':
								return 'GitHub URL: введите корректную ссылку или оставьте поле пустым';
							case 'documentationUrl':
								return 'URL документации: введите корректную ссылку или оставьте поле пустым';
							case 'name':
								return `Название: ${message}`;
							case 'shortDescription':
								return `Краткое описание: ${message}`;
							default:
								return `${fieldName}: ${message}`;
						}
					});
					
					toast.error(`Ошибки в форме:\n${fieldErrors.join('\n')}`);
					return;
				}
			} catch (e) {
			}
			
			toast.error(`Ошибка создания плагина: ${error.message}`);
		}
	});

	const onSubmit = async (data: FormData) => {
		if (!session) {
			router.push("/auth/signin");
			return;
		}

		if (!fileContent) {
			toast.error("Пожалуйста, загрузите файл плагина.");
			return;
		}

		
		const cleanedData = {
			...data,
			category: data.categorySlug || "utility", 
			description: data.description || data.shortDescription, 
			githubUrl: data.githubUrl?.trim() || undefined,
			documentationUrl: data.documentationUrl?.trim() || undefined,
			screenshots: JSON.stringify(screenshots),
			fileContent,
		};

		createPlugin.mutate(cleanedData);
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file?.name.endsWith(".py")) {
			const reader = new FileReader();
			reader.onload = (event) => {
				setFileContent(event.target?.result as string);
			};
			reader.readAsText(file);
		} else {
			toast.error("Пожалуйста, выберите корректный .py файл.");
		}
	};
	
	if (!session) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-full max-w-md text-center">
					<CardHeader>
						<CardTitle>Требуется авторизация</CardTitle>
						<CardDescription>
							Вам необходимо войти в систему для загрузки плагина.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild>
							<Link href="/auth/signin">Войти</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<section className="min-h-screen bg-muted/40 py-12">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-8 text-center">
					<h1 className="mb-2 font-bold text-4xl">
						Загрузить плагин
					</h1>
					<p className="text-muted-foreground text-xl">
						Поделитесь своим творением с сообществом exteraGram
					</p>
				</div>
				
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
							<div className="space-y-6 lg:col-span-2">
								{/* Основная информация */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Info className="h-5 w-5" /> Основная информация
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-6">
										<FormField
											control={form.control}
											name="name"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Название плагина *</FormLabel>
													<FormControl>
														<Input
															placeholder="Мой потрясающий плагин"
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										
										<FormField
											control={form.control}
											name="shortDescription"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Краткое описание *</FormLabel>
													<FormControl>
														<Input
															placeholder="Краткое описание возможностей вашего плагина"
															maxLength={500}
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										
										<FormField
											control={form.control}
											name="description"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Описание</FormLabel>
													<FormControl>
														<MarkdownEditor
															value={field.value || ""}
															onChange={field.onChange}
															height={400}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</CardContent>
								</Card>

								{/* Скриншоты */}
								<ScreenshotUploader screenshots={screenshots} onScreenshotsChange={setScreenshots} />

								{/* Версия и изменения */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<FileText className="h-5 w-5" /> Версия и список изменений
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-6">
										<FormField
											control={form.control}
											name="version"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Версия</FormLabel>
													<FormControl>
														<Input
															placeholder="1.0.0"
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										
										<FormField
											control={form.control}
											name="changelog"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Список изменений (необязательно)</FormLabel>
													<FormControl>
														<MarkdownEditor 
															value={field.value || ""} 
															onChange={field.onChange} 
															height={200} 
															placeholder="- Добавлена функция X&#10;- Исправлена ошибка Y" 
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</CardContent>
								</Card>
							</div>

							<div className="space-y-6 lg:col-span-1">
								{/* Организация */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Tags className="h-5 w-5" /> Организация
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-6">
										<FormField
											control={form.control}
											name="categorySlug"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Категория</FormLabel>
													<Select onValueChange={field.onChange} value={field.value}>
														<FormControl>
															<SelectTrigger>
																<SelectValue placeholder="Выберите категорию" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{areCategoriesLoading ? (
																<SelectItem value="loading" disabled>Загрузка...</SelectItem>
															) : (
																categories?.map(cat => (
																	<SelectItem key={cat.id} value={cat.slug}>
																		{cat.name}
																	</SelectItem>
																))
															)}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
										
										<FormField
											control={form.control}
											name="tags"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Теги</FormLabel>
													<FormControl>
														<TagInput 
															value={field.value || []} 
															onChange={field.onChange} 
															placeholder="Добавьте до 5 тегов..." 
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</CardContent>
								</Card>

								{/* Ссылки */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<ExternalLink className="h-5 w-5" /> Ссылки (необязательно)
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<FormField
											control={form.control}
											name="githubUrl"
											render={({ field }) => (
												<FormItem>
													<FormLabel>GitHub репозиторий</FormLabel>
													<FormControl>
														<Input
															type="url"
															placeholder="https://github.com/..."
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										
										<FormField
											control={form.control}
											name="documentationUrl"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Документация</FormLabel>
													<FormControl>
														<Input
															type="url"
															placeholder="https://docs.example.com/..."
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</CardContent>
								</Card>

								{/* Загрузка файла */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Code className="h-5 w-5" /> Файл плагина *
										</CardTitle>
										<CardDescription>Загрузите `.py` файл вашего плагина.</CardDescription>
									</CardHeader>
									<CardContent>
										<Input
											id="file"
											type="file"
											accept=".py"
											onChange={handleFileUpload}
											required
											className="cursor-pointer"
										/>
										{fileContent && (
											<p className="mt-2 text-muted-foreground text-sm">
												{fileContent.length.toLocaleString()} байт выбрано.
											</p>
										)}
									</CardContent>
								</Card>
							</div>
						</div>

						<div className="flex justify-end gap-4">
							<Button type="button" variant="outline" onClick={() => router.back()}>
								Отмена
							</Button>
							<Button 
								type="submit" 
								disabled={createPlugin.isPending || !fileContent}
							>
								{createPlugin.isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin"/>
								) : (
									<UploadCloud className="mr-2 h-4 w-4" />
								)}
								Отправить на модерацию
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</section>
	);
}