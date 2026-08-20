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

const severityBadgeClasses: Record<SecurityIssue["severity"], string> = {
	critical: "border-destructive/60 text-destructive",
	high: "border-destructive/40 text-destructive",
	medium: "border-warning/60 text-warning",
	low: "border-border text-muted-foreground",
};

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
					border: "border-destructive/30",
					bg: "bg-destructive/10",
					icon: "text-destructive",
					badge: "bg-destructive/15 text-destructive",
				};
			case "unsafe":
				return {
					border: "border-destructive/30",
					bg: "bg-destructive/10",
					icon: "text-destructive",
					badge: "bg-destructive/15 text-destructive",
				};
			case "potentially_unsafe":
				return {
					border: "border-warning/30",
					bg: "bg-warning/10",
					icon: "text-warning",
					badge: "bg-warning/15 text-warning",
				};
			default:
				return {
					border: "border-border",
					bg: "bg-muted/50",
					icon: "text-muted-foreground",
					badge: "bg-muted text-muted-foreground",
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
			<div
				className={cn(
					"flex items-center gap-2 rounded-xl border px-2 py-1.5 text-sm",
					colors.border,
					colors.bg,
					className,
				)}
			>
				<AlertTriangle className={cn("h-3.5 w-3.5 shrink-0", colors.icon)} />
				<span className="truncate font-medium">
					{t("security_issues_short")}
				</span>
			</div>
		);
	}

	if (variant === "banner") {
		return (
			<div
				className={cn(
					"rounded-xl border p-3",
					colors.border,
					colors.bg,
					className,
				)}
			>
				<div className="flex items-start gap-3">
					<AlertTriangle
						className={cn("mt-0.5 h-4 w-4 shrink-0", colors.icon)}
					/>
					<div className="min-w-0 flex-1">
						<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
							<h4 className="font-medium text-sm">{t("security_warning")}</h4>
							<Badge
								variant="secondary"
								className={cn("w-fit border-transparent text-xs", colors.badge)}
							>
								{getTitle()}
							</Badge>
						</div>
						<p className="mt-1 text-muted-foreground text-sm">
							{securityResult.shortDescription}
						</p>
						{securityResult.issues.length > 0 && (
							<div className="mt-2 text-muted-foreground text-xs">
								{t("download_at_risk")}
							</div>
						)}
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-11 w-11 shrink-0 md:h-6 md:w-6"
						onClick={() => setIsDismissed(true)}
					>
						<X className="h-3 w-3" />
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"rounded-xl border p-4",
				colors.border,
				colors.bg,
				className,
			)}
		>
			<div className="flex items-start gap-3">
				<AlertTriangle className={cn("mt-0.5 h-5 w-5 shrink-0", colors.icon)} />
				<div className="min-w-0 flex-1">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
						<h4 className="font-semibold">{t("security_warning")}</h4>
						<Badge
							variant="secondary"
							className={cn("w-fit border-transparent", colors.badge)}
						>
							{getTitle()}
						</Badge>
					</div>
					<p className="mt-2 text-muted-foreground">
						{securityResult.shortDescription}
					</p>

					{securityResult.issues.length > 0 && (
						<div className="mt-3">
							<button
								type="button"
								onClick={() => setIsOpen(!isOpen)}
								className="tap-highlight-none flex min-h-11 items-center gap-1 font-medium text-primary text-sm hover:underline md:min-h-0"
								aria-expanded={isOpen}
							>
								{t("security_details")} ({securityResult.issues.length})
								<ChevronDown
									className={cn(
										"h-3 w-3 transition-transform",
										isOpen && "rotate-180",
									)}
								/>
							</button>
							{isOpen && (
								<div className="mt-3 space-y-3">
									{securityResult.issues.map((issue, index) => (
										<div
											key={index}
											className="rounded-xl border border-border/50 bg-background/50 p-3"
										>
											<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
												<Badge
													variant="outline"
													className={cn(
														"w-fit text-xs",
														severityBadgeClasses[issue.severity],
													)}
												>
													{issue.severity}
												</Badge>
												<span className="font-medium text-muted-foreground text-sm">
													{issue.type}
												</span>
											</div>
											<p className="mt-2 text-sm">{issue.description}</p>
											<p className="mt-2 text-muted-foreground text-xs">
												<strong>{t("recommendation")}:</strong>{" "}
												{issue.recommendation}
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
					className="h-11 w-11 shrink-0 md:h-6 md:w-6"
					onClick={() => setIsDismissed(true)}
				>
					<X className="h-3 w-3" />
				</Button>
			</div>
		</div>
	);
}
