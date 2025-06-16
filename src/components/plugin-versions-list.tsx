"use client";

import {
	Calendar,
	Download,
	FileDiff,
	GitCommit,
	MoreVertical,
	User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
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

export function PluginVersionsList({ pluginId }: PluginVersionsListProps) {
	const t = useTranslations("PluginVersionsList");
	const { data: versions, isLoading } = api.pluginUpload.getVersions.useQuery({
		pluginId,
	});

	if (isLoading) {
		return <div>{t("loading")}</div>;
	}

	if (!versions || versions.length === 0) {
		return <p>{t("no_versions")}</p>;
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("version")}</TableHead>
						<TableHead>Commit</TableHead>
						<TableHead>Author</TableHead>
						<TableHead>{t("release_date")}</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{versions.map((version: any) => (
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
								{formatDate(new Date(version.createdAt))}
							</TableCell>
							<TableCell className="text-right">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon">
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
