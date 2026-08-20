"use client";

import {
	Calendar,
	Download,
	FileDiff,
	GitCommit,
	Loader2,
	MoreVertical,
	Trash2,
	User,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { EmptyState } from "~/components/ui/empty-state";
import { formatBytes, formatDate } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

type PluginVersion = RouterOutputs["pluginUpload"]["getVersions"][number];

interface PluginManageVersionsProps {
	pluginId: number;
	pluginSlug: string;
}

export function PluginManageVersions({
	pluginId,
	pluginSlug,
}: PluginManageVersionsProps) {
	const t = useTranslations("PluginManageVersions");
	const locale = useLocale();
	const {
		data: versions,
		isLoading,
		refetch,
	} = api.pluginUpload.getVersions.useQuery({
		pluginId,
	});

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [versionToDelete, setVersionToDelete] = useState<string | null>(null);

	const deleteVersion = api.pluginVersions.deleteVersion.useMutation({
		onSuccess: () => {
			toast.success(t("toast_deleted"));
			setDeleteDialogOpen(false);
			setVersionToDelete(null);
			refetch();
		},
		onError: (error) => {
			toast.error(t("toast_delete_error"), { description: error.message });
		},
	});

	if (isLoading) {
		return (
			<div className="space-y-4" aria-hidden="true">
				{[0, 1, 2].map((i) => (
					<div key={i} className="space-y-3 rounded-2xl border bg-card p-5">
						<div className="flex items-center gap-3">
							<div className="skeleton-shimmer h-9 w-9 shrink-0 rounded-xl" />
							<div className="skeleton-shimmer h-5 w-24 rounded-md" />
							<div className="skeleton-shimmer h-5 w-16 rounded-full" />
						</div>
						<div className="skeleton-shimmer h-4 w-2/3 rounded-md" />
						<div className="skeleton-shimmer h-4 w-1/2 rounded-md" />
					</div>
				))}
			</div>
		);
	}

	if (!versions || versions.length === 0) {
		return (
			<EmptyState
				icon="🗂️"
				title={t("no_versions")}
				description={t("no_versions_description")}
			/>
		);
	}

	return (
		<div className="space-y-4">
			{versions.map((version: PluginVersion, index: number) => (
				<Card
					key={version.id}
					className={
						index === 0 ? "border-primary/40 bg-primary/[0.03]" : undefined
					}
				>
					<CardContent className="pt-6">
						<div className="flex items-start justify-between gap-4">
							<div className="min-w-0 flex-1">
								<div className="mb-2 flex flex-wrap items-center gap-2">
									<span
										className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono font-semibold text-xs ${
											index === 0
												? "bg-primary text-primary-foreground"
												: "bg-primary/10 text-primary"
										}`}
									>
										{String(index + 1).padStart(2, "0")}
									</span>
									<h4 className="font-mono font-semibold text-lg tracking-tight">
										v{version.version}
									</h4>
									{index === 0 && (
										<Badge className="border-transparent bg-success/15 text-success">
											{t("current")}
										</Badge>
									)}
									{version.isStable ? (
										<Badge variant="outline">{t("stable")}</Badge>
									) : (
										<Badge variant="secondary">{t("beta")}</Badge>
									)}
								</div>

								<div className="mb-3 grid grid-cols-2 gap-4 text-muted-foreground text-sm md:grid-cols-4">
									<div className="flex items-center gap-1">
										<Calendar className="h-4 w-4" />
										<span>{formatDate(version.createdAt, locale)}</span>
									</div>
									<div className="flex items-center gap-1">
										<Download className="h-4 w-4" />
										<span>{formatBytes(version.fileSize)}</span>
									</div>
									<div className="flex items-center gap-1">
										<Download className="h-4 w-4" />
										<span>
											{version.downloadCount} {t("downloads")}
										</span>
									</div>
									<div className="flex items-center gap-1">
										<User className="h-4 w-4" />
										<span>{version.createdBy?.name || t("unknown")}</span>
									</div>
								</div>

								{(version.gitCommitHash ||
									version.gitBranch ||
									version.gitTag) && (
									<div className="mb-3 flex items-center gap-4 text-muted-foreground text-sm">
										{version.gitCommitHash && (
											<div className="flex items-center gap-1">
												<GitCommit className="h-4 w-4" />
												<span className="font-mono">
													{version.gitCommitHash.substring(0, 7)}
												</span>
											</div>
										)}
										{version.gitBranch && (
											<div className="flex items-center gap-1">
												<span>
													{t("branch")}: {version.gitBranch}
												</span>
											</div>
										)}
										{version.gitTag && (
											<div className="flex items-center gap-1">
												<span>
													{t("tag")}: {version.gitTag}
												</span>
											</div>
										)}
									</div>
								)}

								{version.changelog && (
									<div className="mt-3">
										<h5 className="eyebrow mb-2">{t("changelog")}</h5>
										<div className="rounded-lg border bg-surface p-3 text-muted-foreground text-sm">
											<div className="whitespace-pre-wrap">
												{version.changelog}
											</div>
										</div>
									</div>
								)}
							</div>

							<div className="flex flex-col gap-2">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											aria-label={t("actions")}
										>
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem>
											<Download className="mr-2 h-4 w-4" />
											{t("download_file")}
										</DropdownMenuItem>
										{index === 0 && versions.length > 1 && (
											<DropdownMenuItem asChild>
												<Link
													href={`/plugins/${pluginSlug}/diff/${versions[1]?.fileHash?.substring(0, 8)}/${versions[0]?.fileHash?.substring(0, 8)}`}
												>
													<FileDiff className="mr-2 h-4 w-4" />
													{t("view_changes")}
												</Link>
											</DropdownMenuItem>
										)}
										<DropdownMenuItem
											variant="destructive"
											onClick={() => {
												setVersionToDelete(version.version);
												setDeleteDialogOpen(true);
											}}
										>
											<Trash2 className="mr-2 h-4 w-4" />
											{t("delete_version")}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("delete_version_title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("delete_version_description", {
								version: versionToDelete ?? "",
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (!versionToDelete) return;
								deleteVersion.mutate({ pluginSlug, version: versionToDelete });
							}}
							disabled={deleteVersion.isPending}
						>
							{deleteVersion.isPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							{t("confirm_delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
