"use client";

import {
	CheckCircle,
	Download,
	Edit,
	Loader2,
	Star,
	Trash2,
	User,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { env } from "~/env";
import { api } from "~/trpc/react";

const ADMINS = (env.NEXT_PUBLIC_INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

interface AdminPlugin {
	id: number;
	name: string;
	slug: string;
	description: string;
	shortDescription?: string;
	author: string;
	downloadCount: number;
	rating: number;
	status: string;
}

export default function AdminPluginsPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const t = useTranslations("AdminPlugins");
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<"pending" | "approved" | "rejected">(
		"pending",
	);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingPlugin, setEditingPlugin] = useState<{
		id: number;
		name: string;
		downloadCount: number;
	} | null>(null);
	const [newDownloadCount, setNewDownloadCount] = useState("");

	const isAdmin =
		session?.user?.role === "admin" ||
		(session?.user?.telegramUsername &&
			ADMINS.includes(session.user.telegramUsername.toLowerCase()));

	useEffect(() => {
		if (session && !isAdmin) {
			router.push("/");
		}
	}, [session, router, isAdmin]);

	const { data, refetch, isFetching } = api.adminPlugins.getPlugins.useQuery(
		{
			page: 1,
			limit: 50,
			status,
			search,
		},
		{ enabled: Boolean(session && isAdmin) },
	);

	const approve = api.adminPlugins.approve.useMutation({
		onSuccess: () => refetch(),
	});
	const reject = api.adminPlugins.reject.useMutation({
		onSuccess: () => refetch(),
	});
	const remove = api.adminPlugins.delete.useMutation({
		onSuccess: () => refetch(),
	});
	const updateDownloads = api.adminPlugins.updateDownloadCount.useMutation({
		onSuccess: () => {
			toast.success("Количество скачиваний обновлено");
			setEditDialogOpen(false);
			setEditingPlugin(null);
			setNewDownloadCount("");
			refetch();
		},
		onError: (error) => {
			toast.error("Ошибка при обновлении", {
				description: error.message,
			});
		},
	});

	if (!session || !isAdmin) {
		return null;
	}

	const action = (id: number, type: "approve" | "reject" | "delete") => {
		if (type === "approve") approve.mutate({ id });
		if (type === "reject") reject.mutate({ id });
		if (type === "delete") remove.mutate({ id });
	};

	const openEditDialog = (plugin: AdminPlugin) => {
		setEditingPlugin({
			id: plugin.id,
			name: plugin.name,
			downloadCount: plugin.downloadCount,
		});
		setNewDownloadCount(String(plugin.downloadCount));
		setEditDialogOpen(true);
	};

	const handleUpdateDownloads = () => {
		if (!editingPlugin) return;
		const count = Number.parseInt(newDownloadCount);
		if (Number.isNaN(count) || count < 0) {
			toast.error("Введите корректное число");
			return;
		}
		updateDownloads.mutate({
			id: editingPlugin.id,
			downloadCount: count,
		});
	};

	return (
		<div className="py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<h1 className="mb-6 font-bold text-4xl">{t("title")}</h1>

				<Input
					placeholder={t("search_placeholder")}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="mb-6"
				/>

				<Tabs
					defaultValue="pending"
					onValueChange={(v) =>
						setStatus(v as "pending" | "approved" | "rejected")
					}
				>
					<TabsList>
						<TabsTrigger value="pending">{t("pending")}</TabsTrigger>
						<TabsTrigger value="approved">{t("approved")}</TabsTrigger>
						<TabsTrigger value="rejected">{t("rejected")}</TabsTrigger>
					</TabsList>

					{(["pending", "approved", "rejected"] as const).map((tab) => (
						<TabsContent key={tab} value={tab} className="mt-6">
							{isFetching ? (
								<div className="flex items-center justify-center p-8">
									<Loader2 className="h-8 w-8 animate-spin" />
								</div>
							) : !data?.plugins.length ? (
								<EmptyState
									icon="📦"
									title={`Нет плагинов со статусом ${status}`}
									description="Плагины с выбранным статусом не найдены"
								/>
							) : (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{data?.plugins.map((plugin: AdminPlugin) => (
										<Card key={plugin.id} className="group">
											<CardHeader>
												<CardTitle>{plugin.name}</CardTitle>
												<CardDescription className="line-clamp-2">
													{plugin.shortDescription || plugin.description}
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-4">
												<div className="flex items-center justify-between text-muted-foreground text-sm">
													<span className="flex items-center gap-1">
														<User className="h-4 w-4" />
														{plugin.author}
													</span>
													<span className="flex items-center gap-1">
														<Download className="h-4 w-4" />
														{plugin.downloadCount}
													</span>
													<span className="flex items-center gap-1">
														<Star className="h-4 w-4" />
														{plugin.rating.toFixed(1)}
													</span>
												</div>
												<Badge variant="outline">
													{t(
														plugin.status as
															| "pending"
															| "approved"
															| "rejected",
													)}
												</Badge>
												<div className="flex flex-wrap gap-2">
													{tab !== "approved" && (
														<Button
															size="sm"
															onClick={() => action(plugin.id, "approve")}
															disabled={approve.isPending}
														>
															{approve.isPending ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<CheckCircle className="mr-1 h-4 w-4" />
															)}
															{t("approve")}
														</Button>
													)}
													{tab !== "rejected" && (
														<Button
															variant="secondary"
															size="sm"
															onClick={() => action(plugin.id, "reject")}
															disabled={reject.isPending}
														>
															{reject.isPending ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<XCircle className="mr-1 h-4 w-4" />
															)}
															{t("reject")}
														</Button>
													)}
													<Button
														variant="outline"
														size="sm"
														onClick={() => openEditDialog(plugin)}
													>
														<Edit className="mr-1 h-4 w-4" />
														Downloads
													</Button>
													<Button
														variant="destructive"
														size="sm"
														onClick={() => action(plugin.id, "delete")}
														disabled={remove.isPending}
													>
														{remove.isPending ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<Trash2 className="mr-1 h-4 w-4" />
														)}
														{t("delete")}
													</Button>
													<Button variant="outline" size="sm" asChild>
														<Link href={`/plugins/${plugin.slug}`}>View</Link>
													</Button>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							)}
						</TabsContent>
					))}
				</Tabs>

				<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Редактировать количество скачиваний</DialogTitle>
							<DialogDescription>
								Изменить количество скачиваний для плагина {editingPlugin?.name}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="downloadCount">Количество скачиваний</Label>
								<Input
									id="downloadCount"
									type="number"
									min="0"
									value={newDownloadCount}
									onChange={(e) => setNewDownloadCount(e.target.value)}
									placeholder="Введите количество"
								/>
								<p className="text-muted-foreground text-xs">
									Текущее значение: {editingPlugin?.downloadCount}
								</p>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setEditDialogOpen(false)}
								disabled={updateDownloads.isPending}
							>
								Отмена
							</Button>
							<Button
								onClick={handleUpdateDownloads}
								disabled={updateDownloads.isPending}
							>
								{updateDownloads.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Сохранение...
									</>
								) : (
									"Сохранить"
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
