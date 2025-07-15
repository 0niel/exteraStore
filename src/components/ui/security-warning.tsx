"use client";

import { AlertTriangle, ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface SecurityIssue {
	type: string;
	severity: "low" | "medium" | "high" | "critical";
	description: string;
	recommendation: string;
}

interface SecurityCheckResult {
	status: "safe" | "warning" | "danger";
	classification: "safe" | "potentially_unsafe" | "unsafe" | "critical";
	shortDescription: string;
	issues: SecurityIssue[];
}

interface SecurityWarningProps {
	securityResult: SecurityCheckResult;
	variant?: "default" | "compact" | "banner";
	className?: string;
	showDetails?: boolean;
}

export function SecurityWarning({
	securityResult,
	variant = "default",
	className,
	showDetails = false,
}: SecurityWarningProps) {
	const t = useTranslations("PluginCard");
	const [isOpen, setIsOpen] = useState(showDetails);
	const [isDismissed, setIsDismissed] = useState(false);

	if (securityResult.status === "safe" || isDismissed) {
		return null;
	}

	const getColorClasses = () => {
		switch (securityResult.classification) {
			case "critical":
				return {
					border: "border-red-200 dark:border-red-800",
					bg: "bg-red-50 dark:bg-red-950/10",
					icon: "text-red-600 dark:text-red-400",
					badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
				};
			case "unsafe":
				return {
					border: "border-red-200 dark:border-red-700",
					bg: "bg-red-50 dark:bg-red-950/10",
					icon: "text-red-500 dark:text-red-400",
					badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
				};
			case "potentially_unsafe":
				return {
					border: "border-yellow-200 dark:border-yellow-700",
					bg: "bg-yellow-50 dark:bg-yellow-950/10",
					icon: "text-yellow-600 dark:text-yellow-400",
					badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
				};
			default:
				return {
					border: "border-gray-200 dark:border-gray-700",
					bg: "bg-gray-50 dark:bg-gray-950/10",
					icon: "text-gray-600 dark:text-gray-400",
					badge: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
				};
		}
	};

	const getTitle = () => {
		switch (securityResult.classification) {
			case "critical":
				return t("security_critical");
			case "unsafe":
				return t("security_unsafe");
			case "potentially_unsafe":
				return t("security_warning_level");
			default:
				return t("security_issues_found");
		}
	};

	const colors = getColorClasses();

	if (variant === "compact") {
		return (
			<div className={cn(
				"flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm",
				colors.border,
				colors.bg,
				className
			)}>
				<AlertTriangle className={cn("h-3.5 w-3.5 flex-shrink-0", colors.icon)} />
				<span className="truncate font-medium">{t("security_issues_short")}</span>
			</div>
		);
	}

	if (variant === "banner") {
		return (
			<div className={cn(
				"rounded-lg border p-3",
				colors.border,
				colors.bg,
				className
			)}>
				<div className="flex items-start gap-3">
					<AlertTriangle className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colors.icon)} />
					<div className="min-w-0 flex-1">
						<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
							<h4 className="font-medium text-sm">{t("security_warning")}</h4>
							<Badge variant="secondary" className={cn("text-xs w-fit", colors.badge)}>
								{getTitle()}
							</Badge>
						</div>
						<p className="mt-1 text-sm text-muted-foreground">
							{securityResult.shortDescription}
						</p>
						{securityResult.issues.length > 0 && (
							<div className="mt-2 text-xs text-muted-foreground">
								{t("download_at_risk")}
							</div>
						)}
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6 flex-shrink-0"
						onClick={() => setIsDismissed(true)}
					>
						<X className="h-3 w-3" />
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className={cn(
			"rounded-lg border p-4",
			colors.border,
			colors.bg,
			className
		)}>
			<div className="flex items-start gap-3">
				<AlertTriangle className={cn("h-5 w-5 mt-0.5 flex-shrink-0", colors.icon)} />
				<div className="min-w-0 flex-1">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
						<h4 className="font-semibold">{t("security_warning")}</h4>
						<Badge variant="secondary" className={cn("w-fit", colors.badge)}>
							{getTitle()}
						</Badge>
					</div>
					<p className="mt-2 text-muted-foreground">
						{securityResult.shortDescription}
					</p>
					
					{securityResult.issues.length > 0 && (
						<div className="mt-3">
							<button
								onClick={() => setIsOpen(!isOpen)}
								className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
							>
								{t("security_details")} ({securityResult.issues.length})
								<ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
							</button>
							{isOpen && (
								<div className="mt-3 space-y-3">
									{securityResult.issues.map((issue, index) => (
										<div key={index} className="rounded-md border border-border/50 bg-background/50 p-3">
											<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
												<Badge
													variant="outline"
													className={cn(
														"text-xs w-fit",
														issue.severity === "critical" && "border-red-500 text-red-700 dark:text-red-300",
														issue.severity === "high" && "border-red-400 text-red-600 dark:text-red-400",
														issue.severity === "medium" && "border-yellow-500 text-yellow-700 dark:text-yellow-300",
														issue.severity === "low" && "border-blue-500 text-blue-700 dark:text-blue-300"
													)}
												>
													{issue.severity}
												</Badge>
												<span className="text-sm font-medium text-muted-foreground">
													{issue.type}
												</span>
											</div>
											<p className="mt-2 text-sm">{issue.description}</p>
											<p className="mt-2 text-xs text-muted-foreground">
												<strong>Рекомендация:</strong> {issue.recommendation}
											</p>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6 flex-shrink-0"
					onClick={() => setIsDismissed(true)}
				>
					<X className="h-3 w-3" />
				</Button>
			</div>
		</div>
	);
} 