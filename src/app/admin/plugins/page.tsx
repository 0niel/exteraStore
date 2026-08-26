"use client";

import {
	CheckCircle,
	ChevronDown,
	Download,
	Edit,
	Loader2,
	Search,
	Shield,
	Sparkles,
	Star,
	Trash2,
	User,
	XCircle,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
import { isAdminUser } from "~/config/admins";
import { cn, safeJsonParse } from "~/lib/utils";
import { api } from "~/trpc/react";

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"];

interface AiCheck {
	id: number;
	checkType: string;
	status: string;
	score: number | null;
	details: string | null;
	classification: string | null;
	shortDescription: string | null;
	createdAt: number;
	completedAt: number | null;
}

interface AiIssue {
	severity: "low" | "medium" | "high" | "critical";
	description: string;
	recommendation?: string;
}

interface AdminPlugin {
	id: number;
	name: string;
	slug: string;
	description: string;
	shortDescription: string | null;
	author: string;
	downloadCount: number;
	rating: number;
	ratingCount: number;
	status: string;
	latestChecks: {
		security: AiCheck | null;
		performance: AiCheck | null;
	};
	checksInProgress: boolean;
}

const CLASSIFICATION_STYLES: Record<string, string> = {
	safe: "border-transparent bg-success/15 text-success",
	potentially_unsafe: "border-transparent bg-warning/15 text-warning",
	unsafe: "border-transparent bg-destructive/15 text-destructive",
	critical: "border-transparent bg-destructive/15 text-destructive",
};

const SEVERITY_STYLES: Record<string, string> = {
	low: "bg-muted text-muted-foreground",
	medium: "bg-warning/15 text-warning",
	high: "bg-destructive/15 text-destructive",
	critical: "bg-destructive/15 text-destructive",
};

const CHECK_TYPE_META = [
	{ type: "security" as const, icon: Shield },
	{ type: "performance" as const, icon: Zap },
];

function parseIssues(check: AiCheck | null): AiIssue[] {
	if (!check?.details) return [];
	const parsed = safeJsonParse<{ issues?: AiIssue[] }>(check.details, {});
	return Array.isArray(parsed.issues) ? parsed.issues : [];
}

function AiCheckRow({
	label,
	icon: Icon,
	check,
	inProgress,
	t,
}: {
	label: string;
	icon: typeof Shield;
	check: AiCheck | null;
	inProgress: boolean;
	t: ReturnType<typeof useTranslations<"AdminPlugins">>;
}) {
	const [expanded, setExpanded] = useState(false);
	const issues = parseIssues(check);
	const isRunning =
		inProgress || check?.status === "running" || check?.status === "pending";

	const classification = check?.classification ?? null;
	const badgeClass = isRunning
		? "animate-pulse border-transparent bg-muted text-muted-foreground"
		: check?.status === "error"
			? "border-transparent bg-destructive/15 text-destructive"
			: ((classification && CLASSIFICATION_STYLES[classification]) ??
				"border-transparent bg-muted text-muted-foreground");

	const badgeLabel = isRunning
		? t("ai_running")
		: check?.status === "error"
			? t("ai_error")
			: classification
				? t(
						`class_${classification}` as
							| "class_safe"
							| "class_potentially_unsafe"
							| "class_unsafe"
							| "class_critical",
					)
				: t("ai_no_checks");

	return (
		<div className="rounded-xl border border-border/60 bg-muted/30 p-3">
			<div className="flex flex-wrap items-center gap-2">
				<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Icon className="h-3.5 w-3.5" />
				</span>
				<span className="font-medium text-sm">{label}</span>
				<Badge className={badgeClass}>{badgeLabel}</Badge>
				{!isRunning && check?.score != null ? (
					<span className="ml-auto font-mono font-semibold text-sm">
						{Math.round(check.score)}
						<span className="text-muted-foreground">/100</span>
					</span>
				) : null}
			</div>
			{!isRunning && check?.shortDescription ? (
				<p className="mt-2 line-clamp-3 text-muted-foreground text-xs">
					{check.shortDescription}
				</p>
			) : null}
			{!isRunning && issues.length > 0 ? (
				<div className="mt-2">
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						className="flex min-h-8 items-center gap-1 rounded-md font-medium text-primary text-xs transition-colors hover:text-primary/80"
					>
						<ChevronDown
							className={cn(
								"h-3.5 w-3.5 transition-transform",
								expanded && "rotate-180",
							)}
						/>
						{expanded
							? t("ai_hide_issues")
							: t("ai_show_issues", { count: issues.length })}
					</button>
					{expanded ? (
						<ul className="mt-2 space-y-2">
							{issues.map((issue, index) => (
								<li
									key={`${issue.severity}-${index}-${issue.description.slice(0, 24)}`}
									className="rounded-lg border border-border/60 bg-background p-2.5"
								>
									<span
										className={cn(
											"inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[11px]",
											SEVERITY_STYLES[issue.severity] ??
												"bg-muted text-muted-foreground",
										)}
									>
										{t(
											`severity_${issue.severity}` as
												| "severity_low"
												| "severity_medium"
												| "severity_high"
												| "severity_critical",
										)}
									</span>
									<p className="mt-1.5 text-foreground text-xs">
										{issue.description}
									</p>
									{issue.recommendation ? (
										<p className="mt-1 text-muted-foreground text-xs">
											<span className="font-medium text-foreground">
												{t("ai_recommendation")}:
											</span>{" "}
											{issue.recommendation}
										</p>
									) : null}
								</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}
		</div>
	);
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

	const isAdmin = isAdminUser(session?.user);

	const [pendingCheckIds, setPendingCheckIds] = useState<number[]>([]);

	const { data, refetch, isFetching } = api.adminPlugins.getPlugins.useQuery(
		{
			page: 1,
			limit: 50,
			status,
			search,
		},
		{
			enabled: Boolean(session && isAdmin),
			refetchInterval: (query) =>
				query.state.data?.plugins.some(
					(p: { checksInProgress: boolean }) => p.checksInProgress,
				) || pendingCheckIds.length > 0
					? 4000
					: false,
		},
	);

	const runChecks = api.pluginPipeline.runChecks.useMutation({
		onSuccess: (_result, variables) => {
			toast.success(t("toast_checks_started"), {
				description: t("toast_checks_queued_description"),
			});
			setPendingCheckIds((ids) =>
				ids.includes(variables.pluginId) ? ids : [...ids, variables.pluginId],
			);
			refetch();
		},
		onError: (error) => {
			toast.error(t("toast_checks_error"), { description: error.message });
		},
	});

	useEffect(() => {
		if (!data || pendingCheckIds.length === 0) return;
		const stillRunning = pendingCheckIds.filter((id) =>
			data.plugins.some(
				(p: { id: number; checksInProgress: boolean }) =>
					p.id === id && p.checksInProgress,
			),
		);
		if (stillRunning.length !== pendingCheckIds.length) {
			setPendingCheckIds(stillRunning);
		}
	}, [data, pendingCheckIds]);

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
				<div className="mb-6 animate-fade-up">
					<span className="eyebrow mb-2">{t("eyebrow")}</span>
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="font-bold text-3xl tracking-tight md:text-4xl">
							{t("title")}
						</h1>
						{data ? (
							<span className="inline-flex h-8 items-center rounded-full border border-primary/15 bg-primary/5 px-3 font-mono font-semibold text-primary text-sm">
								{data.plugins.length}
							</span>
						) : null}
					</div>
				</div>

				<div className="relative mb-6 max-w-md">
					<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder={t("search_placeholder")}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="min-h-11 pl-10"
					/>
				</div>

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
										<Card
											key={plugin.id}
											className="group card-lift animate-fade-in"
										>
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
														<User className="h-4 w-4 text-primary/70" />
														{plugin.author}
													</span>
													<span className="flex items-center gap-1 font-mono">
														<Download className="h-4 w-4 text-primary/70" />
														{plugin.downloadCount}
													</span>
													<span className="flex items-center gap-1 font-mono">
														<Star className="h-4 w-4 text-primary/70" />
														{plugin.ratingCount > 0
															? plugin.rating.toFixed(1)
															: "—"}
													</span>
												</div>
												<Badge
													className={
														(
															{
																approved:
																	"border-transparent bg-success/15 text-success",
																pending:
																	"border-transparent bg-warning/15 text-warning",
																rejected:
																	"border-transparent bg-destructive/15 text-destructive",
															} as Record<string, string>
														)[plugin.status] ??
														"border-transparent bg-muted text-muted-foreground"
													}
												>
													{t(
														plugin.status as
															| "pending"
															| "approved"
															| "rejected",
													)}
												</Badge>
												<div className="space-y-2">
													<div className="flex items-center justify-between">
														<span className="eyebrow">{t("ai_checks")}</span>
														<Button
															variant="outline"
															size="sm"
															onClick={() =>
																runChecks.mutate({ pluginId: plugin.id })
															}
															disabled={
																plugin.checksInProgress ||
																pendingCheckIds.includes(plugin.id) ||
																(runChecks.isPending &&
																	runChecks.variables?.pluginId === plugin.id)
															}
														>
															{plugin.checksInProgress ||
															pendingCheckIds.includes(plugin.id) ||
															(runChecks.isPending &&
																runChecks.variables?.pluginId === plugin.id) ? (
																<>
																	<Loader2 className="mr-1 h-4 w-4 animate-spin" />
																	{t("ai_running")}
																</>
															) : (
																<>
																	<Sparkles className="mr-1 h-4 w-4" />
																	{t("ai_run")}
																</>
															)}
														</Button>
													</div>
													{plugin.checksInProgress ||
													pendingCheckIds.includes(plugin.id) ? (
														<p className="rounded-lg border border-border/60 border-dashed bg-muted/30 px-3 py-2 text-muted-foreground text-xs">
															{t("ai_queued_hint")}
														</p>
													) : null}
													{CHECK_TYPE_META.map(({ type, icon }) => (
														<AiCheckRow
															key={type}
															label={t(
																type === "security"
																	? "ai_security"
																	: "ai_performance",
															)}
															icon={icon}
															check={plugin.latestChecks[type]}
															inProgress={
																plugin.checksInProgress ||
																pendingCheckIds.includes(plugin.id)
															}
															t={t}
														/>
													))}
												</div>
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
