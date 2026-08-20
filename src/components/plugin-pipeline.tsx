"use client";

import {
	AlertTriangle,
	CheckCircle,
	Clock,
	Info,
	Play,
	RefreshCw,
	Shield,
	XCircle,
	Zap,
} from "lucide-react";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { Skeleton } from "~/components/ui/skeleton";
import { createValidDate, formatDate, safeJsonParse } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Card } from "./ui/card";

interface PluginPipelineProps {
	pluginSlug: string;
}

interface PipelineCheck {
	checkType: string;
	status: string;
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

export function PluginPipeline({ pluginSlug }: PluginPipelineProps) {
	const t = useTranslations("PluginPipeline");
	const locale = useLocale();
	const [isRunning, setIsRunning] = useState(false);

	const checkTypeNames = {
		security: t("security_check"),
		performance: t("performance_analysis"),
	};

	const { data: plugin } = api.plugins.getBySlug.useQuery({ slug: pluginSlug });

	const {
		data: checks,
		isLoading,
		refetch,
	} = api.pluginPipeline.getChecks.useQuery(
		{ pluginSlug },
		{ refetchInterval: isRunning ? 2000 : false },
	);

	api.pluginPipeline.getQueueStatus.useQuery(undefined, {
		refetchInterval: isRunning ? 2000 : false,
	});

	const { data: pluginQueueStatus } =
		api.pluginPipeline.getPluginQueueStatus.useQuery(
			{ pluginSlug },
			{ refetchInterval: isRunning ? 2000 : false },
		);

	const runChecksMutation = api.pluginPipeline.runChecks.useMutation({
		onSuccess: () => {
			toast.success(t("run_checks"));
			setIsRunning(true);
			refetch();
		},
		onError: (error) => {
			toast.error(`${t("check_error")}: ${error.message}`);
		},
	});

	const handleRunChecks = () => {
		if (!plugin?.id) {
			toast.error(t("check_error"));
			return;
		}
		runChecksMutation.mutate({ pluginId: plugin.id });
	};

	const groupedChecks: Record<string, PipelineCheck[]> =
		checks?.reduce(
			(acc: Record<string, PipelineCheck[]>, check: PipelineCheck) => {
				if (!acc[check.checkType]) {
					acc[check.checkType] = [];
				}
				acc[check.checkType]?.push(check);
				return acc;
			},
			{} as Record<string, PipelineCheck[]>,
		) || {};

	const latestChecks = Object.entries(groupedChecks).map(
		([type, typeChecks]) => {
			const latest = typeChecks.sort(
				(a, b) =>
					createValidDate(b.createdAt).getTime() -
					createValidDate(a.createdAt).getTime(),
			)[0];
			return { type, check: latest };
		},
	);

	const hasRunningChecks = latestChecks.some(
		({ check }) => check?.status === "running",
	);

	const isPluginInQueue =
		pluginQueueStatus &&
		(pluginQueueStatus.status === "queued" ||
			pluginQueueStatus.status === "processing");

	useEffect(() => {
		if ((hasRunningChecks || isPluginInQueue) && !isRunning) {
			setIsRunning(true);
		} else if (!hasRunningChecks && !isPluginInQueue && isRunning) {
			setIsRunning(false);
		}
	}, [hasRunningChecks, isPluginInQueue, isRunning]);

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-start justify-between">
					<div>
						<div className="mb-2 flex items-center gap-2">
							<div className="h-6 w-1 animate-pulse rounded-full bg-muted"></div>
							<Skeleton className="h-6 w-40" />
						</div>
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-8 w-24" />
				</div>
				<Card>
					{[1, 2].map((i) => (
						<div
							key={i}
							className="flex items-center gap-4 border-border border-b px-4 py-4 last:border-b-0"
						>
							<Skeleton className="h-2.5 w-2.5 rounded-full" />
							<div className="flex-1 space-y-2">
								<div className="flex items-center gap-3">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-4 w-16 rounded-full" />
								</div>
								<Skeleton className="h-3 w-48" />
							</div>
							<div className="flex items-center gap-4">
								<Skeleton className="h-6 w-8 rounded-full" />
								<Skeleton className="h-6 w-20 rounded-full" />
							</div>
						</div>
					))}
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h3 className="flex items-center gap-2 font-semibold text-foreground text-lg">
						<span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<Shield className="h-4 w-4" />
						</span>
						{t("security_checks")}
					</h3>
					<p className="mt-1 text-muted-foreground text-sm leading-relaxed">
						{t("ai_powered_analysis")}
					</p>
				</div>
				{!isRunning && latestChecks.length > 0 && (
					<Button
						variant="outline"
						onClick={handleRunChecks}
						disabled={runChecksMutation.isPending}
						size="sm"
						className="transition-all hover:shadow-sm"
					>
						<RefreshCw className="mr-2 h-4 w-4" />
						{t("rerun_jobs")}
					</Button>
				)}
				{!isRunning && latestChecks.length === 0 && (
					<Button
						onClick={handleRunChecks}
						disabled={runChecksMutation.isPending}
						size="sm"
						className="transition-all hover:shadow-sm"
					>
						<Play className="mr-2 h-4 w-4" />
						{t("run_workflow")}
					</Button>
				)}
			</div>

			{latestChecks.length > 0 && (
				<Card className="overflow-hidden">
					{latestChecks.map(({ type, check }, index) => {
						const IconComponent =
							checkTypeIcons[type as keyof typeof checkTypeIcons] || Shield;
						const typeName =
							checkTypeNames[type as keyof typeof checkTypeNames] || type;

						let statusColor = "bg-muted";
						let statusText = t("queued");
						let statusIcon = Clock;

						if (check?.status === "running") {
							statusColor = "bg-warning";
							statusText = t("in_progress");
							statusIcon = RefreshCw;
						} else if (check?.status === "passed") {
							statusColor = "bg-success";
							statusText = t("success");
							statusIcon = CheckCircle;
						} else if (check?.status === "failed") {
							statusColor = "bg-destructive";
							statusText = t("failed");
							statusIcon = XCircle;
						} else if (check?.status === "error") {
							statusColor = "bg-destructive";
							statusText = t("failed");
							statusIcon = AlertTriangle;
						}

						const StatusIcon = statusIcon;
						const duration = check?.executionTime
							? Math.round(check.executionTime / 1000)
							: null;

						return (
							<div
								key={type}
								className={`group flex items-center gap-4 px-4 py-4 transition-all duration-200 hover:bg-accent/50 ${
									index !== latestChecks.length - 1
										? "border-border border-b"
										: ""
								}`}
							>
								<div className="flex min-w-0 flex-1 items-center gap-4">
									<div className="flex items-center gap-3">
										<IconComponent className="h-5 w-5 text-primary" />
										<div
											className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${statusColor} ${
												check?.status === "running" ? "animate-pulse" : ""
											}`}
										></div>
									</div>

									<div className="min-w-0 flex-1">
										<div className="mb-1 flex items-center gap-3">
											<span className="font-semibold text-foreground text-md transition-colors">
												{typeName}
											</span>
											<div className="flex items-center gap-1">
												<StatusIcon
													className={`h-3 w-3 ${
														check?.status === "running" ? "animate-spin" : ""
													} ${
														check?.status === "passed"
															? "text-success"
															: check?.status === "failed" ||
																	check?.status === "error"
																? "text-destructive"
																: check?.status === "running"
																	? "text-warning"
																	: "text-muted-foreground"
													}`}
												/>
												<span
													className={`rounded-full px-2 py-0.5 font-medium text-xs ${
														check?.status === "running"
															? "bg-warning/15 text-warning"
															: check?.status === "passed"
																? "bg-success/15 text-success"
																: check?.status === "failed" ||
																		check?.status === "error"
																	? "bg-destructive/15 text-destructive"
																	: "bg-muted text-muted-foreground"
													}`}
												>
													{statusText}
												</span>
											</div>
										</div>

										{check?.shortDescription && (
											<p className="pr-4 text-muted-foreground text-sm leading-relaxed">
												{check.shortDescription}
											</p>
										)}

										{check?.classification &&
											check.classification !== "safe" && (
												<div className="mt-2">
													<span
														className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-xs ${
															check.classification === "critical"
																? "border border-destructive/30 bg-destructive/10 text-destructive"
																: check.classification === "unsafe"
																	? "border border-destructive/30 bg-destructive/10 text-destructive"
																	: check.classification ===
																			"potentially_unsafe"
																		? "border border-warning/30 bg-warning/10 text-warning"
																		: "border border-success/30 bg-success/10 text-success"
														}`}
													>
														<div
															className={`h-1.5 w-1.5 rounded-full ${
																check.classification === "critical"
																	? "bg-destructive"
																	: check.classification === "unsafe"
																		? "bg-destructive"
																		: check.classification ===
																				"potentially_unsafe"
																			? "bg-warning"
																			: "bg-success"
															}`}
														></div>
														{check.classification === "critical"
															? t("critical")
															: check.classification === "unsafe"
																? t("unsafe")
																: check.classification === "potentially_unsafe"
																	? t("warning")
																	: t("safe")}
													</span>
												</div>
											)}
									</div>
								</div>

								<div className="flex flex-shrink-0 items-center gap-4 text-muted-foreground text-xs">
									{duration && (
										<span className="rounded-full bg-muted px-2 py-1 font-medium">
											{duration}s
										</span>
									)}
									{check?.completedAt && (
										<span className="hidden rounded-full bg-muted/50 px-2 py-1 sm:inline">
											{formatDate(check.completedAt, locale)}
										</span>
									)}

									{check?.details && check.status !== "error" && (
										<Popover>
											<PopoverTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-11 w-11 p-0 text-muted-foreground transition-all duration-200 hover:text-primary md:h-6 md:w-6 md:opacity-0 md:group-hover:opacity-100"
												>
													<Info className="h-4 w-4" />
												</Button>
											</PopoverTrigger>
											<PopoverContent
												className="w-96 p-0"
												align="end"
												side="bottom"
											>
												<div className="border-border border-b bg-accent/50 p-4">
													<h4 className="flex items-center gap-2 font-semibold text-foreground">
														<div className="h-2 w-2 rounded-full bg-success"></div>
														{t("check_details")}
													</h4>
												</div>
												<div className="max-h-60 overflow-y-auto p-4">
													<pre className="whitespace-pre-wrap rounded-md border border-border bg-muted p-3 text-muted-foreground text-xs leading-relaxed">
														{JSON.stringify(
															safeJsonParse<unknown>(
																check.details,
																check.details,
															),
															null,
															2,
														)}
													</pre>
												</div>
											</PopoverContent>
										</Popover>
									)}

									{check?.errorMessage && (
										<Popover>
											<PopoverTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-11 w-11 p-0 text-destructive transition-all duration-200 hover:text-destructive/80 md:h-6 md:w-6 md:opacity-0 md:group-hover:opacity-100"
												>
													<AlertTriangle className="h-4 w-4" />
												</Button>
											</PopoverTrigger>
											<PopoverContent
												className="w-80 p-0"
												align="end"
												side="bottom"
											>
												<div className="border-destructive/30 border-b bg-destructive/10 p-4">
													<h4 className="flex items-center gap-2 font-semibold text-destructive">
														<div className="h-2 w-2 rounded-full bg-destructive"></div>
														{t("error_details")}
													</h4>
												</div>
												<div className="p-4">
													<p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs leading-relaxed">
														{check.errorMessage}
													</p>
												</div>
											</PopoverContent>
										</Popover>
									)}
								</div>
							</div>
						);
					})}
				</Card>
			)}

			{latestChecks.length === 0 && !isRunning && (
				<div className="rounded-2xl border border-dashed bg-primary/5 p-8 text-center transition-all duration-200 hover:bg-primary/10">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<Shield className="h-7 w-7" />
					</div>
					<h3 className="mb-2 font-semibold text-foreground text-lg">
						{t("no_checks_run")}
					</h3>
					<p className="mx-auto mb-6 max-w-md text-muted-foreground leading-relaxed">
						{t("no_checks_description")}
					</p>
					<Button
						onClick={handleRunChecks}
						disabled={runChecksMutation.isPending}
						className="font-medium shadow-sm"
					>
						{runChecksMutation.isPending ? (
							<>
								<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
								{t("starting")}
							</>
						) : (
							<>
								<Play className="mr-2 h-4 w-4" />
								{t("run_workflow")}
							</>
						)}
					</Button>
				</div>
			)}

			{(isRunning || runChecksMutation.isPending) && (
				<div className="rounded-2xl border border-primary/20 bg-linear-to-r from-primary/5 to-primary/10 p-6 shadow-soft">
					<div className="flex items-center gap-4">
						<div className="flex-shrink-0">
							<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<RefreshCw className="h-5 w-5 animate-spin" />
							</div>
						</div>
						<div className="flex-1">
							<h3 className="mb-1 font-semibold text-foreground text-lg">
								{t("running_workflow")}
							</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{t("ai_analyzing")}
							</p>
						</div>
					</div>

					<div className="mt-6 space-y-3">
						<div className="flex items-center gap-4 rounded-xl bg-background/50 p-3 text-sm">
							<div className="h-2 w-2 animate-pulse rounded-full bg-warning"></div>
							<Shield className="h-4 w-4 text-primary" />
							<span className="font-medium text-foreground">
								{t("security_check")}
							</span>
							<span className="ml-auto text-muted-foreground text-xs">
								{t("in_progress")}
							</span>
						</div>
						<div className="flex items-center gap-4 rounded-xl bg-background/50 p-3 text-sm">
							<div
								className="h-2 w-2 animate-pulse rounded-full bg-warning"
								style={{ animationDelay: "0.3s" }}
							></div>
							<Zap className="h-4 w-4 text-primary" />
							<span className="font-medium text-foreground">
								{t("performance_analysis")}
							</span>
							<span className="ml-auto text-muted-foreground text-xs">
								{t("in_progress")}
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
