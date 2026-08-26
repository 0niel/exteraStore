"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, GitCommit, Zap } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CodeDiffViewer } from "~/components/code-diff-viewer";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useClipboard } from "~/hooks/use-clipboard";
import { formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

export default function PluginChangesPage() {
	const params = useParams();
	const slug = params.slug as string;
	const t = useTranslations("PluginChangesPage");
	const locale = useLocale();
	const reduceMotion = useReducedMotion();
	const copyToClipboard = useClipboard(t("copied"), t("copy_failed"));

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

	const timelineMotion = reduceMotion
		? {}
		: {
				initial: { opacity: 0, y: 16 },
				whileInView: { opacity: 1, y: 0 },
				viewport: { once: true, margin: "-40px" },
				transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
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

					<div className="relative isolate space-y-2">
						<div
							className="pointer-events-none absolute -top-16 -left-12 -z-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl"
							aria-hidden="true"
						/>
						<span className="eyebrow">{t("breadcrumb")}</span>
						<div className="flex flex-wrap items-center gap-3">
							<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
								{t("title")}
							</h1>
							<Badge className="border-transparent bg-primary/10 text-primary">
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
							<Card className="border-primary/25 bg-linear-to-br from-primary/5 to-transparent">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
											<Zap className="h-4 w-4" />
										</span>
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
											<p className="rounded-xl bg-primary/5 p-3 text-muted-foreground text-xs">
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
										<span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
											<GitCommit className="h-4 w-4" />
										</span>
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
							<CodeDiffViewer
								oldContent={diffData?.oldContent}
								newContent={diffData?.newContent}
								fileName={`${plugin?.name ?? slug}.py`}
								copyLabel={t("copy_code")}
								noChangesTitle={t("no_changes_title")}
								noChangesDescription={t("no_changes_description")}
								additionsLabel={(count) => t("additions", { count })}
								deletionsLabel={(count) => t("deletions", { count })}
								onCopy={copyToClipboard}
							/>
						</motion.div>
					</div>
				</div>
			</div>
		</div>
	);
}
