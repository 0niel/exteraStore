"use client";

import {
	Ban,
	CheckCircle,
	Download,
	Loader2,
	MessageSquare,
	Search,
	Shield,
	Trash2,
	UserX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { Textarea } from "~/components/ui/textarea";
import { env } from "~/env";
import { api } from "~/trpc/react";

const ADMINS = (env.NEXT_PUBLIC_INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

export default function AdminUsersPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const [search, setSearch] = useState("");
	const [banned, setBanned] = useState<boolean | undefined>(undefined);
	const [banDialogOpen, setBanDialogOpen] = useState(false);
	const [deleteReviewsDialogOpen, setDeleteReviewsDialogOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState<{
		id: string;
		name: string | null;
		reviewCount?: number;
	} | null>(null);
	const [banReason, setBanReason] = useState("");

	const isAdmin =
		session?.user?.role === "admin" ||
		(session?.user?.telegramUsername &&
			ADMINS.includes(session.user.telegramUsername.toLowerCase()));

	useEffect(() => {
		if (session && !isAdmin) {
			router.push("/");
		}
	}, [session, router, isAdmin]);

	const { data, refetch, isFetching } = api.adminUsers.getUsers.useQuery(
		{
			page: 1,
			limit: 50,
			search,
			banned,
		},
		{ enabled: Boolean(session && isAdmin) },
	);

	const banUser = api.adminUsers.banUser.useMutation({
		onSuccess: () => {
			toast.success("Пользователь забанен");
			setBanDialogOpen(false);
			setSelectedUser(null);
			setBanReason("");
			refetch();
		},
		onError: (error) => {
			toast.error("Ошибка", { description: error.message });
		},
	});

	const unbanUser = api.adminUsers.unbanUser.useMutation({
		onSuccess: () => {
			toast.success("Бан снят");
			refetch();
		},
		onError: (error) => {
			toast.error("Ошибка", { description: error.message });
		},
	});

	const updateRole = api.adminUsers.updateRole.useMutation({
		onSuccess: () => {
			toast.success("Роль обновлена");
			refetch();
		},
		onError: (error) => {
			toast.error("Ошибка", { description: error.message });
		},
	});

	const deleteAllReviews = api.adminUsers.deleteAllUserReviews.useMutation({
		onSuccess: (data) => {
			toast.success("Отзывы удалены", {
				description: `Удалено отзывов: ${data.deleted}`,
			});
			setDeleteReviewsDialogOpen(false);
			setSelectedUser(null);
			refetch();
		},
		onError: (error) => {
			toast.error("Ошибка", { description: error.message });
		},
	});

	if (!session || !isAdmin) {
		return null;
	}

	const openBanDialog = (user: { id: string; name: string | null }) => {
		setSelectedUser({ id: user.id, name: user.name });
		setBanDialogOpen(true);
	};

	const openDeleteReviewsDialog = (user: {
		id: string;
		name: string | null;
		reviewCount: number;
	}) => {
		setSelectedUser({
			id: user.id,
			name: user.name,
			reviewCount: user.reviewCount,
		});
		setDeleteReviewsDialogOpen(true);
	};

	const handleBan = () => {
		if (!selectedUser) return;
		banUser.mutate({
			userId: selectedUser.id,
			reason: banReason || undefined,
		});
	};

	const handleDeleteAllReviews = () => {
		if (!selectedUser) return;
		deleteAllReviews.mutate({ userId: selectedUser.id });
	};

	return (
		<div className="py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-6 flex items-center justify-between">
					<h1 className="font-bold text-4xl">Управление пользователями</h1>
				</div>

				<div className="mb-6 flex gap-4">
					<div className="relative flex-1">
						<Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Поиск по имени, email, username..."
							value={search}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setSearch(e.target.value)
							}
							className="pl-10"
						/>
					</div>
				</div>

				<Tabs
					defaultValue="all"
					onValueChange={(v: string) =>
						setBanned(v === "all" ? undefined : v === "banned")
					}
				>
					<TabsList>
						<TabsTrigger value="all">Все пользователи</TabsTrigger>
						<TabsTrigger value="active">Активные</TabsTrigger>
						<TabsTrigger value="banned">Забаненные</TabsTrigger>
					</TabsList>

					{["all", "active", "banned"].map((tab) => (
						<TabsContent key={tab} value={tab} className="mt-6">
							{isFetching ? (
								<div className="flex items-center justify-center p-8">
									<Loader2 className="h-8 w-8 animate-spin" />
								</div>
							) : !data?.users.length ? (
								<EmptyState
									icon="👥"
									title="Пользователи не найдены"
									description="Попробуйте изменить параметры поиска"
								/>
							) : (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{data?.users.map((user) => (
										<Card key={user.id} className="group">
											<CardHeader>
												<div className="flex items-start justify-between">
													<div className="flex-1">
														<CardTitle className="line-clamp-1">
															{user.name || "Без имени"}
														</CardTitle>
														<CardDescription className="mt-1">
															{user.email || user.telegramUsername || "—"}
														</CardDescription>
													</div>
													{user.isBanned && (
														<Badge variant="destructive">
															<Ban className="mr-1 h-3 w-3" />
															Забанен
														</Badge>
													)}
												</div>
											</CardHeader>
											<CardContent className="space-y-4">
												<div className="space-y-2 text-muted-foreground text-sm">
													{user.telegramId && (
														<div className="flex items-center gap-2">
															<span className="font-medium">Telegram ID:</span>
															<span className="font-mono">
																{user.telegramId}
															</span>
														</div>
													)}
													<div className="flex items-center gap-2">
														<Shield className="h-4 w-4" />
														<span>Роль: {user.role}</span>
													</div>
													<div className="flex items-center gap-2">
														<Download className="h-4 w-4" />
														<span>Плагинов: {user.pluginCount}</span>
													</div>
													<div className="flex items-center gap-2">
														<MessageSquare className="h-4 w-4" />
														<span>Отзывов: {user.reviewCount || 0}</span>
													</div>
													{user.isBanned && user.bannedReason && (
														<div className="mt-2 rounded-md bg-destructive/10 p-2 text-destructive text-xs">
															<strong>Причина бана:</strong> {user.bannedReason}
														</div>
													)}
												</div>

												<div className="flex flex-wrap gap-2">
													{user.isBanned ? (
														<Button
															size="sm"
															variant="outline"
															onClick={() =>
																unbanUser.mutate({ userId: user.id })
															}
															disabled={unbanUser.isPending}
														>
															{unbanUser.isPending ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<CheckCircle className="mr-1 h-4 w-4" />
															)}
															Разбанить
														</Button>
													) : (
														<Button
															size="sm"
															variant="destructive"
															onClick={() => openBanDialog(user)}
															disabled={banUser.isPending}
														>
															<UserX className="mr-1 h-4 w-4" />
															Забанить
														</Button>
													)}

													{user.role !== "admin" && (
														<Button
															size="sm"
															variant="secondary"
															onClick={() =>
																updateRole.mutate({
																	userId: user.id,
																	role: "admin",
																})
															}
															disabled={updateRole.isPending}
														>
															<Shield className="mr-1 h-4 w-4" />
															Сделать админом
														</Button>
													)}

													{user.reviewCount > 0 && (
														<Button
															size="sm"
															variant="outline"
															onClick={() => openDeleteReviewsDialog(user)}
															disabled={deleteAllReviews.isPending}
															className="text-destructive hover:text-destructive"
														>
															<Trash2 className="mr-1 h-4 w-4" />
															Удалить отзывы
														</Button>
													)}
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							)}
						</TabsContent>
					))}
				</Tabs>

				<Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Забанить пользователя</DialogTitle>
							<DialogDescription>
								Вы уверены, что хотите забанить пользователя{" "}
								{selectedUser?.name}? Он не сможет скачивать плагины и
								взаимодействовать с платформой.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="banReason">Причина бана (опционально)</Label>
								<Textarea
									id="banReason"
									value={banReason}
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
										setBanReason(e.target.value)
									}
									placeholder="Укажите причину бана..."
									rows={4}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => {
									setBanDialogOpen(false);
									setSelectedUser(null);
									setBanReason("");
								}}
								disabled={banUser.isPending}
							>
								Отмена
							</Button>
							<Button
								variant="destructive"
								onClick={handleBan}
								disabled={banUser.isPending}
							>
								{banUser.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Баним...
									</>
								) : (
									<>
										<Ban className="mr-2 h-4 w-4" />
										Забанить
									</>
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<Dialog
					open={deleteReviewsDialogOpen}
					onOpenChange={setDeleteReviewsDialogOpen}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Удалить все отзывы пользователя</DialogTitle>
							<DialogDescription>
								Вы уверены, что хотите удалить все отзывы пользователя{" "}
								{selectedUser?.name}? Будет удалено отзывов:{" "}
								{selectedUser?.reviewCount || 0}. Это действие необратимо.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => {
									setDeleteReviewsDialogOpen(false);
									setSelectedUser(null);
								}}
								disabled={deleteAllReviews.isPending}
							>
								Отмена
							</Button>
							<Button
								variant="destructive"
								onClick={handleDeleteAllReviews}
								disabled={deleteAllReviews.isPending}
							>
								{deleteAllReviews.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Удаление...
									</>
								) : (
									<>
										<Trash2 className="mr-2 h-4 w-4" />
										Удалить все отзывы
									</>
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
