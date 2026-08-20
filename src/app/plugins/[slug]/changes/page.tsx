"use client";

import { type Change, diffLines } from "diff";
import { motion, useReducedMotion } from "framer-motion";
import {
	ArrowLeft,
	Calendar,
	Clock,
	Copy,
	FileText,
	GitCommit,
	Minus,
	Plus,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

export default function PluginChangesPage() {
	const params = useParams();
	const slug = params.slug as string;
	const t = useTranslations("PluginChangesPage");
	const locale = useLocale();
	const reduceMotion = useReducedMotion();

	const { data: plugin } = api.plugins.getBySlug.useQuery({ slug });
	const { data: versions } = api.pluginVersions.getVersions.useQuery({
		pluginSlug: slug,
	});

	const latestVersion = versions?.[0];
	const previousVersion = versions?.[1];

	const { data: diffData, isLoading } =
		api.pluginVersions.getCommitDiff.useQuery(
			{
				pluginSlug: slug,
				fromHash: previousVersion?.fileHash?.substring(0, 8) || "",
				toHash: latestVersion?.fileHash?.substring(0, 8) || "",
			},
			{
				enabled: !!latestVersion && !!previousVersion,
			},
		);

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text).then(() => {
			toast.success(t("copied"));
		});
	};

	const timelineMotion = reduceMotion
		? {}
		: {
				initial: { opacity: 0, y: 16 },
				whileInView: { opacity: 1, y: 0 },
				viewport: { once: true, margin: "-40px" },
				transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
			};

	const renderDiffStats = (changes: Change[]) => {
		let additions = 0;
		let deletions = 0;

		changes.forEach((change) => {
			const lines = change.value.split("\n").filter((line) => line !== "");
			if (change.added) additions += lines.length;
			if (change.removed) deletions += lines.length;
		});

		return { additions, deletions };
	};

	const renderDiff = () => {
		if (!diffData?.oldContent || !diffData?.newContent) {
			return (
				<div className="py-12 text-center text-muted-foreground">
					<FileText className="mx-auto mb-4 h-16 w-16 opacity-50" />
					<h3 className="mb-2 font-medium text-lg">{t("no_changes_title")}</h3>
					<p>{t("no_changes_description")}</p>
				</div>
			);
		}

		const changes: Change[] = diffLines(
			diffData.oldContent,
			diffData.newContent,
		);
		const { additions, deletions } = renderDiffStats(changes);
		let lineNumber = 1;

		return (
			<div className="space-y-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-4 text-sm">
						<div className="flex items-center gap-1 text-success">
							<Plus className="h-4 w-4" />
							<span className="font-medium">
								{t("additions", { count: additions })}
							</span>
						</div>
						<div className="flex items-center gap-1 text-destructive">
							<Minus className="h-4 w-4" />
							<span className="font-medium">
								{t("deletions", { count: deletions })}
							</span>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="min-h-11 md:min-h-8"
						onClick={() => copyToClipboard(diffData.newContent)}
					>
						<Copy className="mr-2 h-4 w-4" />
						{t("copy_code")}
					</Button>
				</div>

				<Card className="overflow-hidden py-0">
					<CardContent className="p-0">
						<div className="max-h-[70vh] overflow-y-auto bg-muted/30">
							<div className="glass sticky top-0 z-10 border-b px-4 py-3">
								<div className="flex items-center gap-2 font-mono text-sm">
									<FileText className="h-4 w-4 shrink-0" />
									<span className="truncate">{plugin?.name}.py</span>
								</div>
							</div>
							<div className="scrollbar-hide overflow-x-auto font-mono text-sm">
								<div className="min-w-max">
									{changes.map((change, changeIndex) => {
										const lines = change.value
											.split("\n")
											.filter((line) => line !== "");

										return lines.map((line, lineIndex) => {
											const currentLineNumber = lineNumber++;
											let bgColor = "";
											let textColor = "";
											let prefix = " ";
											let borderColor = "";

											if (change.added) {
												bgColor = "bg-success/10";
												textColor = "text-success";
												borderColor = "border-l-4 border-success";
												prefix = "+";
											} else if (change.removed) {
												bgColor = "bg-destructive/10";
												textColor = "text-destructive";
												borderColor = "border-l-4 border-destructive";
												prefix = "-";
											} else {
												textColor = "text-muted-foreground";
											}

											return (
												<div
													key={`${changeIndex}-${lineIndex}`}
													className={`flex hover:bg-muted/50 ${bgColor} ${borderColor}`}
												>
													<div className="w-12 flex-shrink-0 select-none border-r bg-muted/20 px-2 py-1 text-muted-foreground text-xs">
														{!change.removed && currentLineNumber}
													</div>
													<div className="w-8 flex-shrink-0 select-none px-2 py-1 text-center font-bold text-xs">
														<span className={textColor}>{prefix}</span>
													</div>
													<div
														className={`flex-1 whitespace-pre px-2 py-1 ${textColor}`}
													>
														{line}
													</div>
												</div>
											);
										});
									})}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	};

	if (isLoading) {
		return (
			<div className="bg-background">
				<div className="container mx-auto px-4 py-8">
					<div className="space-y-6">
						<div className="skeleton-shimmer h-8 w-64 rounded-md" />
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
							<div className="skeleton-shimmer h-32 rounded-xl" />
							<div className="skeleton-shimmer h-32 rounded-xl" />
						</div>
						<div className="skeleton-shimmer h-96 rounded-xl" />
					</div>
				</div>
			</div>
		);
	}

	if (!versions || versions.length < 2) {
		return (
			<div className="flex min-h-[60dvh] items-center justify-center bg-background">
				<div className="px-4 text-center">
					<div className="mb-4 text-6xl">📝</div>
					<h1 className="mb-2 font-bold text-2xl">
						{t("not_enough_versions_title")}
					</h1>
					<p className="mb-4 text-muted-foreground">
						{t("not_enough_versions_description")}
					</p>
					<Link href={`/plugins/${slug}`}>
						<Button className="min-h-11">{t("back_to_plugin_button")}</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-background">
			<div className="container mx-auto max-w-4xl px-4 py-6 md:py-8">
				<div className="space-y-6">
					<div className="flex flex-wrap items-center gap-3 md:gap-4">
						<Link href={`/plugins/${slug}`}>
							<Button
								variant="outline"
								size="sm"
								className="min-h-11 md:min-h-8"
							>
								<ArrowLeft className="mr-2 h-4 w-4" />
								{t("back_to_plugin")}
							</Button>
						</Link>
						<div className="flex min-w-0 items-center gap-2 text-muted-foreground text-sm">
							<Link
								href={`/plugins/${slug}`}
								className="truncate hover:text-foreground"
							>
								{plugin?.name}
							</Link>
							<span>/</span>
							<span className="whitespace-nowrap">{t("breadcrumb")}</span>
						</div>
					</div>

					<div className="space-y-2">
						<div className="flex flex-wrap items-center gap-3">
							<Zap className="h-6 w-6 text-warning" />
							<h1 className="font-bold text-2xl">{t("title")}</h1>
							<Badge className="border-transparent bg-warning/15 text-warning">
								<Clock className="mr-1 h-3 w-3" />
								{t("fresh")}
							</Badge>
						</div>
						<p className="text-muted-foreground">{t("subtitle")}</p>
					</div>

					<div className="relative pl-7 md:pl-9">
						<div
							className="absolute top-2 bottom-2 left-[7px] w-px bg-border md:left-[9px]"
							aria-hidden="true"
						/>

						<motion.div className="relative mb-6" {...timelineMotion}>
							<span
								className="absolute top-1.5 -left-7 h-3.5 w-3.5 rounded-full bg-primary ring-4 ring-primary/15 md:-left-9"
								aria-hidden="true"
							/>
							<Card className="border-success/30">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-success">
										<Zap className="h-5 w-5" />
										{t("current_version")}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-2">
										<span className="font-semibold">
											v{latestVersion?.version}
										</span>
										<Badge className="border-transparent bg-success/15 text-success">
											{t("new_badge")}
										</Badge>
									</div>
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<Calendar className="h-4 w-4" />
										<span>
											{formatDate(
												new Date(latestVersion?.createdAt || ""),
												locale,
											)}
										</span>
									</div>
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<GitCommit className="h-4 w-4" />
										<span className="font-mono">
											{latestVersion?.fileHash?.substring(0, 8)}
										</span>
									</div>
									{latestVersion?.changelog && (
										<div className="text-sm">
											<p className="mb-1 font-medium">{t("whats_new")}</p>
											<p className="rounded bg-muted p-2 text-muted-foreground text-xs">
												{latestVersion.changelog}
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						</motion.div>

						<motion.div className="relative mb-6" {...timelineMotion}>
							<span
								className="absolute top-1.5 -left-7 h-3.5 w-3.5 rounded-full bg-primary/40 ring-4 ring-primary/10 md:-left-9"
								aria-hidden="true"
							/>
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-muted-foreground">
										<GitCommit className="h-5 w-5" />
										{t("previous_version")}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-2">
										<span className="font-semibold">
											v{previousVersion?.version}
										</span>
										<Badge variant="outline">{t("old_badge")}</Badge>
									</div>
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<Calendar className="h-4 w-4" />
										<span>
											{formatDate(
												new Date(previousVersion?.createdAt || ""),
												locale,
											)}
										</span>
									</div>
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<GitCommit className="h-4 w-4" />
										<span className="font-mono">
											{previousVersion?.fileHash?.substring(0, 8)}
										</span>
									</div>
								</CardContent>
							</Card>
						</motion.div>

						<motion.div className="relative" {...timelineMotion}>
							<span
								className="absolute top-1.5 -left-7 h-3.5 w-3.5 rounded-full bg-primary ring-4 ring-primary/15 md:-left-9"
								aria-hidden="true"
							/>
							{renderDiff()}
						</motion.div>
					</div>
				</div>
			</div>
		</div>
	);
}
