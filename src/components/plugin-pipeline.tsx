"use client";

import {
	AlertTriangle,
	Bot,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock3,
	GitBranch,
	History,
	ListChecks,
	Play,
	RefreshCw,
	Shield,
	Sparkles,
	Timer,
	X,
	Zap,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
	getOverallPipelineState,
	getPipelineCheckState,
	type PipelineIssue,
	parsePipelineDetails,
} from "~/lib/plugin-pipeline-view";
import { cn, createValidDate, formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

interface PluginPipelineProps {
	pluginId: number;
	canRunChecks?: boolean;
}

interface PipelineCheck {
	id: number;
	checkType: string;
	status: string;
	score: number | null;
	createdAt: Date | number | string;
	shortDescription?: string | null;
	classification?: string | null;
	executionTime?: number | null;
	completedAt?: Date | number | string | null;
	details?: string | null;
	errorMessage?: string | null;
}

const checkTypeIcons = {
	security: Shield,
	performance: Zap,
};

const stateIcons = {
	queued: Clock3,
	running: RefreshCw,
	success: CheckCircle2,
	warning: AlertTriangle,
	failed: X,
};

const stateStyles = {
	queued: {
		icon: "bg-contrast-foreground/10 text-contrast-foreground/70",
		text: "text-contrast-foreground/70",
		jobIcon: "bg-muted text-muted-foreground",
		pill: "bg-muted text-muted-foreground",
	},
	running: {
		icon: "bg-primary text-primary-foreground",
		text: "text-primary",
		jobIcon: "bg-primary/12 text-primary",
		pill: "bg-primary/10 text-primary",
	},
	success: {
		icon: "bg-success text-white",
		text: "text-success",
		jobIcon: "bg-success/12 text-success",
		pill: "bg-success/10 text-success",
	},
	warning: {
		icon: "bg-warning text-black",
		text: "text-warning",
		jobIcon: "bg-warning/15 text-warning",
		pill: "bg-warning/12 text-warning",
	},
	failed: {
		icon: "bg-destructive text-destructive-foreground",
		text: "text-destructive",
		jobIcon: "bg-destructive/12 text-destructive",
		pill: "bg-destructive/10 text-destructive",
	},
};

const severityStyles: Record<PipelineIssue["severity"], string> = {
	low: "bg-muted text-muted-foreground",
	medium: "bg-warning/12 text-warning",
	high: "bg-destructive/10 text-destructive",
	critical: "bg-destructive text-destructive-foreground",
};

function formatDuration(milliseconds?: number | null) {
	if (!milliseconds || milliseconds <= 0) return null;
	if (milliseconds < 1000) return `${milliseconds} ms`;
	const seconds = Math.round(milliseconds / 1000);
	if (seconds < 60) return `${seconds} s`;
	return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function PluginPipeline({
	pluginId,
	canRunChecks = false,
}: PluginPipelineProps) {
	const t = useTranslations("PluginPipeline");
	const locale = useLocale();
	const [isRunning, setIsRunning] = useState(false);
	const [expandedType, setExpandedType] = useState<string | null>(null);
	const [historyOpen, setHistoryOpen] = useState(false);
	const wasRunningRef = useRef(false);
	const didSelectIssueRef = useRef(false);

	const checkTypeNames: Record<string, string> = {
		security: t("security_check"),
		performance: t("performance_analysis"),
	};

	const {
		data: checks,
		isLoading,
		refetch,
	} = api.pluginPipeline.getChecks.useQuery(
		{ pluginId },
		{
			refetchInterval: isRunning ? 2500 : false,
			staleTime: isRunning ? 0 : 30_000,
		},
	);

	const { data: pluginQueueStatus } =
		api.pluginPipeline.getPluginQueueStatus.useQuery(
			{ pluginId },
			{
				refetchInterval: isRunning ? 2500 : false,
				staleTime: isRunning ? 0 : 15_000,
			},
		);

	const runChecksMutation = api.pluginPipeline.runChecks.useMutation({
		onSuccess: () => {
			toast.success(t("toast_checks_started"), {
				description: t("toast_checks_started_description"),
			});
			setIsRunning(true);
			void refetch();
		},
		onError: (error) => {
			toast.error(`${t("check_error")}: ${error.message}`);
		},
	});

	const latestChecks = useMemo(() => {
		const grouped = new Map<string, PipelineCheck[]>();
		for (const check of (checks ?? []) as PipelineCheck[]) {
			const group = grouped.get(check.checkType) ?? [];
			group.push(check);
			grouped.set(check.checkType, group);
		}

		return [...grouped.entries()].map(([type, typeChecks]) => ({
			type,
			check: [...typeChecks].sort(
				(a, b) =>
					createValidDate(b.createdAt).getTime() -
					createValidDate(a.createdAt).getTime(),
			)[0],
		}));
	}, [checks]);

	const latestIds = useMemo(
		() =>
			new Set(latestChecks.flatMap(({ check }) => (check ? [check.id] : []))),
		[latestChecks],
	);
	const historyChecks = useMemo(
		() =>
			((checks ?? []) as PipelineCheck[])
				.filter((check) => !latestIds.has(check.id))
				.sort(
					(a, b) =>
						createValidDate(b.createdAt).getTime() -
						createValidDate(a.createdAt).getTime(),
				),
		[checks, latestIds],
	);

	const hasRunningChecks = latestChecks.some(
		({ check }) => check?.status === "running",
	);
	const isPluginInQueue = Boolean(
		pluginQueueStatus &&
			(pluginQueueStatus.status === "queued" ||
				pluginQueueStatus.status === "processing"),
	);
	const workflowRunning = Boolean(
		isRunning || isPluginInQueue || runChecksMutation.isPending,
	);
	const overallState = getOverallPipelineState(
		latestChecks.flatMap(({ check }) => (check ? [check] : [])),
		workflowRunning,
	);
	const StatusIcon = stateIcons[overallState];
	const statusStyle = stateStyles[overallState];
	const scoredChecks = latestChecks.flatMap(({ check }) =>
		check?.score !== null && check?.score !== undefined ? [check.score] : [],
	);
	const averageScore = scoredChecks.length
		? Math.round(
				scoredChecks.reduce((sum, score) => sum + score, 0) /
					scoredChecks.length,
			)
		: null;
	const totalDuration = latestChecks.reduce(
		(sum, { check }) => sum + (check?.executionTime ?? 0),
		0,
	);
	const latestDate = latestChecks
		.flatMap(({ check }) =>
			check ? [createValidDate(check.completedAt ?? check.createdAt)] : [],
		)
		.sort((a, b) => b.getTime() - a.getTime())[0];
	const expectedTypes = workflowRunning
		? ["security", "performance"]
		: latestChecks.map(({ type }) => type);
	const jobs = expectedTypes.map((type) => ({
		type,
		check: latestChecks.find((item) => item.type === type)?.check,
	}));

	useEffect(() => {
		const runningNow = Boolean(hasRunningChecks || isPluginInQueue);
		if (runningNow) {
			wasRunningRef.current = true;
			if (!isRunning) setIsRunning(true);
			return;
		}
		if (wasRunningRef.current) {
			toast.success(t("toast_checks_completed"), {
				description: t("toast_checks_completed_description"),
			});
			wasRunningRef.current = false;
			if (isRunning) setIsRunning(false);
		}
	}, [hasRunningChecks, isPluginInQueue, isRunning, t]);

	useEffect(() => {
		if (didSelectIssueRef.current) return;
		const problem = latestChecks.find(({ check }) => {
			const state = getPipelineCheckState(check);
			return state === "warning" || state === "failed";
		});
		if (problem) {
			setExpandedType(problem.type);
			didSelectIssueRef.current = true;
		}
	}, [latestChecks]);

	const handleRunChecks = () => {
		runChecksMutation.mutate({ pluginId });
	};

	if (isLoading) {
		return (
			<div
				className="space-y-5"
				role="status"
				aria-label={t("loading_workflow")}
			>
				<div className="flex items-center justify-between gap-4">
					<div className="space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-8 w-56" />
					</div>
					<Skeleton className="h-10 w-28 rounded-full" />
				</div>
				<div className="rounded-[1.75rem] bg-contrast p-5 sm:p-6">
					<div className="flex items-center gap-4">
						<Skeleton className="size-12 rounded-2xl bg-contrast-foreground/15" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-5 w-40 bg-contrast-foreground/15" />
							<Skeleton className="h-4 w-64 bg-contrast-foreground/10" />
						</div>
					</div>
				</div>
				<div className="space-y-2 rounded-[1.75rem] bg-surface p-2">
					{[1, 2].map((item) => (
						<div key={item} className="flex items-center gap-4 rounded-2xl p-4">
							<Skeleton className="size-10 rounded-xl" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-3 w-64 max-w-full" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	const statusTitle = t(`workflow_${overallState}_title`);
	const statusDescription = t(`workflow_${overallState}_description`);

	return (
		<div className="space-y-5">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<div className="eyebrow mb-2">
						<GitBranch className="size-3.5" />
						{t("workflow_label")}
					</div>
					<h2 className="font-bold text-2xl tracking-tight sm:text-3xl">
						{t("security_checks")}
					</h2>
					<p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-relaxed sm:text-base">
						{t("ai_powered_analysis")}
					</p>
				</div>
				{canRunChecks && (
					<Button
						onClick={handleRunChecks}
						disabled={workflowRunning}
						className="min-h-11 rounded-full px-5 sm:min-h-10"
						variant={latestChecks.length > 0 ? "secondary" : "default"}
					>
						{workflowRunning ? (
							<RefreshCw className="animate-spin" />
						) : latestChecks.length > 0 ? (
							<RefreshCw />
						) : (
							<Play />
						)}
						{workflowRunning
							? t("running")
							: latestChecks.length > 0
								? t("rerun_jobs")
								: t("run_workflow")}
					</Button>
				)}
			</header>

			{latestChecks.length > 0 || workflowRunning ? (
				<>
					<section className="relative overflow-hidden rounded-[1.75rem] bg-contrast p-5 text-contrast-foreground sm:p-7">
						<div className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-primary/25 blur-3xl" />
						<div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex min-w-0 items-start gap-4">
								<div
									className={cn(
										"flex size-12 shrink-0 items-center justify-center rounded-2xl sm:size-14",
										statusStyle.icon,
									)}
								>
									<StatusIcon
										className={cn(
											"size-6 sm:size-7",
											overallState === "running" && "animate-spin",
										)}
									/>
								</div>
								<div className="min-w-0">
									<div className="mb-1 flex flex-wrap items-center gap-2">
										<span className="font-mono text-contrast-foreground/50 text-xs uppercase tracking-[0.16em]">
											{t("overall_results")}
										</span>
										<span
											className={cn(
												"rounded-full bg-contrast-foreground/8 px-2.5 py-1 font-semibold text-xs",
												statusStyle.text,
											)}
										>
											{t(`state_${overallState}`)}
										</span>
									</div>
									<h3 className="text-balance font-bold text-xl leading-tight sm:text-2xl">
										{statusTitle}
									</h3>
									<p className="mt-1 max-w-xl text-contrast-foreground/60 text-sm leading-relaxed">
										{statusDescription}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-3 gap-4 sm:min-w-72 sm:gap-6">
								<div>
									<p className="font-mono text-2xl sm:text-3xl">
										{averageScore ?? "—"}
									</p>
									<p className="mt-1 text-contrast-foreground/45 text-xs">
										{t("score_short")}
									</p>
								</div>
								<div>
									<p className="font-mono text-2xl sm:text-3xl">
										{jobs.length}
									</p>
									<p className="mt-1 text-contrast-foreground/45 text-xs">
										{t("jobs_short")}
									</p>
								</div>
								<div>
									<p className="font-mono text-2xl sm:text-3xl">
										{formatDuration(totalDuration) ?? "—"}
									</p>
									<p className="mt-1 text-contrast-foreground/45 text-xs">
										{t("duration_short")}
									</p>
								</div>
							</div>
						</div>

						<div className="relative mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 pt-5 text-contrast-foreground/50 text-xs before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-contrast-foreground/10">
							<span className="inline-flex items-center gap-1.5">
								<Bot className="size-3.5" />
								{t("automated_checks")}
							</span>
							{latestDate && (
								<span className="inline-flex items-center gap-1.5">
									<Clock3 className="size-3.5" />
									{formatDate(latestDate, locale)}
								</span>
							)}
							<span className="inline-flex items-center gap-1.5">
								<Sparkles className="size-3.5" />
								{t("ai_engine")}
							</span>
						</div>
					</section>

					<section aria-labelledby="pipeline-jobs-heading">
						<div className="mb-3 flex items-center justify-between gap-3 px-1">
							<h3
								id="pipeline-jobs-heading"
								className="flex items-center gap-2 font-semibold text-base"
							>
								<ListChecks className="size-4 text-primary" />
								{t("jobs_title")}
							</h3>
							<span className="font-mono text-muted-foreground text-xs">
								{t("jobs_count", { count: jobs.length })}
							</span>
						</div>

						<div className="space-y-2 rounded-[1.75rem] bg-surface p-2">
							{jobs.map(({ type, check }, index) => {
								const state = check
									? getPipelineCheckState(check)
									: workflowRunning
										? index === 0 && pluginQueueStatus?.status === "processing"
											? "running"
											: "queued"
										: "queued";
								const JobIcon =
									checkTypeIcons[type as keyof typeof checkTypeIcons] ?? Shield;
								const JobStatusIcon = stateIcons[state];
								const details = parsePipelineDetails(check?.details);
								const duration = formatDuration(check?.executionTime);
								const isExpanded = expandedType === type;
								const canExpand = Boolean(
									check &&
										(details.issues.length > 0 ||
											check.errorMessage ||
											check.shortDescription ||
											details.shortDescription),
								);

								return (
									<article
										key={type}
										className="overflow-hidden rounded-2xl bg-background/80"
									>
										<button
											type="button"
											onClick={() =>
												canExpand && setExpandedType(isExpanded ? null : type)
											}
											disabled={!canExpand}
											aria-expanded={canExpand ? isExpanded : undefined}
											aria-controls={
												canExpand ? `job-details-${type}` : undefined
											}
											className={cn(
												"flex min-h-20 w-full items-center gap-3 p-3 text-left sm:gap-4 sm:p-4",
												canExpand &&
													"cursor-pointer hover:bg-foreground/[0.025]",
											)}
										>
											<div
												className={cn(
													"relative flex size-11 shrink-0 items-center justify-center rounded-xl",
													stateStyles[state].jobIcon,
												)}
											>
												<JobIcon className="size-5" />
												<span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-background">
													<JobStatusIcon
														className={cn(
															"size-3.5",
															stateStyles[state].text,
															state === "running" && "animate-spin",
														)}
													/>
												</span>
											</div>

											<div className="min-w-0 flex-1">
												<div className="flex flex-wrap items-center gap-2">
													<h4 className="font-semibold text-sm sm:text-base">
														{checkTypeNames[type] ?? type}
													</h4>
													<span
														className={cn(
															"rounded-full px-2.5 py-1 font-semibold text-[11px] leading-none",
															stateStyles[state].pill,
														)}
													>
														{t(`state_${state}`)}
													</span>
												</div>
												<p className="mt-1 line-clamp-2 text-muted-foreground text-xs leading-relaxed sm:text-sm">
													{check?.shortDescription ||
														details.shortDescription ||
														t(`job_${state}_description`)}
												</p>
											</div>

											<div className="flex shrink-0 items-center gap-2 sm:gap-4">
												{duration && (
													<span className="hidden items-center gap-1 text-muted-foreground text-xs sm:flex">
														<Timer className="size-3.5" />
														{duration}
													</span>
												)}
												{check?.score !== null &&
													check?.score !== undefined && (
														<span className="min-w-10 text-right font-bold font-mono text-lg">
															{Math.round(check.score)}
														</span>
													)}
												{canExpand && (
													<ChevronDown
														className={cn(
															"size-4 text-muted-foreground transition-transform",
															isExpanded && "rotate-180",
														)}
													/>
												)}
											</div>
										</button>

										{canExpand && isExpanded && (
											<div
												id={`job-details-${type}`}
												className="px-3 pb-3 sm:px-4 sm:pb-4"
											>
												<div className="rounded-2xl bg-surface p-4 sm:p-5">
													<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
														<div>
															<p className="font-semibold text-sm">
																{t("check_details")}
															</p>
															<p className="mt-1 text-muted-foreground text-sm leading-relaxed">
																{check?.errorMessage ||
																	check?.shortDescription ||
																	details.shortDescription ||
																	t(`job_${state}_description`)}
															</p>
														</div>
														<div className="flex flex-wrap gap-2 text-xs">
															{duration && (
																<span className="rounded-full bg-background px-3 py-1.5">
																	{duration}
																</span>
															)}
															{check?.completedAt && (
																<span className="rounded-full bg-background px-3 py-1.5">
																	{formatDate(check.completedAt, locale)}
																</span>
															)}
														</div>
													</div>

													{details.issues.length > 0 ? (
														<div className="mt-5 space-y-3">
															{details.issues.map((issue, issueIndex) => (
																<div
																	key={`${issue.type}-${issueIndex}`}
																	className="rounded-2xl bg-background p-4"
																>
																	<div className="flex flex-wrap items-center gap-2">
																		<span
																			className={cn(
																				"rounded-full px-2.5 py-1 font-semibold text-[11px] uppercase tracking-wide",
																				severityStyles[issue.severity],
																			)}
																		>
																			{t(`severity_${issue.severity}`)}
																		</span>
																		{issue.type && (
																			<span className="font-medium text-sm">
																				{issue.type}
																			</span>
																		)}
																	</div>
																	<p className="mt-3 text-sm leading-relaxed">
																		{issue.description}
																	</p>
																	{issue.recommendation && (
																		<div className="mt-3 rounded-xl bg-primary/[0.06] p-3 text-sm leading-relaxed">
																			<p className="mb-1 font-semibold text-primary text-xs uppercase tracking-wide">
																				{t("recommendation")}
																			</p>
																			{issue.recommendation}
																		</div>
																	)}
																</div>
															))}
														</div>
													) : state === "success" ? (
														<div className="mt-5 flex items-start gap-3 rounded-2xl bg-success/8 p-4 text-success">
															<Check className="mt-0.5 size-5 shrink-0" />
															<div>
																<p className="font-semibold text-sm">
																	{t("no_issues_title")}
																</p>
																<p className="mt-1 text-current/75 text-sm">
																	{t("no_issues_description")}
																</p>
															</div>
														</div>
													) : null}
												</div>
											</div>
										)}
									</article>
								);
							})}
						</div>
					</section>

					{workflowRunning && (
						<div className="flex items-start gap-3 rounded-2xl bg-primary/[0.07] p-4 text-sm">
							<RefreshCw className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
							<div>
								<p className="font-semibold">{t("running_workflow")}</p>
								<p className="mt-1 text-muted-foreground leading-relaxed">
									{t("ai_analyzing")}
								</p>
							</div>
						</div>
					)}

					{historyChecks.length > 0 && (
						<section className="rounded-[1.75rem] bg-surface p-2">
							<button
								type="button"
								onClick={() => setHistoryOpen((value) => !value)}
								aria-expanded={historyOpen}
								className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left hover:bg-background/70"
							>
								<span className="flex size-9 items-center justify-center rounded-xl bg-background text-muted-foreground">
									<History className="size-4" />
								</span>
								<span className="flex-1 font-semibold text-sm">
									{t("history_title")}
								</span>
								<span className="font-mono text-muted-foreground text-xs">
									{historyChecks.length}
								</span>
								<ChevronDown
									className={cn(
										"size-4 text-muted-foreground transition-transform",
										historyOpen && "rotate-180",
									)}
								/>
							</button>
							{historyOpen && (
								<div className="space-y-1 px-2 pb-2">
									{historyChecks.map((check) => {
										const state = getPipelineCheckState(check);
										const HistoryStatusIcon = stateIcons[state];
										return (
											<div
												key={check.id}
												className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-background/70 px-3 py-3 text-sm sm:grid-cols-[auto_1fr_auto_auto]"
											>
												<HistoryStatusIcon
													className={cn("size-4", stateStyles[state].text)}
												/>
												<div className="min-w-0">
													<p className="truncate font-medium">
														{checkTypeNames[check.checkType] ?? check.checkType}
													</p>
													<p className="text-muted-foreground text-xs sm:hidden">
														{formatDate(
															check.completedAt ?? check.createdAt,
															locale,
														)}
													</p>
												</div>
												<span className="hidden text-muted-foreground text-xs sm:block">
													{formatDate(
														check.completedAt ?? check.createdAt,
														locale,
													)}
												</span>
												<span className="min-w-8 text-right font-bold font-mono">
													{check.score === null ? "—" : Math.round(check.score)}
												</span>
											</div>
										);
									})}
								</div>
							)}
						</section>
					)}
				</>
			) : (
				<section className="rounded-[1.75rem] bg-surface p-6 text-center sm:p-10">
					<div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<Shield className="size-7" />
					</div>
					<h3 className="mt-5 font-bold text-xl">{t("no_checks_run")}</h3>
					<p className="mx-auto mt-2 max-w-lg text-muted-foreground text-sm leading-relaxed sm:text-base">
						{canRunChecks
							? t("no_checks_description")
							: t("no_checks_public_description")}
					</p>
					{canRunChecks && (
						<Button
							onClick={handleRunChecks}
							disabled={runChecksMutation.isPending}
							className="mt-6 min-h-11 rounded-full px-6"
						>
							<Play />
							{t("run_workflow")}
						</Button>
					)}
				</section>
			)}
		</div>
	);
}
