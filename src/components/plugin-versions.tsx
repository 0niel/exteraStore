"use client";

import {
	AlertCircle,
	ArrowLeftRight,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	Download,
	Eye,
	FileClock,
	FileText,
	GitBranch,
	GitCommit,
	HardDrive,
	Hash,
	Loader2,
	PackageCheck,
	Rocket,
	Tag as TagIcon,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { UserAvatar } from "~/components/user-avatar";
import { VersionDiffDialog } from "~/components/version-diff-dialog";
import { useTelegramWebApp } from "~/hooks/use-telegram-web-app";
import { getPluginReleaseChannel } from "~/lib/plugin-version";
import { cn, formatBytes, formatDate, safeJsonParse } from "~/lib/utils";
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
	isCurrent: boolean;
	downloadCount: number;
	createdAt: number;
	createdBy: {
		id: string;
		name: string | null;
		image: string | null;
	};
}

type ReleaseFilter = "all" | "stable" | "preview";

function ReleaseDetails({
	version,
	locale,
	t,
}: {
	version: PluginVersion;
	locale: string;
	t: ReturnType<typeof useTranslations>;
}) {
	return (
		<div className="space-y-5">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{[
					[t("file_size"), formatBytes(version.fileSize)],
					[t("downloads"), version.downloadCount.toLocaleString(locale)],
					[t("creation_date"), formatDate(version.createdAt, locale)],
					[t("type"), version.isStable ? t("stable") : t("preview")],
				].map(([label, value]) => (
					<div key={label} className="rounded-2xl bg-muted/45 p-3">
						<p className="text-muted-foreground text-xs">{label}</p>
						<p className="mt-1 font-medium text-sm">{value}</p>
					</div>
				))}
			</div>

			<div className="rounded-2xl bg-muted/45 p-3">
				<p className="mb-2 font-medium text-sm">{t("sha256_hash")}</p>
				<p className="break-all font-mono text-muted-foreground text-xs">
					{version.fileHash}
				</p>
			</div>

			{(version.gitCommitHash || version.gitBranch || version.gitTag) && (
				<div className="rounded-2xl bg-muted/45 p-3">
					<p className="mb-2 font-medium text-sm">{t("git_info")}</p>
					<div className="space-y-2 text-muted-foreground text-sm">
						{version.gitCommitHash && (
							<p className="break-all font-mono">
								{t("commit")}: {version.gitCommitHash}
							</p>
						)}
						{version.gitBranch && (
							<p className="break-all">
								{t("branch")}: {version.gitBranch}
							</p>
						)}
						{version.gitTag && (
							<p className="break-all">
								{t("tag")}: {version.gitTag}
							</p>
						)}
					</div>
				</div>
			)}

			{version.changelog && (
				<div>
					<p className="mb-2 font-medium text-sm">{t("changelog")}</p>
					<div className="prose prose-sm prose-neutral dark:prose-invert max-w-none rounded-2xl bg-muted/45 p-4">
						<ReactMarkdown>{version.changelog}</ReactMarkdown>
					</div>
				</div>
			)}
		</div>
	);
}

export function PluginVersions({ pluginSlug }: PluginVersionsProps) {
	const t = useTranslations("PluginVersions");
	const locale = useLocale();
	const { webApp, isTelegramWebApp } = useTelegramWebApp();
	const [filter, setFilter] = useState<ReleaseFilter>("all");
	const [expanded, setExpanded] = useState<Set<number>>(new Set());
	const [copiedHash, setCopiedHash] = useState<number | null>(null);

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
					if (isTelegramWebApp && webApp?.openTelegramLink) {
						webApp.HapticFeedback?.notificationOccurred?.("success");
						webApp.openTelegramLink(data.telegramBotDeeplink);
						window.setTimeout(() => webApp.close(), 180);
					} else {
						window.open(
							data.telegramBotDeeplink,
							"_blank",
							"noopener,noreferrer",
						);
					}
					toast.success(t("telegram_sent_title"), {
						description: t("telegram_sent_description"),
					});
					return;
				}

				if (data.fileContent) {
					const blob = new Blob([data.fileContent], { type: data.mimeType });
					const downloadUrl = URL.createObjectURL(blob);
					const link = document.createElement("a");
					link.href = downloadUrl;
					link.download = data.fileName;
					document.body.appendChild(link);
					link.click();
					link.remove();
					window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
					toast.success(t("downloaded_title"), {
						description: t("downloaded_description"),
					});
				}
			},
			onError: (error) => {
				webApp?.HapticFeedback?.notificationOccurred?.("error");
				toast.error(t("download_error_title"), {
					description: error.message,
				});
			},
		});

	const filteredVersions = useMemo(() => {
		if (!versions) return [];
		if (filter === "stable")
			return versions.filter((version) => version.isStable);
		if (filter === "preview")
			return versions.filter((version) => !version.isStable);
		return versions;
	}, [filter, versions]);

	const stats = useMemo(() => {
		const all = versions ?? [];
		return {
			stable: all.filter((version) => version.isStable).length,
			downloads: all.reduce((sum, version) => sum + version.downloadCount, 0),
		};
	}, [versions]);

	const copyHash = async (version: PluginVersion) => {
		try {
			await navigator.clipboard.writeText(version.fileHash);
			setCopiedHash(version.id);
			webApp?.HapticFeedback?.selectionChanged?.();
			toast.success(t("hash_copied"));
			window.setTimeout(() => setCopiedHash(null), 1800);
		} catch {
			webApp?.HapticFeedback?.notificationOccurred?.("error");
			toast.error(t("hash_copy_failed"));
		}
	};

	const toggleExpanded = (id: number) => {
		setExpanded((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	if (isLoading) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-24 w-full rounded-3xl" />
				{[1, 2].map((item) => (
					<Skeleton key={item} className="h-64 w-full rounded-3xl" />
				))}
			</div>
		);
	}

	if (isVersionsError) {
		return (
			<div className="rounded-3xl bg-destructive/8 px-5 py-10 text-center">
				<AlertCircle className="mx-auto size-10 text-destructive" />
				<h3 className="mt-3 font-semibold text-lg">{t("load_error_title")}</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					{versionsError.message}
				</p>
				<Button
					className="mt-5"
					variant="secondary"
					onClick={() => void refetchVersions()}
				>
					{t("retry")}
				</Button>
			</div>
		);
	}

	if (!versions?.length) {
		return (
			<div className="rounded-3xl bg-muted/35 p-8 text-center">
				<div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
					<FileClock className="size-7" />
				</div>
				<h3 className="mt-4 font-semibold text-lg">{t("no_versions_found")}</h3>
				<p className="mt-1 text-muted-foreground text-sm">
					{t("no_versions_description")}
				</p>
			</div>
		);
	}

	return (
		<div className="min-w-0 space-y-5 overflow-hidden">
			<section className="rounded-3xl bg-linear-to-br from-primary/12 via-card to-card p-4 sm:p-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<span className="eyebrow">{t("release_center")}</span>
						<h2 className="mt-2 font-bold text-xl sm:text-2xl">
							{t("version_history")}
						</h2>
						<p className="mt-1 max-w-xl text-muted-foreground text-sm">
							{t("release_center_description")}
						</p>
					</div>
					{versions.length > 1 && (
						<VersionDiffDialog
							pluginSlug={pluginSlug}
							versions={versions}
							triggerText={t("compare_releases")}
						/>
					)}
				</div>

				<div className="mt-5 grid grid-cols-3 gap-2">
					{[
						[t("releases"), versions.length.toLocaleString(locale)],
						[t("stable_releases"), stats.stable.toLocaleString(locale)],
						[t("total_downloads"), stats.downloads.toLocaleString(locale)],
					].map(([label, value]) => (
						<div
							key={label}
							className="rounded-2xl bg-background/55 px-3 py-3 backdrop-blur-sm"
						>
							<p className="font-semibold text-base sm:text-lg">{value}</p>
							<p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
								{label}
							</p>
						</div>
					))}
				</div>
			</section>

			<fieldset className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
				<legend className="sr-only">{t("filter_releases")}</legend>
				{(["all", "stable", "preview"] as const).map((value) => (
					<Button
						key={value}
						variant={filter === value ? "default" : "secondary"}
						size="sm"
						aria-pressed={filter === value}
						onClick={() => setFilter(value)}
					>
						{t(`filter_${value}`)}
					</Button>
				))}
			</fieldset>

			<div className="relative space-y-4 pl-7 sm:pl-10">
				<div
					className="absolute top-7 bottom-7 left-[6px] w-px bg-primary/20 sm:left-[10px]"
					aria-hidden="true"
				/>
				{filteredVersions.map((version, index) => {
					const releaseIndex = versions.findIndex(
						(item) => item.id === version.id,
					);
					const releaseNumber = versions.length - releaseIndex;
					const channel = getPluginReleaseChannel(
						version.version,
						version.isStable,
					);
					const isExpanded = expanded.has(version.id);
					const hasLongChangelog = (version.changelog?.length ?? 0) > 240;
					return (
						<article
							key={version.id}
							className={cn(
								"relative min-w-0 rounded-3xl bg-card p-4 sm:p-6",
								version.isCurrent &&
									"bg-linear-to-br from-primary/10 via-card to-card",
							)}
						>
							<span
								className={cn(
									"absolute top-7 -left-[27px] size-3 rounded-full bg-muted ring-4 ring-background sm:-left-[38px] sm:size-4",
									version.isCurrent && "bg-primary ring-primary/15",
								)}
								aria-hidden="true"
							/>

							<header className="min-w-0">
								<div className="flex flex-wrap items-center gap-2 text-xs">
									<span className="font-mono text-muted-foreground">
										{String(releaseNumber).padStart(2, "0")}
									</span>
									{version.isCurrent && (
										<Badge className="border-transparent bg-success/15 text-success">
											<CheckCircle2 className="size-3" /> {t("current")}
										</Badge>
									)}
									<Badge variant="secondary">{t(`channel_${channel}`)}</Badge>
								</div>
								<h3
									className="mt-3 max-w-full truncate font-bold font-mono text-2xl tracking-tight"
									title={`v${version.version}`}
								>
									v{version.version}
								</h3>
							</header>

							<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
								<div className="flex min-w-0 items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2.5">
									<Calendar className="size-4 shrink-0 text-primary" />
									<span className="truncate text-xs">
										{formatDate(version.createdAt, locale)}
									</span>
								</div>
								<div className="flex min-w-0 items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2.5">
									<HardDrive className="size-4 shrink-0 text-primary" />
									<span className="truncate text-xs">
										{formatBytes(version.fileSize)}
									</span>
								</div>
								<div className="flex min-w-0 items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2.5">
									<Download className="size-4 shrink-0 text-primary" />
									<span className="truncate text-xs">
										{version.downloadCount.toLocaleString(locale)}
									</span>
								</div>
								<button
									type="button"
									className="flex min-w-0 touch-manipulation items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2.5 text-left transition-colors active:bg-muted"
									onClick={() => void copyHash(version)}
									aria-label={t("copy_hash")}
								>
									{copiedHash === version.id ? (
										<Check className="size-4 shrink-0 text-success" />
									) : (
										<Hash className="size-4 shrink-0 text-primary" />
									)}
									<span className="truncate font-mono text-xs">
										{version.fileHash.slice(0, 8)}
									</span>
								</button>
							</div>

							<Link
								href={`/developers/${version.createdBy.id}`}
								className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full py-1 pr-3 transition-colors hover:bg-muted/45"
							>
								<UserAvatar
									name={version.createdBy.name}
									src={version.createdBy.image}
									className="size-7"
								/>
								<span className="truncate text-muted-foreground text-xs">
									{t("released_by", {
										name: version.createdBy.name || t("unknown_author"),
									})}
								</span>
							</Link>

							{(version.gitCommitHash ||
								version.gitBranch ||
								version.gitTag) && (
								<div className="mt-3 flex flex-wrap gap-2 text-muted-foreground text-xs">
									{version.gitCommitHash && (
										<span className="inline-flex items-center gap-1">
											<GitCommit className="size-3.5" />
											{version.gitCommitHash.slice(0, 7)}
										</span>
									)}
									{version.gitBranch && (
										<span className="inline-flex items-center gap-1">
											<GitBranch className="size-3.5" />
											{version.gitBranch}
										</span>
									)}
									{version.gitTag && (
										<span className="inline-flex items-center gap-1">
											<TagIcon className="size-3.5" />
											{version.gitTag}
										</span>
									)}
								</div>
							)}

							{version.changelog ? (
								<div className="mt-5 rounded-2xl bg-muted/35 p-4">
									<div className="mb-2 flex items-center gap-2 font-medium text-sm">
										<FileText className="size-4 text-primary" />{" "}
										{t("changelog")}
									</div>
									<div
										className={cn(
											"prose prose-sm prose-neutral dark:prose-invert max-w-none overflow-hidden",
											hasLongChangelog && !isExpanded && "line-clamp-4",
										)}
									>
										<ReactMarkdown>{version.changelog}</ReactMarkdown>
									</div>
									{hasLongChangelog && (
										<button
											type="button"
											className="mt-3 inline-flex min-h-10 items-center gap-1 font-medium text-primary text-sm"
											onClick={() => toggleExpanded(version.id)}
										>
											{isExpanded ? t("show_less") : t("show_more")}
											<ChevronDown
												className={cn(
													"size-4 transition-transform",
													isExpanded && "rotate-180",
												)}
											/>
										</button>
									)}
								</div>
							) : (
								<p className="mt-5 text-muted-foreground text-sm">
									{t("no_changelog")}
								</p>
							)}

							<div className="mt-5 grid grid-cols-2 gap-2">
								<Button
									className="col-span-2"
									onClick={() =>
										downloadVersionMutation.mutate({
											pluginSlug,
											version: version.version,
										})
									}
									disabled={downloadVersionMutation.isPending}
								>
									{downloadVersionMutation.isPending ? (
										<Loader2 className="animate-spin" />
									) : (
										<Download />
									)}
									{t("download_version", { version: version.version })}
								</Button>

								<Dialog>
									<DialogTrigger asChild>
										<Button variant="secondary">
											<Eye />
											{t("details")}
										</Button>
									</DialogTrigger>
									<DialogContent closeLabel={t("close")}>
										<DialogHeader>
											<DialogTitle className="pr-8">
												{t("version_title", { version: version.version })}
											</DialogTitle>
											<DialogDescription>
												{t("version_details")}
											</DialogDescription>
										</DialogHeader>
										<ReleaseDetails version={version} locale={locale} t={t} />
									</DialogContent>
								</Dialog>

								{index < filteredVersions.length - 1 ? (
									<Button variant="secondary" asChild>
										<Link
											href={`/plugins/${pluginSlug}/diff/${filteredVersions[index + 1]?.fileHash.slice(0, 8)}/${version.fileHash.slice(0, 8)}`}
										>
											<ArrowLeftRight />
											{t("compare")}
										</Link>
									</Button>
								) : (
									<div className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-muted/30 text-muted-foreground text-xs">
										<PackageCheck className="size-4" /> {t("first_release")}
									</div>
								)}
							</div>
						</article>
					);
				})}
			</div>

			{filteredVersions.length === 0 && (
				<div className="rounded-3xl bg-muted/35 p-8 text-center">
					<Rocket className="mx-auto size-8 text-primary" />
					<p className="mt-3 font-medium">{t("filter_empty")}</p>
				</div>
			)}
		</div>
	);
}
