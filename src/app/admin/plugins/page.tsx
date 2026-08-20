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
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { env } from "~/env";
import { api } from "~/trpc/react";

const ADMINS = (env.NEXT_PUBLIC_INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"];

interface AdminPlugin {
	id: number;
	name: string;
	slug: string;
	description: string;
	shortDescription: string | null;
	author: string;
	downloadCount: number;
	rating: number;
	status: string;
}

function PluginsSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
			{SKELETON_KEYS.map((key) => (
				<div key={key} className="skeleton-shimmer h-52 rounded-xl" />
			))}
		</div>
	);
}

export default function AdminPluginsPage() {
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
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deletingPlugin, setDeletingPlugin] = useState<{
		id: number;
		name: string;
	} | null>(null);

	const isAdmin =
		session?.user?.role === "admin" ||
		(session?.user?.telegramUsername &&
			ADMINS.includes(session.user.telegramUsername.toLowerCase()));

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
		onSuccess: () => {
			setDeleteDialogOpen(false);
			setDeletingPlugin(null);
			refetch();
		},
	});
	const updateDownloads = api.adminPlugins.updateDownloadCount.useMutation({
		onSuccess: () => {
			toast.success(t("toast_downloads_updated"));
			setEditDialogOpen(false);
			setEditingPlugin(null);
			setNewDownloadCount("");
			refetch();
		},
		onError: (error) => {
			toast.error(t("toast_update_error"), {
				description: error.message,
			});
		},
	});

	const openEditDialog = (plugin: AdminPlugin) => {
		setEditingPlugin({
			id: plugin.id,
			name: plugin.name,
			downloadCount: plugin.downloadCount,
		});
		setNewDownloadCount(String(plugin.downloadCount));
		setEditDialogOpen(true);
	};

	const openDeleteDialog = (plugin: AdminPlugin) => {
		setDeletingPlugin({ id: plugin.id, name: plugin.name });
		setDeleteDialogOpen(true);
	};

	const confirmDelete = () => {
		if (!deletingPlugin) return;
		remove.mutate({ id: deletingPlugin.id });
	};

	const handleUpdateDownloads = () => {
		if (!editingPlugin) return;
		const count = Number.parseInt(newDownloadCount, 10);
		if (Number.isNaN(count) || count < 0) {
			toast.error(t("invalid_number"));
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
				<h1 className="mb-6 font-bold text-3xl md:text-4xl">{t("title")}</h1>

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
					<TabsList className="scrollbar-hide w-full justify-start overflow-x-auto md:w-auto">
						<TabsTrigger value="pending">{t("pending")}</TabsTrigger>
						<TabsTrigger value="approved">{t("approved")}</TabsTrigger>
						<TabsTrigger value="rejected">{t("rejected")}</TabsTrigger>
					</TabsList>

					{(["pending", "approved", "rejected"] as const).map((tab) => (
						<TabsContent key={tab} value={tab} className="mt-6">
							{isFetching ? (
								<PluginsSkeleton />
							) : !data?.plugins.length ? (
								<EmptyState
									icon="📦"
									title={t("empty_title", { status: t(status) })}
									description={t("empty_description")}
								/>
							) : (
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
									{data?.plugins.map((plugin: AdminPlugin) => (
										<Card key={plugin.id} className="group animate-fade-in">
											<CardHeader>
												<CardTitle className="line-clamp-1">
													{plugin.name}
												</CardTitle>
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
															onClick={() => approve.mutate({ id: plugin.id })}
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
															onClick={() => reject.mutate({ id: plugin.id })}
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
														{t("downloads")}
													</Button>
													<Button
														variant="destructive"
														size="sm"
														onClick={() => openDeleteDialog(plugin)}
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
														<Link href={`/plugins/${plugin.slug}`}>
															{t("view")}
														</Link>
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

				<AlertDialog
					open={deleteDialogOpen}
					onOpenChange={(open) => {
						setDeleteDialogOpen(open);
						if (!open) {
							setDeletingPlugin(null);
						}
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t("delete_confirm_title")}</AlertDialogTitle>
							<AlertDialogDescription>
								{t("delete_confirm_description", {
									name: deletingPlugin?.name ?? "",
								})}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={remove.isPending}>
								{t("cancel")}
							</AlertDialogCancel>
							<Button
								variant="destructive"
								onClick={confirmDelete}
								disabled={remove.isPending}
							>
								{remove.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										{t("deleting")}
									</>
								) : (
									<>
										<Trash2 className="mr-2 h-4 w-4" />
										{t("delete")}
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t("edit_downloads_title")}</DialogTitle>
							<DialogDescription>
								{t("edit_downloads_description", {
									name: editingPlugin?.name ?? "",
								})}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="downloadCount">{t("download_count")}</Label>
								<Input
									id="downloadCount"
									type="number"
									min="0"
									value={newDownloadCount}
									onChange={(e) => setNewDownloadCount(e.target.value)}
									placeholder={t("download_count_placeholder")}
								/>
								<p className="text-muted-foreground text-xs">
									{t("current_value", {
										count: editingPlugin?.downloadCount ?? 0,
									})}
								</p>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setEditDialogOpen(false)}
								disabled={updateDownloads.isPending}
							>
								{t("cancel")}
							</Button>
							<Button
								onClick={handleUpdateDownloads}
								disabled={updateDownloads.isPending}
							>
								{updateDownloads.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										{t("saving")}
									</>
								) : (
									t("save")
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
