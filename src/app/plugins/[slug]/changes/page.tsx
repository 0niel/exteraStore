"use client";

import { type Change, diffLines } from "diff";
import {
	ArrowLeft,
	Calendar,
	Clock,
	Copy,
	FileText,
	GitCommit,
	Minus,
	Plus,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

export default function PluginChangesPage() {
	const params = useParams();
	const slug = params.slug as string;

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

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text).then(() => {
			toast.success("Скопировано в буфер обмена");
		});
	};

	const renderDiffStats = (changes: Change[]) => {
		let additions = 0;
		let deletions = 0;

		changes.forEach((change) => {
			const lines = change.value.split("\n").filter((line) => line !== "");
			if (change.added) additions += lines.length;
			if (change.removed) deletions += lines.length;
		});

		return { additions, deletions };
	};

	const renderDiff = () => {
		if (!diffData?.oldContent || !diffData?.newContent) {
			return (
				<div className="py-12 text-center text-muted-foreground">
					<FileText className="mx-auto mb-4 h-16 w-16 opacity-50" />
					<h3 className="mb-2 font-medium text-lg">Нет изменений</h3>
					<p>Между последними версиями нет различий в коде</p>
				</div>
			);
		}

		const changes: Change[] = diffLines(
			diffData.oldContent,
			diffData.newContent,
		);
		const { additions, deletions } = renderDiffStats(changes);
		let lineNumber = 1;

		return (
			<div className="space-y-6">
				{/* Статистика изменений */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4 text-sm">
						<div className="flex items-center gap-1 text-green-600">
							<Plus className="h-4 w-4" />
							<span className="font-medium">{additions} добавлений</span>
						</div>
						<div className="flex items-center gap-1 text-red-600">
							<Minus className="h-4 w-4" />
							<span className="font-medium">{deletions} удалений</span>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => copyToClipboard(diffData.newContent)}
					>
						<Copy className="mr-2 h-4 w-4" />
						Копировать код
					</Button>
				</div>

				{/* Diff контент */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 font-mono text-base">
							<FileText className="h-4 w-4" />
							{plugin?.name}.py
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="border-t bg-muted/30">
							<div className="max-h-96 overflow-x-auto font-mono text-sm">
								{changes.map((change, changeIndex) => {
									const lines = change.value
										.split("\n")
										.filter((line) => line !== "");

									return lines.map((line, lineIndex) => {
										const currentLineNumber = lineNumber++;
										let bgColor = "";
										let textColor = "";
										let prefix = " ";
										let borderColor = "";

										if (change.added) {
											bgColor = "bg-green-50 dark:bg-green-950/30";
											textColor = "text-green-800 dark:text-green-300";
											borderColor = "border-l-4 border-green-500";
											prefix = "+";
										} else if (change.removed) {
											bgColor = "bg-red-50 dark:bg-red-950/30";
											textColor = "text-red-800 dark:text-red-300";
											borderColor = "border-l-4 border-red-500";
											prefix = "-";
										} else {
											textColor = "text-muted-foreground";
										}

										return (
											<div
												key={`${changeIndex}-${lineIndex}`}
												className={`flex hover:bg-muted/50 ${bgColor} ${borderColor}`}
											>
												<div className="w-16 flex-shrink-0 select-none border-r bg-muted/20 px-2 py-1 text-muted-foreground text-xs">
													{!change.removed && currentLineNumber}
												</div>
												<div className="w-8 flex-shrink-0 select-none px-2 py-1 text-center font-bold text-xs">
													<span className={textColor}>{prefix}</span>
												</div>
												<div
													className={`flex-1 whitespace-pre-wrap px-2 py-1 ${textColor}`}
												>
													{line}
												</div>
											</div>
										);
									});
								})}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="container mx-auto px-4 py-8">
					<div className="space-y-6">
						<Skeleton className="h-8 w-64" />
						<div className="grid grid-cols-2 gap-6">
							<Skeleton className="h-32" />
							<Skeleton className="h-32" />
						</div>
						<Skeleton className="h-96" />
					</div>
				</div>
			</div>
		);
	}

	if (!versions || versions.length < 2) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="text-center">
					<div className="mb-4 text-6xl">📝</div>
					<h1 className="mb-2 font-bold text-2xl">Недостаточно версий</h1>
					<p className="mb-4 text-muted-foreground">
						Для просмотра изменений нужно минимум 2 версии плагина
					</p>
					<Link href={`/plugins/${slug}`}>
						<Button>Вернуться к плагину</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8">
				<div className="space-y-6">
					{/* Навигация */}
					<div className="flex items-center gap-4">
						<Link href={`/plugins/${slug}`}>
							<Button variant="outline" size="sm">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Назад к плагину
							</Button>
						</Link>
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<Link href={`/plugins/${slug}`} className="hover:text-foreground">
								{plugin?.name}
							</Link>
							<span>/</span>
							<span>последние изменения</span>
						</div>
					</div>

					{/* Заголовок */}
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<Zap className="h-6 w-6 text-yellow-500" />
							<h1 className="font-bold text-2xl">Последние изменения</h1>
							<Badge className="bg-yellow-500">
								<Clock className="mr-1 h-3 w-3" />
								Свежие
							</Badge>
						</div>
						<p className="text-muted-foreground">
							Что нового в последней версии плагина
						</p>
					</div>

					{/* Информация о версиях */}
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{/* Предыдущая версия */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-muted-foreground">
									<GitCommit className="h-5 w-5" />
									Предыдущая версия
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center gap-2">
									<span className="font-semibold">
										v{previousVersion?.version}
									</span>
									<Badge variant="outline">Старая</Badge>
								</div>
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<Calendar className="h-4 w-4" />
									<span>
										{formatDate(new Date(previousVersion?.createdAt || ""))}
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

						{/* Текущая версия */}
						<Card className="border-green-200 dark:border-green-800">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-green-600">
									<Zap className="h-5 w-5" />
									Текущая версия
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center gap-2">
									<span className="font-semibold">
										v{latestVersion?.version}
									</span>
									<Badge className="bg-green-600">Новая</Badge>
								</div>
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<Calendar className="h-4 w-4" />
									<span>
										{formatDate(new Date(latestVersion?.createdAt || ""))}
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
										<p className="mb-1 font-medium">Что нового:</p>
										<p className="rounded bg-muted p-2 text-muted-foreground text-xs">
											{latestVersion.changelog}
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Diff */}
					{renderDiff()}
				</div>
			</div>
		</div>
	);
}
