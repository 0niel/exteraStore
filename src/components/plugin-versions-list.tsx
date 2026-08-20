"use client";

import {
	Calendar,
	Download,
	FileDiff,
	GitCommit,
	MoreVertical,
	User,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

interface PluginVersionsListProps {
	pluginId: number;
}

interface PluginVersionRow {
	id: number;
	version: string;
	isStable: boolean;
	gitCommitHash: string | null;
	createdAt: Date | number | string;
	createdBy: {
		name: string | null;
	};
}

export function PluginVersionsList({ pluginId }: PluginVersionsListProps) {
	const t = useTranslations("PluginVersionsList");
	const locale = useLocale();
	const { data: versions, isLoading } = api.pluginUpload.getVersions.useQuery({
		pluginId,
	});

	if (isLoading) {
		return (
			<div className="space-y-2">
				<span className="sr-only">{t("loading")}</span>
				{[0, 1, 2].map((i) => (
					<div key={i} className="skeleton-shimmer h-11 w-full rounded-md" />
				))}
			</div>
		);
	}

	if (!versions || versions.length === 0) {
		return <p className="text-muted-foreground text-sm">{t("no_versions")}</p>;
	}

	return (
		<div className="scrollbar-hide overflow-x-auto rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("version")}</TableHead>
						<TableHead>{t("commit")}</TableHead>
						<TableHead>{t("author")}</TableHead>
						<TableHead>{t("release_date")}</TableHead>
						<TableHead className="text-right">{t("actions")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{versions.map((version: PluginVersionRow) => (
						<TableRow key={version.id}>
							<TableCell>
								<Badge variant={version.isStable ? "default" : "outline"}>
									v{version.version}
								</Badge>
							</TableCell>
							<TableCell className="flex items-center gap-2 font-mono text-sm">
								<GitCommit className="h-4 w-4" />
								{version.gitCommitHash?.substring(0, 7) ?? "N/A"}
							</TableCell>
							<TableCell className="flex items-center gap-2">
								<User className="h-4 w-4" />
								{version.createdBy.name}
							</TableCell>
							<TableCell className="flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								{formatDate(version.createdAt, locale)}
							</TableCell>
							<TableCell className="text-right">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="min-h-11 min-w-11 md:min-h-9 md:min-w-9"
											aria-label={t("actions")}
										>
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem>
											<Download className="mr-2 h-4 w-4" />
											{t("download_file")}
										</DropdownMenuItem>
										<DropdownMenuItem>
											<FileDiff className="mr-2 h-4 w-4" />
											{t("view_changes")}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
