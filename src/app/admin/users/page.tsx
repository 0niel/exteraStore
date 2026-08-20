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

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"];

function UsersSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
			{SKELETON_KEYS.map((key) => (
				<div key={key} className="skeleton-shimmer h-56 rounded-xl" />
			))}
		</div>
	);
}

export default function AdminUsersPage() {
	const { data: session } = useSession();
	const t = useTranslations("AdminUsers");
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
			toast.success(t("toast_banned"));
			setBanDialogOpen(false);
			setSelectedUser(null);
			setBanReason("");
			refetch();
		},
		onError: (error) => {
			toast.error(t("toast_error"), { description: error.message });
		},
	});

	const unbanUser = api.adminUsers.unbanUser.useMutation({
		onSuccess: () => {
			toast.success(t("toast_unbanned"));
			refetch();
		},
		onError: (error) => {
			toast.error(t("toast_error"), { description: error.message });
		},
	});

	const updateRole = api.adminUsers.updateRole.useMutation({
		onSuccess: () => {
			toast.success(t("toast_role_updated"));
			refetch();
		},
		onError: (error) => {
			toast.error(t("toast_error"), { description: error.message });
		},
	});

	const deleteAllReviews = api.adminUsers.deleteAllUserReviews.useMutation({
		onSuccess: (result) => {
			toast.success(t("toast_reviews_deleted"), {
				description: t("toast_reviews_deleted_description", {
					count: result.deleted,
				}),
			});
			setDeleteReviewsDialogOpen(false);
			setSelectedUser(null);
			refetch();
		},
		onError: (error) => {
			toast.error(t("toast_error"), { description: error.message });
		},
	});

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

	const selectedName = selectedUser?.name || t("no_name");

	return (
		<div className="py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-6 animate-fade-up">
					<span className="eyebrow mb-2">{t("eyebrow")}</span>
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="font-bold text-3xl tracking-tight md:text-4xl">
							{t("title")}
						</h1>
						{data ? (
							<span className="inline-flex h-8 items-center rounded-full border border-primary/15 bg-primary/5 px-3 font-mono font-semibold text-primary text-sm">
								{data.users.length}
							</span>
						) : null}
					</div>
				</div>

				<div className="mb-6 flex gap-4">
					<div className="relative max-w-md flex-1">
						<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder={t("search_placeholder")}
							value={search}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setSearch(e.target.value)
							}
							className="min-h-11 pl-10"
						/>
					</div>
				</div>

				<Tabs
					defaultValue="all"
					onValueChange={(v: string) =>
						setBanned(v === "all" ? undefined : v === "banned")
					}
				>
					<TabsList className="scrollbar-hide w-full justify-start overflow-x-auto md:w-auto">
						<TabsTrigger value="all">{t("all_users")}</TabsTrigger>
						<TabsTrigger value="active">{t("active")}</TabsTrigger>
						<TabsTrigger value="banned">{t("banned")}</TabsTrigger>
					</TabsList>

					{["all", "active", "banned"].map((tab) => (
						<TabsContent key={tab} value={tab} className="mt-6">
							{isFetching ? (
								<UsersSkeleton />
							) : !data?.users.length ? (
								<EmptyState
									icon="👥"
									title={t("empty_title")}
									description={t("empty_description")}
								/>
							) : (
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
									{data?.users.map((user) => (
										<Card
											key={user.id}
											className="group card-lift animate-fade-in"
										>
											<CardHeader>
												<div className="flex items-start justify-between gap-2">
													<div className="min-w-0 flex-1">
														<CardTitle className="line-clamp-1">
															{user.name || t("no_name")}
														</CardTitle>
														<CardDescription className="mt-1 truncate">
															{user.email || user.telegramUsername || "—"}
														</CardDescription>
													</div>
													<div className="flex shrink-0 flex-col items-end gap-1">
														{user.role === "admin" && (
															<Badge className="bg-contrast text-contrast-foreground">
																<Shield className="mr-1 h-3 w-3" />
																{t("admin_badge")}
															</Badge>
														)}
														{user.isBanned && (
															<Badge variant="destructive">
																<Ban className="mr-1 h-3 w-3" />
																{t("banned_badge")}
															</Badge>
														)}
													</div>
												</div>
											</CardHeader>
											<CardContent className="space-y-4">
												<div className="space-y-2 text-muted-foreground text-sm">
													{user.telegramId && (
														<div className="flex items-center gap-2">
															<span className="font-medium">
																{t("telegram_id")}
															</span>
															<span className="font-mono">
																{user.telegramId}
															</span>
														</div>
													)}
													<div className="flex items-center gap-2">
														<Shield className="h-4 w-4 text-primary/70" />
														<span>{t("role", { role: user.role })}</span>
													</div>
													<div className="flex items-center gap-2">
														<Download className="h-4 w-4 text-primary/70" />
														<span>
															{t("plugins_count", { count: user.pluginCount })}
														</span>
													</div>
													<div className="flex items-center gap-2">
														<MessageSquare className="h-4 w-4 text-primary/70" />
														<span>
															{t("reviews_count", {
																count: user.reviewCount || 0,
															})}
														</span>
													</div>
													{user.isBanned && user.bannedReason && (
														<div className="mt-2 rounded-md bg-destructive/10 p-2 text-destructive text-xs">
															<strong>{t("ban_reason")}</strong>{" "}
															{user.bannedReason}
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
															{t("unban")}
														</Button>
													) : (
														<Button
															size="sm"
															variant="destructive"
															onClick={() => openBanDialog(user)}
															disabled={banUser.isPending}
														>
															<UserX className="mr-1 h-4 w-4" />
															{t("ban")}
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
															{t("make_admin")}
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
															{t("delete_reviews")}
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

				<AlertDialog
					open={banDialogOpen}
					onOpenChange={(open) => {
						setBanDialogOpen(open);
						if (!open) {
							setSelectedUser(null);
							setBanReason("");
						}
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t("ban_dialog_title")}</AlertDialogTitle>
							<AlertDialogDescription>
								{t("ban_dialog_description", { name: selectedName })}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div className="space-y-2">
							<Label htmlFor="banReason">{t("ban_reason_label")}</Label>
							<Textarea
								id="banReason"
								value={banReason}
								onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
									setBanReason(e.target.value)
								}
								placeholder={t("ban_reason_placeholder")}
								rows={4}
							/>
						</div>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={banUser.isPending}>
								{t("cancel")}
							</AlertDialogCancel>
							<Button
								variant="destructive"
								onClick={handleBan}
								disabled={banUser.isPending}
							>
								{banUser.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										{t("banning")}
									</>
								) : (
									<>
										<Ban className="mr-2 h-4 w-4" />
										{t("ban")}
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<AlertDialog
					open={deleteReviewsDialogOpen}
					onOpenChange={(open) => {
						setDeleteReviewsDialogOpen(open);
						if (!open) {
							setSelectedUser(null);
						}
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								{t("delete_reviews_dialog_title")}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{t("delete_reviews_dialog_description", {
									name: selectedName,
									count: selectedUser?.reviewCount || 0,
								})}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={deleteAllReviews.isPending}>
								{t("cancel")}
							</AlertDialogCancel>
							<Button
								variant="destructive"
								onClick={handleDeleteAllReviews}
								disabled={deleteAllReviews.isPending}
							>
								{deleteAllReviews.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										{t("deleting")}
									</>
								) : (
									<>
										<Trash2 className="mr-2 h-4 w-4" />
										{t("delete_all_reviews")}
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}
