"use client";

import { type Change, diffLines } from "diff";
import { motion, useReducedMotion } from "framer-motion";
import {
	ArrowLeft,
	Calendar,
	Copy,
	FileText,
	GitBranch,
	GitCommit,
	Minus,
	Plus,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { DiffExplain } from "~/components/ai/diff-explain";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

export default function PluginDiffPage() {
	const params = useParams();
	const slug = params.slug as string;
	const fromHash = params.fromHash as string;
	const toHash = params.toHash as string;
	const router = useRouter();
	const t = useTranslations("PluginDiffPage");
	const locale = useLocale();
	const reduceMotion = useReducedMotion();

	const { data: plugin } = api.plugins.getBySlug.useQuery({ slug });
	const { data: diffData, isLoading } =
		api.pluginVersions.getCommitDiff.useQuery({
			pluginSlug: slug,
			fromHash,
			toHash,
		});

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text).then(() => {
			toast.success(t("copied"));
		});
	};

	const sectionMotion = reduceMotion
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
				<div className="rounded-2xl border border-dashed bg-primary/5 py-12 text-center text-muted-foreground">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<FileText className="h-7 w-7" />
					</div>
					<h3 className="mb-2 font-medium text-foreground text-lg">
						{t("no_changes_title")}
					</h3>
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

	if (!diffData) {
		return (
			<div className="min-h-[60dvh] bg-background">
				<EmptyState
					icon="🔍"
					title={t("not_found_title")}
					description={t("not_found_description")}
					actionLabel={t("back_to_plugin_button")}
					onAction={() => router.push(`/plugins/${slug}`)}
				/>
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
							<span>diff</span>
						</div>
					</div>

					<motion.div className="relative isolate space-y-2" {...sectionMotion}>
						<div
							className="pointer-events-none absolute -top-16 -left-12 -z-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl"
							aria-hidden="true"
						/>
						<span className="eyebrow">diff</span>
						<div className="flex flex-wrap items-center gap-3">
							<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
								{t("title")}
							</h1>
							<span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-primary text-xs">
								{fromHash} → {toHash}
							</span>
						</div>
						<p className="text-muted-foreground">{t("subtitle")}</p>
					</motion.div>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<motion.div {...sectionMotion}>
							<Card className="h-full border-destructive/30">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-destructive">
										<span className="flex size-8 items-center justify-center rounded-xl bg-destructive/10">
											<Minus className="h-4 w-4" />
										</span>
										{t("source_version")}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-2">
										<GitCommit className="h-4 w-4 shrink-0 text-muted-foreground" />
										<span className="truncate font-mono text-sm">
											{fromHash}
										</span>
										<Button
											variant="ghost"
											size="sm"
											className="min-h-11 md:min-h-8"
											onClick={() => copyToClipboard(fromHash)}
											aria-label={t("copy_code")}
										>
											<Copy className="h-3 w-3" />
										</Button>
									</div>
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<Calendar className="h-4 w-4" />
										<span>
											{formatDate(diffData.fromVersion.createdAt, locale)}
										</span>
									</div>
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<GitBranch className="h-4 w-4" />
										<span>v{diffData.fromVersion.version}</span>
									</div>
									{diffData.fromVersion.changelog && (
										<div className="text-sm">
											<p className="mb-1 font-medium">{t("changes_label")}</p>
											<p className="rounded-xl bg-primary/5 p-3 text-muted-foreground text-xs">
												{diffData.fromVersion.changelog}
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						</motion.div>

						<motion.div {...sectionMotion}>
							<Card className="h-full border-success/30">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-success">
										<span className="flex size-8 items-center justify-center rounded-xl bg-success/10">
											<Plus className="h-4 w-4" />
										</span>
										{t("new_version")}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-2">
										<GitCommit className="h-4 w-4 shrink-0 text-muted-foreground" />
										<span className="truncate font-mono text-sm">{toHash}</span>
										<Button
											variant="ghost"
											size="sm"
											className="min-h-11 md:min-h-8"
											onClick={() => copyToClipboard(toHash)}
											aria-label={t("copy_code")}
										>
											<Copy className="h-3 w-3" />
										</Button>
									</div>
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<Calendar className="h-4 w-4" />
										<span>
											{formatDate(diffData.toVersion.createdAt, locale)}
										</span>
									</div>
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<GitBranch className="h-4 w-4" />
										<span>v{diffData.toVersion.version}</span>
									</div>
									{diffData.toVersion.changelog && (
										<div className="text-sm">
											<p className="mb-1 font-medium">{t("changes_label")}</p>
											<p className="rounded-xl bg-primary/5 p-3 text-muted-foreground text-xs">
												{diffData.toVersion.changelog}
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						</motion.div>
					</div>

					{plugin && (
						<motion.div {...sectionMotion}>
							<DiffExplain
								pluginId={plugin.id}
								fromHash={fromHash}
								toHash={toHash}
							/>
						</motion.div>
					)}

					<motion.div {...sectionMotion}>{renderDiff()}</motion.div>
				</div>
			</div>
		</div>
	);
}
