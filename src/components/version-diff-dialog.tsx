"use client";

import { type Change, diffLines } from "diff";
import { FileText, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

interface VersionDiffDialogProps {
	pluginSlug: string;
	versions: Array<{
		id: number;
		version: string;
		createdAt: Date;
	}>;
	triggerText?: string;
}

export function VersionDiffDialog({
	pluginSlug,
	versions,
	triggerText,
}: VersionDiffDialogProps) {
	const t = useTranslations("VersionDiffDialog");
	const [open, setOpen] = useState(false);
	const [fromVersion, setFromVersion] = useState<string>("");
	const [toVersion, setToVersion] = useState<string>("");

	const {
		data: diffData,
		isLoading,
		error,
	} = api.pluginVersions.getDiff.useQuery(
		{
			pluginSlug,
			fromVersion,
			toVersion,
		},
		{
			enabled:
				open && !!fromVersion && !!toVersion && fromVersion !== toVersion,
		},
	);

	const sortedVersions = [...versions].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);

	const renderDiff = () => {
		if (!diffData?.oldContent || !diffData?.newContent) {
			return (
				<div className="py-8 text-center text-muted-foreground">
					{t("no_data_to_compare")}
				</div>
			);
		}

		const changes: Change[] = diffLines(
			diffData.oldContent,
			diffData.newContent,
		);

		return (
			<div className="max-h-96 overflow-auto rounded-lg bg-muted/30 p-4 font-mono text-sm">
				{changes.map((change, index) => {
					const lines = change.value.split("\n").filter((line) => line !== "");

					return lines.map((line, lineIndex) => {
						let className = "block px-2 py-0.5 ";
						let prefix = " ";

						if (change.added) {
							className +=
								"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
							prefix = "+";
						} else if (change.removed) {
							className +=
								"bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
							prefix = "-";
						} else {
							className += "text-muted-foreground";
						}

						return (
							<div key={`${index}-${lineIndex}`} className={className}>
								<span className="mr-2 inline-block w-4 text-center text-xs opacity-60">
									{prefix}
								</span>
								<span className="whitespace-pre-wrap">{line}</span>
							</div>
						);
					});
				})}
			</div>
		);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 px-2">
					<FileText className="mr-1 h-4 w-4" />
					{triggerText || t("view_changes")}
				</Button>
			</DialogTrigger>
			<DialogContent className="flex max-h-[80vh] max-w-4xl flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle>{t("version_comparison")}</DialogTitle>
					<DialogDescription>
						{t("select_versions_to_compare")}
					</DialogDescription>
				</DialogHeader>

				<div className="flex gap-4 py-4">
					<div className="flex-1">
						<label className="mb-2 block font-medium text-sm">
							{t("old_version")}
						</label>
						<Select value={fromVersion} onValueChange={setFromVersion}>
							<SelectTrigger>
								<SelectValue placeholder={t("select_version")} />
							</SelectTrigger>
							<SelectContent>
								{sortedVersions.map((version) => (
									<SelectItem key={version.id} value={version.version}>
										{version.version} (
										{new Date(version.createdAt).toLocaleDateString()})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex-1">
						<label className="mb-2 block font-medium text-sm">
							{t("new_version")}
						</label>
						<Select value={toVersion} onValueChange={setToVersion}>
							<SelectTrigger>
								<SelectValue placeholder={t("select_version")} />
							</SelectTrigger>
							<SelectContent>
								{sortedVersions.map((version) => (
									<SelectItem key={version.id} value={version.version}>
										{version.version} (
										{new Date(version.createdAt).toLocaleDateString()})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="flex-1 overflow-hidden">
					{!fromVersion || !toVersion ? (
						<div className="py-8 text-center text-muted-foreground">
							{t("select_two_versions")}
						</div>
					) : fromVersion === toVersion ? (
						<div className="py-8 text-center text-muted-foreground">
							{t("select_different_versions")}
						</div>
					) : isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="mr-2 h-6 w-6 animate-spin" />
							{t("loading_diff")}
						</div>
					) : error ? (
						<div className="py-8 text-center text-destructive">
							{t("diff_error")}: {error.message}
						</div>
					) : (
						<div className="h-full overflow-auto">
							<div className="mb-4 text-muted-foreground text-sm">
								{t("comparison_of", { fromVersion, toVersion })}
							</div>
							{renderDiff()}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
