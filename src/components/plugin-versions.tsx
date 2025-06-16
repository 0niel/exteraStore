"use client";

import {
	AlertCircle,
	Calendar,
	CheckCircle,
	Download,
	Eye,
	FileText,
	GitBranch,
	GitCommit,
	HardDrive,
	Hash,
	Tag as TagIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
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
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { VersionDiffDialog } from "~/components/version-diff-dialog";
import { formatBytes, formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

interface PluginVersionsProps {
	pluginSlug: string;
}

export function PluginVersions({ pluginSlug }: PluginVersionsProps) {
	const t = useTranslations("PluginVersions");
	const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

	const { data: versions, isLoading } = api.pluginVersions.getVersions.useQuery(
		{ pluginSlug },
	);

	const downloadVersionMutation =
		api.pluginVersions.downloadVersion.useMutation({
			onSuccess: (data) => {
				if (data.telegramBotDeeplink) {
					window.open(data.telegramBotDeeplink, "_blank");
					toast.success(t("download_telegram"));
				} else if (data.fileContent) {
					const blob = new Blob([data.fileContent], { type: data.mimeType });
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = data.fileName;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
					toast.success(t("file_downloaded"));
				}
			},
			onError: (error) => {
				toast.error(t("download_error", { error: error.message }));
			},
		});

	const handleDownloadVersion = (version: string) => {
		downloadVersionMutation.mutate({ pluginSlug, version });
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				{[1, 2, 3].map((i) => (
					<Card key={i}>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div className="space-y-2">
									<Skeleton className="h-5 w-24" />
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-4 w-48" />
								</div>
								<Skeleton className="h-9 w-24" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (!versions || versions.length === 0) {
		return (
			<Card>
				<CardContent className="pt-6">
					<div className="py-8 text-center">
						<GitBranch className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 className="mb-2 font-medium text-lg">
							{t("no_versions_found")}
						</h3>
						<p className="text-muted-foreground">
							{t("no_versions_description")}
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="font-semibold text-lg">{t("version_history")}</h3>
					<p className="text-muted-foreground text-sm">{t("all_versions")}</p>
				</div>
				<Badge variant="outline">
					{versions.length} {t(versions.length === 1 ? "version" : "versions")}
				</Badge>
			</div>

			<div className="space-y-3">
				{versions.map((version: any, index: any) => (
					<Card
						key={version.id}
						className={index === 0 ? "border-primary" : ""}
					>
						<CardContent className="pt-6">
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="mb-2 flex items-center gap-2">
										<h4 className="font-semibold text-lg">
											v{version.version}
										</h4>
										{index === 0 && (
											<Badge className="bg-green-600">
												<CheckCircle className="mr-1 h-3 w-3" />
												{t("current")}
											</Badge>
										)}
										{version.isStable ? (
											<Badge variant="outline">
												<CheckCircle className="mr-1 h-3 w-3" />
												{t("stable")}
											</Badge>
										) : (
											<Badge variant="secondary">
												<AlertCircle className="mr-1 h-3 w-3" />
												{t("beta")}
											</Badge>
										)}
									</div>

									<div className="mb-3 grid grid-cols-2 gap-4 text-muted-foreground text-sm md:grid-cols-4">
										<div className="flex items-center gap-1">
											<Calendar className="h-4 w-4" />
											<span>{formatDate(new Date(version.createdAt))}</span>
										</div>
										<div className="flex items-center gap-1">
											<HardDrive className="h-4 w-4" />
											<span>{formatBytes(version.fileSize)}</span>
										</div>
										<div className="flex items-center gap-1">
											<Download className="h-4 w-4" />
											<span>
												{version.downloadCount} {t("downloads")}
											</span>
										</div>
										<div className="flex items-center gap-1">
											<Hash className="h-4 w-4" />
											<span className="font-mono text-xs">
												{version.fileHash.substring(0, 8)}...
											</span>
										</div>
									</div>

									{version.gitCommitHash && (
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
													<GitBranch className="h-4 w-4" />
													<span>{version.gitBranch}</span>
												</div>
											)}
											{version.gitTag && (
												<div className="flex items-center gap-1">
													<TagIcon className="h-4 w-4" />
													<span>{version.gitTag}</span>
												</div>
											)}
										</div>
									)}

									{version.changelog && (
										<div className="mt-3">
											<h5 className="mb-2 flex items-center gap-1 font-medium">
												<FileText className="h-4 w-4" />
												{t("changelog")}
											</h5>
											<div className="rounded bg-muted p-3 text-muted-foreground text-sm">
												<div className="whitespace-pre-wrap">
													{version.changelog}
												</div>
											</div>
										</div>
									)}
								</div>

								<div className="flex flex-col gap-2">
									<Button
										onClick={() => handleDownloadVersion(version.version)}
										disabled={downloadVersionMutation.isPending}
										size="sm"
									>
										<Download className="mr-2 h-4 w-4" />
										{t("download")}
									</Button>

									{index === 0 && versions.length > 1 && (
										<Button
											variant="link"
											size="sm"
											asChild
											className="h-auto p-0 font-mono text-blue-600 text-xs hover:text-blue-800"
										>
											<Link
												href={`/plugins/${pluginSlug}/diff/${versions[1]?.fileHash?.substring(0, 8)}/${versions[0]?.fileHash?.substring(0, 8)}`}
											>
												#{versions[0]?.fileHash?.substring(0, 8)}
											</Link>
										</Button>
									)}

									<Dialog>
										<DialogTrigger asChild>
											<Button variant="outline" size="sm">
												<Eye className="mr-2 h-4 w-4" />
												{t("details")}
											</Button>
										</DialogTrigger>
										<DialogContent className="max-w-2xl">
											<DialogHeader>
												<DialogTitle>
													{t("version")} {version.version}
												</DialogTitle>
												<DialogDescription>
													{t("version_details")}
												</DialogDescription>
											</DialogHeader>
											<div className="space-y-4">
												<div className="grid grid-cols-2 gap-4">
													<div>
														<label className="font-medium text-sm">
															{t("file_size")}
														</label>
														<p className="text-muted-foreground text-sm">
															{formatBytes(version.fileSize)}
														</p>
													</div>
													<div>
														<label className="font-medium text-sm">
															{t("downloads")}
														</label>
														<p className="text-muted-foreground text-sm">
															{version.downloadCount}
														</p>
													</div>
													<div>
														<label className="font-medium text-sm">
															{t("creation_date")}
														</label>
														<p className="text-muted-foreground text-sm">
															{formatDate(new Date(version.createdAt))}
														</p>
													</div>
													<div>
														<label className="font-medium text-sm">
															{t("type")}
														</label>
														<p className="text-muted-foreground text-sm">
															{version.isStable ? t("stable") : t("beta")}
														</p>
													</div>
												</div>

												<div>
													<label className="font-medium text-sm">
														{t("sha256_hash")}
													</label>
													<p className="rounded bg-muted p-2 font-mono text-muted-foreground text-xs">
														{version.fileHash}
													</p>
												</div>

												{(version.gitCommitHash ||
													version.gitBranch ||
													version.gitTag) && (
													<div>
														<label className="font-medium text-sm">
															{t("git_info")}
														</label>
														<div className="space-y-1 text-muted-foreground text-sm">
															{version.gitCommitHash && (
																<p>
																	{t("commit")}:{" "}
																	<span className="font-mono">
																		{version.gitCommitHash}
																	</span>
																</p>
															)}
															{version.gitBranch && (
																<p>
																	{t("branch")}:{" "}
																	<span className="font-mono">
																		{version.gitBranch}
																	</span>
																</p>
															)}
															{version.gitTag && (
																<p>
																	{t("tag")}:{" "}
																	<span className="font-mono">
																		{version.gitTag}
																	</span>
																</p>
															)}
														</div>
													</div>
												)}

												{version.changelog && (
													<div>
														<label className="font-medium text-sm">
															{t("changelog")}
														</label>
														<div className="mt-2 rounded bg-muted p-3 text-muted-foreground text-sm">
															<div className="whitespace-pre-wrap">
																{version.changelog}
															</div>
														</div>
													</div>
												)}
											</div>
										</DialogContent>
									</Dialog>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
