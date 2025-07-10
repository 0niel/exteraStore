"use client";

import {
	AlertTriangle,
	CheckCircle,
	Clock,
	Play,
	RefreshCw,
	Shield,
	XCircle,
	Zap,
} from "lucide-react";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { createValidDate, formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Card } from "./ui/card";

interface PluginPipelineProps {
	pluginSlug: string;
}

const checkTypeIcons = {
	security: Shield,
	performance: Zap,
};

export function PluginPipeline({ pluginSlug }: PluginPipelineProps) {
	const t = useTranslations("PluginPipeline");
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

	const { data: queueStatus } = api.pluginPipeline.getQueueStatus.useQuery(
		undefined,
		{ refetchInterval: isRunning ? 2000 : false },
	);

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

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-start justify-between">
					<div>
						<div className="mb-2 flex items-center gap-2">
							<div className="h-6 w-1 animate-pulse rounded-full bg-gray-200"></div>
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
							className="flex items-center gap-4 border-gray-100 border-b px-4 py-4 last:border-b-0"
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

	const groupedChecks =
		checks?.reduce(
			(acc: Record<string, any[]>, check: any) => {
				if (!acc[check.checkType]) {
					acc[check.checkType] = [];
				}
				acc[check.checkType]?.push(check);
				return acc;
			},
			{} as Record<string, any[]>,
		) || {};

	const latestChecks = Object.entries(groupedChecks).map(
		([type, typeChecks]) => {
			const latest = 		(typeChecks as any[]).sort(
			(a: any, b: any) =>
				createValidDate(b.createdAt).getTime() - createValidDate(a.createdAt).getTime(),
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

	if ((hasRunningChecks || isPluginInQueue) && !isRunning) {
		setIsRunning(true);
	} else if (!hasRunningChecks && !isPluginInQueue && isRunning) {
		setIsRunning(false);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h3 className="flex items-center gap-2 font-semibold text-gray-900 text-lg">
						{t("security_checks")}
					</h3>
					<p className="mt-1 text-gray-600 text-sm leading-relaxed">
						{t("ai_powered_analysis")}
					</p>
				</div>
				{!isRunning && latestChecks.length > 0 && (
					<Button
						variant="outline"
						onClick={handleRunChecks}
						disabled={runChecksMutation.isPending}
						size="sm"
						className="border-gray-200 bg-white transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
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
						className="bg-blue-600 transition-all hover:bg-blue-700 hover:shadow-sm"
					>
						<Play className="mr-2 h-4 w-4" />
						{t("run_workflow")}
					</Button>
				)}
			</div>

			{latestChecks.length > 0 && (
				<Card>
					{latestChecks.map(({ type, check }, index) => {
						const typeName =
							checkTypeNames[type as keyof typeof checkTypeNames] || type;

						let statusColor = "bg-gray-400 shadow-sm";
						let statusText = t("queued");

						if (check?.status === "running") {
							statusColor = "bg-yellow-500 shadow-yellow-200";
							statusText = t("in_progress");
						} else if (check?.status === "passed") {
							statusColor = "bg-green-500 shadow-green-200";
							statusText = t("success");
						} else if (check?.status === "failed") {
							statusColor = "bg-red-500 shadow-red-200";
							statusText = t("failed");
						} else if (check?.status === "error") {
							statusColor = "bg-red-500 shadow-red-200";
							statusText = t("failed");
						}

						const duration = check?.executionTime
							? Math.round(check.executionTime / 1000)
							: null;

						return (
							<div
								key={type}
								className={`group flex items-center gap-4 px-4 py-4 transition-all duration-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-50/50 ${
									index !== latestChecks.length - 1
										? "border-gray-100 border-b"
										: ""
								}`}
							>
								<div className="flex min-w-0 flex-1 items-center gap-4">
									<div
										className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${statusColor} ${
											check?.status === "running" ? "animate-pulse" : ""
										}`}
									></div>

									<div className="min-w-0 flex-1">
										<div className="mb-1 flex items-center gap-3">
											<span className="font-semibold text-gray-900 text-md transition-colors group-hover:text-gray-700">
												{typeName}
											</span>
											<span
												className={`rounded-full px-2 py-0.5 font-medium text-xs ${
													check?.status === "running"
														? "bg-yellow-100 text-yellow-700"
														: check?.status === "passed"
															? "bg-green-100 text-green-700"
															: check?.status === "failed" ||
																	check?.status === "error"
																? "bg-red-100 text-red-700"
																: "bg-gray-100 text-gray-600"
												}`}
											>
												{statusText}
											</span>
										</div>

										{check?.shortDescription && (
											<p className="pr-4 text-gray-600 text-sm leading-relaxed transition-colors group-hover:text-gray-500">
												{check.shortDescription}
											</p>
										)}

										{check?.classification &&
											check.classification !== "safe" && (
												<div className="mt-2">
													<span
														className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-xs ${
															check.classification === "critical"
																? "border border-red-200 bg-red-100 text-red-800"
																: check.classification === "unsafe"
																	? "border border-red-200 bg-red-100 text-red-800"
																	: check.classification ===
																			"potentially_unsafe"
																		? "border border-yellow-200 bg-yellow-100 text-yellow-800"
																		: "border border-green-200 bg-green-100 text-green-800"
														}`}
													>
														<div
															className={`h-1.5 w-1.5 rounded-full ${
																check.classification === "critical"
																	? "bg-red-500"
																	: check.classification === "unsafe"
																		? "bg-red-500"
																		: check.classification ===
																				"potentially_unsafe"
																			? "bg-yellow-500"
																			: "bg-green-500"
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

								<div className="flex flex-shrink-0 items-center gap-4 text-gray-500 text-xs">
									{duration && (
										<span className="rounded-full bg-gray-100 px-2 py-1 font-medium">
											{duration}s
										</span>
									)}
									{check?.completedAt && (
										<span className="hidden rounded-full bg-gray-50 px-2 py-1 sm:inline">
											{formatDate(check.completedAt)}
										</span>
									)}

									{check?.details && check.status !== "error" && (
										<details className="relative">
											<summary className="cursor-pointer list-none text-gray-400 opacity-0 transition-colors duration-200 hover:text-blue-600 group-hover:opacity-100">
												<div className="rounded-md p-1 transition-colors hover:bg-blue-50">
													<svg
														className="h-4 w-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M9 5l7 7-7 7"
														/>
													</svg>
												</div>
											</summary>
											<div className="slide-in-from-top-2 absolute top-8 right-0 z-20 w-80 animate-in overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl duration-200">
												<div className="border-gray-100 border-b bg-gradient-to-r from-green-50 to-emerald-50 p-4">
													<h4 className="flex items-center gap-2 font-semibold text-green-900">
														<div className="h-2 w-2 rounded-full bg-green-500"></div>
														{t("check_details")}
													</h4>
												</div>
												<div className="max-h-60 overflow-y-auto p-4">
													<pre className="whitespace-pre-wrap rounded-md border bg-gray-50 p-3 text-gray-700 text-xs leading-relaxed">
														{JSON.stringify(JSON.parse(check.details), null, 2)}
													</pre>
												</div>
											</div>
										</details>
									)}

									{check?.errorMessage && (
										<details className="relative">
											<summary className="cursor-pointer list-none text-red-400 opacity-0 transition-colors duration-200 hover:text-red-600 group-hover:opacity-100">
												<div className="rounded-md p-1 transition-colors hover:bg-red-50">
													<svg
														className="h-4 w-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
														/>
													</svg>
												</div>
											</summary>
											<div className="slide-in-from-top-2 absolute top-8 right-0 z-20 w-80 animate-in overflow-hidden rounded-lg border border-red-200 bg-white shadow-xl duration-200">
												<div className="border-red-100 border-b bg-gradient-to-r from-red-50 to-pink-50 p-4">
													<h4 className="flex items-center gap-2 font-semibold text-red-900">
														<div className="h-2 w-2 rounded-full bg-red-500"></div>
														{t("error_details")}
													</h4>
												</div>
												<div className="p-4">
													<p className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700 text-xs leading-relaxed">
														{check.errorMessage}
													</p>
												</div>
											</div>
										</details>
									)}
								</div>
							</div>
						);
					})}
				</Card>
			)}

			{latestChecks.length === 0 && !isRunning && (
				<div className="rounded-lg border-2 border-gray-200 border-dashed bg-gray-50/30 p-8 text-center transition-all duration-200 hover:bg-gray-50/50">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm">
						<Shield className="h-7 w-7 text-gray-500" />
					</div>
					<h3 className="mb-2 font-semibold text-gray-900 text-lg">
						{t("no_checks_run")}
					</h3>
					<p className="mx-auto mb-6 max-w-md text-gray-600 leading-relaxed">
						{t("no_checks_description")}
					</p>
					<Button
						onClick={handleRunChecks}
						disabled={runChecksMutation.isPending}
						className="font-medium shadow-sm"
					>
						{runChecksMutation.isPending ? (
							<>
								<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
				<div className="rounded-lg border border-blue-200/60 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-sm">
					<div className="flex items-center gap-4">
						<div className="flex-shrink-0">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 shadow-sm">
								<RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
							</div>
						</div>
						<div className="flex-1">
							<h3 className="mb-1 font-semibold text-blue-900 text-lg">
								{t("running_workflow")}
							</h3>
							<p className="text-blue-700 text-sm leading-relaxed">
								{t("ai_analyzing")}
							</p>
						</div>
					</div>

					<div className="mt-6 space-y-3">
						<div className="flex items-center gap-4 rounded-md bg-white/50 p-3 text-sm">
							<div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500"></div>
							<span className="font-medium text-blue-800">
								{t("security_check")}
							</span>
							<span className="ml-auto text-blue-600 text-xs">
								{t("in_progress")}
							</span>
						</div>
						<div className="flex items-center gap-4 rounded-md bg-white/50 p-3 text-sm">
							<div
								className="h-2 w-2 animate-pulse rounded-full bg-yellow-500"
								style={{ animationDelay: "0.3s" }}
							></div>
							<span className="font-medium text-blue-800">
								{t("performance_analysis")}
							</span>
							<span className="ml-auto text-blue-600 text-xs">
								{t("in_progress")}
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
