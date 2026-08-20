"use client";

import { motion, useReducedMotion } from "framer-motion";
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
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { formatBytes, formatDate, safeJsonParse } from "~/lib/utils";
import { api } from "~/trpc/react";

interface PluginVersionsProps {
	pluginSlug: string;
}

interface PluginVersion {
	id: number;
	version: string;
	changelog: string | null;
	fileSize: number;
	fileHash: string;
	gitCommitHash: string | null;
	gitBranch: string | null;
	gitTag: string | null;
	isStable: boolean;
	downloadCount: number;
	createdAt: number;
	createdBy: {
		id: string;
		name: string | null;
		image: string | null;
	};
}

export function PluginVersions({ pluginSlug }: PluginVersionsProps) {
	const t = useTranslations("PluginVersions");
	const locale = useLocale();
	const reduceMotion = useReducedMotion();

	const {
		data: versions,
		error: versionsError,
		isError: isVersionsError,
		isLoading,
		refetch: refetchVersions,
	} = api.pluginVersions.getVersions.useQuery({ pluginSlug });

	const downloadVersionMutation =
		api.pluginVersions.downloadVersion.useMutation({
			onSuccess: (data) => {
				if (
					data.securityCheck &&
					data.securityCheck.status !== "passed" &&
					data.securityCheck.details
				) {
					const details = safeJsonParse<unknown>(
						data.securityCheck.details,
						null,
					);
					const classification =
						typeof details === "object" && details !== null
							? (details as Record<string, unknown>).classification
							: undefined;
					if (classification === "critical" || classification === "unsafe") {
						toast.error(t("security_failed_title"), {
							description: t("security_failed_description"),
							duration: 6000,
						});
					} else if (classification === "potentially_unsafe") {
						toast.warning(t("security_warning_title"), {
							description: t("security_warning_description"),
							duration: 4000,
						});
					}
				}

				if (data.telegramBotDeeplink) {
					window.open(data.telegramBotDeeplink, "_blank");
					toast.success(t("telegram_sent_title"), {
						description: t("telegram_sent_description"),
						duration: 3000,
					});
				} else if (data.fileContent) {
					const blob = new Blob([data.fileContent], {
						type: data.mimeType,
					});
					const downloadUrl = URL.createObjectURL(blob);
					const link = document.createElement("a");
					link.href = downloadUrl;
					link.download = data.fileName;
					document.body.appendChild(link);
					link.click();
					link.remove();
					setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);

					toast.success(t("downloaded_title"), {
						description: t("downloaded_description"),
						duration: 3000,
					});
				}
			},
			onError: (error) => {
				toast.error(t("download_error_title"), {
					description: error.message,
					duration: 4000,
				});
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

	if (isVersionsError) {
		return (
			<Card>
				<CardContent className="pt-6">
					<div className="space-y-4 py-8 text-center">
						<AlertCircle className="mx-auto h-12 w-12 text-destructive" />
						<div>
							<h3 className="font-medium text-lg">{t("load_error_title")}</h3>
							<p className="text-muted-foreground text-sm">
								{versionsError.message}
							</p>
						</div>
						<Button
							variant="outline"
							className="min-h-11"
							onClick={() => void refetchVersions()}
						>
							{t("retry")}
						</Button>
					</div>
				</CardContent>
			</Card>
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
				{versions.map((version: PluginVersion, index: number) => (
					<motion.div
						key={version.id}
						{...(reduceMotion
							? {}
							: {
									initial: { opacity: 0, y: 12 },
									whileInView: { opacity: 1, y: 0 },
									viewport: { once: true, margin: "-40px" },
									transition: {
										duration: 0.4,
										ease: [0.16, 1, 0.3, 1] as const,
										delay: Math.min(index, 4) * 0.05,
									},
								})}
					>
						<Card className={index === 0 ? "border-primary" : ""}>
							<CardContent className="pt-6">
								<div className="flex items-start justify-between gap-4">
									<div className="min-w-0 flex-1">
										<div className="mb-2 flex items-center gap-2">
											<h4 className="font-semibold text-lg">
												v{version.version}
											</h4>
											{index === 0 && (
												<Badge className="border-transparent bg-success/15 text-success">
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

										<div className="mb-3 grid grid-cols-1 gap-2 overflow-x-auto text-muted-foreground text-sm sm:grid-cols-2 md:grid-cols-4 md:gap-4">
											<div className="flex items-center gap-1">
												<Calendar className="h-4 w-4" />
												<span>{formatDate(version.createdAt, locale)}</span>
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
												<div className="prose prose-sm prose-neutral dark:prose-invert max-w-none rounded bg-muted p-3">
													<ReactMarkdown>{version.changelog}</ReactMarkdown>
												</div>
											</div>
										)}
									</div>

									<div className="flex flex-col gap-2">
										<Button
											onClick={() => handleDownloadVersion(version.version)}
											disabled={downloadVersionMutation.isPending}
											size="sm"
											className="press-scale min-h-11 md:min-h-8"
										>
											<Download className="mr-2 h-4 w-4" />
											{t("download")}
										</Button>

										{index < versions.length - 1 && (
											<Button
												variant="link"
												size="sm"
												asChild
												className="h-auto p-0 font-mono text-primary text-xs hover:text-primary/80"
											>
												<Link
													href={`/plugins/${pluginSlug}/diff/${versions[index + 1]?.fileHash?.substring(0, 8)}/${version.fileHash?.substring(0, 8)}`}
												>
													{t("compare_with_previous")}
												</Link>
											</Button>
										)}

										<Dialog>
											<DialogTrigger asChild>
												<Button
													variant="outline"
													size="sm"
													className="min-h-11 md:min-h-8"
												>
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
															<div className="font-medium text-sm">
																{t("file_size")}
															</div>
															<p className="text-muted-foreground text-sm">
																{formatBytes(version.fileSize)}
															</p>
														</div>
														<div>
															<div className="font-medium text-sm">
																{t("downloads")}
															</div>
															<p className="text-muted-foreground text-sm">
																{version.downloadCount}
															</p>
														</div>
														<div>
															<div className="font-medium text-sm">
																{t("creation_date")}
															</div>
															<p className="text-muted-foreground text-sm">
																{formatDate(version.createdAt, locale)}
															</p>
														</div>
														<div>
															<div className="font-medium text-sm">
																{t("type")}
															</div>
															<p className="text-muted-foreground text-sm">
																{version.isStable ? t("stable") : t("beta")}
															</p>
														</div>
													</div>

													<div>
														<div className="font-medium text-sm">
															{t("sha256_hash")}
														</div>
														<p className="rounded bg-muted p-2 font-mono text-muted-foreground text-xs">
															{version.fileHash}
														</p>
													</div>

													{(version.gitCommitHash ||
														version.gitBranch ||
														version.gitTag) && (
														<div>
															<div className="font-medium text-sm">
																{t("git_info")}
															</div>
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
															<div className="font-medium text-sm">
																{t("changelog")}
															</div>
															<div className="prose prose-sm prose-neutral dark:prose-invert mt-2 max-w-none rounded bg-muted p-3">
																<ReactMarkdown>
																	{version.changelog}
																</ReactMarkdown>
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
					</motion.div>
				))}
			</div>
		</div>
	);
}
