"use client";

import {
	Calendar,
	Download,
	FileDiff,
	GitCommit,
	Loader2,
	MoreVertical,
	User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatBytes, formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

interface PluginManageVersionsProps {
	pluginId: number;
	pluginSlug: string;
}

export function PluginManageVersions({
	pluginId,
	pluginSlug,
}: PluginManageVersionsProps) {
	const t = useTranslations("PluginManageVersions");
	const { data: versions, isLoading } = api.pluginUpload.getVersions.useQuery({
		pluginId,
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin" />
				<span className="ml-2">{t("loading")}</span>
			</div>
		);
	}

	if (!versions || versions.length === 0) {
		return (
			<Card>
				<CardContent className="py-8 text-center">
					<p className="text-muted-foreground">{t("no_versions")}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{versions.map((version: any, index: any) => (
				<Card key={version.id} className={index === 0 ? "border-primary" : ""}>
					<CardContent className="pt-6">
						<div className="flex items-start justify-between gap-4">
							<div className="min-w-0 flex-1">
								<div className="mb-2 flex items-center gap-2">
									<h4 className="font-semibold text-lg">v{version.version}</h4>
									{index === 0 && (
										<Badge className="bg-green-600">{t("current")}</Badge>
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
										<span>{formatDate(new Date(version.createdAt))}</span>
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
										<h5 className="mb-2 font-medium">{t("changelog")}</h5>
										<div className="rounded bg-muted p-3 text-muted-foreground text-sm">
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
										<Button variant="outline" size="sm">
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
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
