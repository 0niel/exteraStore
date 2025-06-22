"use client";

import {
	AlertTriangle,
	Bug,
	CheckCircle,
	Clock,
	Code,
	Play,
	RefreshCw,
	Shield,
	XCircle,
	Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import { formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

interface PluginPipelineProps {
	pluginSlug: string;
}

const checkTypeIcons = {
	security: Shield,
	performance: Zap,
	compatibility: Code,
	malware: Bug,
};

const checkTypeNames = {
	security: "Security",
	performance: "Performance",
	compatibility: "Compatibility",
	malware: "Malware Check",
};

const statusColors = {
	pending: "bg-gray-500",
	running: "bg-blue-500",
	passed: "bg-green-500",
	failed: "bg-red-500",
	error: "bg-orange-500",
};

const statusIcons = {
	pending: Clock,
	running: RefreshCw,
	passed: CheckCircle,
	failed: XCircle,
	error: AlertTriangle,
};

export function PluginPipeline({ pluginSlug }: PluginPipelineProps) {
	const t = useTranslations("PluginPipeline");
	const [isRunning, setIsRunning] = useState(false);

	const { data: plugin } = api.plugins.getBySlug.useQuery({ slug: pluginSlug });

	const {
		data: checks,
		isLoading,
		refetch,
	} = api.pluginPipeline.getChecks.useQuery(
		{ pluginSlug },
		{ refetchInterval: isRunning ? 2000 : false },
	);

	const runChecksMutation = api.pluginPipeline.runChecks.useMutation({
		onSuccess: () => {
			toast.success("Проверки запущены успешно!");
			setIsRunning(true);
			refetch();
		},
		onError: (error) => {
			toast.error(`Ошибка при запуске проверок: ${error.message}`);
		},
	});

	const handleRunChecks = () => {
		if (!plugin?.id) {
			toast.error("Плагин не найден");
			return;
		}
		runChecksMutation.mutate({ pluginId: plugin.id });
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-48" />
				<div className="grid gap-4">
					{[1, 2, 3].map((i) => (
						<Card key={i}>
							<CardContent className="pt-6">
								<div className="flex items-center gap-4">
									<Skeleton className="h-8 w-8 rounded-full" />
									<div className="flex-1">
										<Skeleton className="mb-2 h-4 w-32" />
										<Skeleton className="h-2 w-full" />
									</div>
									<Skeleton className="h-6 w-16" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
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
			const latest = (typeChecks as any[]).sort(
				(a: any, b: any) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			)[0];
			return { type, check: latest };
		},
	);

	const overallScore =
		latestChecks.length > 0
			? Math.round(
					latestChecks.reduce(
						(sum, { check }) => sum + (check?.score || 0),
						0,
					) / latestChecks.length,
				)
			: 0;

	const hasRunningChecks = latestChecks.some(
		({ check }) => check?.status === "running",
	);

	if (hasRunningChecks && !isRunning) {
		setIsRunning(true);
	} else if (!hasRunningChecks && isRunning) {
		setIsRunning(false);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="font-semibold text-lg">{t("automated_checks")}</h3>
					<p className="text-muted-foreground text-sm">
						{t("ai_powered_checks")}
					</p>
				</div>
				<Button
					onClick={handleRunChecks}
					disabled={runChecksMutation.isPending || isRunning}
					size="sm"
				>
					{runChecksMutation.isPending || isRunning ? (
						<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Play className="mr-2 h-4 w-4" />
					)}
					{isRunning ? t("running") : t("run_checks")}
				</Button>
			</div>

			{latestChecks.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="h-5 w-5" />
							{t("overall_results")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-4">
							<div className="flex-1">
								<div className="mb-2 flex items-center justify-between">
									<span className="font-medium text-sm">
										{t("overall_score")}
									</span>
									<span className="font-bold text-2xl">{overallScore}/100</span>
								</div>
								<Progress value={overallScore} className="h-2" />
							</div>
							<Badge
								variant={
									overallScore >= 80
										? "default"
										: overallScore >= 60
											? "secondary"
											: "destructive"
								}
								className="text-sm"
							>
								{overallScore >= 80
									? t("excellent")
									: overallScore >= 60
										? t("good")
										: t("needs_attention")}
							</Badge>
						</div>
					</CardContent>
				</Card>
			)}

			<div className="grid gap-4">
				{latestChecks.length === 0 ? (
					<Card>
						<CardContent className="pt-6">
							<div className="py-8 text-center">
								<Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
								<h3 className="mb-2 font-medium text-lg">
									{t("no_checks_performed")}
								</h3>
								<p className="mb-4 text-muted-foreground">
									{t("running_checks_description")}
								</p>
								<Button
									onClick={handleRunChecks}
									disabled={runChecksMutation.isPending}
								>
									<Play className="mr-2 h-4 w-4" />
									{t("run_first_check")}
								</Button>
							</div>
						</CardContent>
					</Card>
				) : (
					latestChecks.map(({ type, check }) => {
						const Icon =
							checkTypeIcons[type as keyof typeof checkTypeIcons] || Shield;
						const StatusIcon =
							statusIcons[check?.status as keyof typeof statusIcons] || Clock;
						const typeName =
							type === "performance"
								? "Performance"
								: type === "security"
									? "Security"
									: type === "compatibility"
										? "Compatibility"
										: t(type as any);

						return (
							<Card key={type}>
								<CardContent className="pt-6">
									<div className="flex items-center gap-4">
										<div className="relative">
											<Icon className="h-8 w-8 text-muted-foreground" />
											<div
												className={`-bottom-1 -right-1 absolute h-4 w-4 rounded-full ${statusColors[check?.status as keyof typeof statusColors] || statusColors.pending} flex items-center justify-center`}
											>
												<StatusIcon className="h-2.5 w-2.5 text-white" />
											</div>
										</div>

										<div className="min-w-0 flex-1">
											<div className="mb-2 flex items-center justify-between">
												<h4 className="font-medium">{typeName}</h4>
												{check?.score !== null &&
													check?.score !== undefined && (
														<span className="font-medium text-sm">
															{check.score}/100
														</span>
													)}
											</div>

											{check?.score !== null && check?.score !== undefined && (
												<Progress value={check.score} className="mb-2 h-1.5" />
											)}

											<div className="flex items-center justify-between text-muted-foreground text-sm">
												<span>
													{check?.status === "running" && t("running")}
													{check?.status === "pending" && t("pending")}
													{check?.status === "passed" && t("check_passed")}
													{check?.status === "failed" && t("issues_found")}
													{check?.status === "error" && t("check_error")}
												</span>
												{check?.completedAt && (
													<span>{formatDate(new Date(check.completedAt))}</span>
												)}
											</div>

											{check?.errorMessage && (
												<div className="mt-2 rounded bg-destructive/10 p-2 text-destructive text-sm">
													{check.errorMessage}
												</div>
											)}

											{check?.shortDescription && (
												<p className="mt-2 text-muted-foreground text-sm">
													{check.shortDescription}
												</p>
											)}

											{check?.classification &&
												check.classification !== "safe" && (
													<Badge
														variant={
															check.classification === "critical"
																? "destructive"
																: check.classification === "unsafe"
																	? "destructive"
																	: check.classification ===
																			"potentially_unsafe"
																		? "secondary"
																		: "default"
														}
														className="mt-2"
													>
														{check.classification === "critical"
															? "Критично"
															: check.classification === "unsafe"
																? "Небезопасно"
																: check.classification === "potentially_unsafe"
																	? "Потенциально небезопасно"
																	: "Безопасно"}
													</Badge>
												)}

											{check?.details && check.status !== "error" && (
												<details className="mt-2">
													<summary className="cursor-pointer text-muted-foreground text-sm hover:text-foreground">
														{t("details")}
													</summary>
													<div className="mt-2 rounded bg-muted p-3 text-sm">
														<pre className="whitespace-pre-wrap text-xs">
															{JSON.stringify(
																JSON.parse(check.details),
																null,
																2,
															)}
														</pre>
													</div>
												</details>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})
				)}
			</div>

			{latestChecks.length > 0 && (
				<div className="text-center">
					<Button
						variant="outline"
						onClick={() => refetch()}
						disabled={isRunning}
					>
						<RefreshCw
							className={`mr-2 h-4 w-4 ${isRunning ? "animate-spin" : ""}`}
						/>
						{t("refresh_status")}
					</Button>
				</div>
			)}
		</div>
	);
}
