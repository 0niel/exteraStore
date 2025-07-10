"use client";

import { type Change, diffLines } from "diff";
import {
	ArrowLeft,
	Calendar,
	Copy,
	ExternalLink,
	FileText,
	GitBranch,
	GitCommit,
	Minus,
	Plus,
	User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

export default function PluginDiffPage() {
	const params = useParams();
	const slug = params.slug as string;
	const fromHash = params.fromHash as string;
	const toHash = params.toHash as string;
	const router = useRouter();

	const { data: plugin } = api.plugins.getBySlug.useQuery({ slug });
	const { data: diffData, isLoading } =
		api.pluginVersions.getCommitDiff.useQuery({
			pluginSlug: slug,
			fromHash,
			toHash,
		});

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
					<p>Между этими коммитами нет различий в коде</p>
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

				{/* Diff контент */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="font-mono text-base">
								{plugin?.name}.py
							</CardTitle>
							<Button
								variant="outline"
								size="sm"
								onClick={() => copyToClipboard(diffData.newContent)}
							>
								<Copy className="mr-2 h-4 w-4" />
								Копировать код
							</Button>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						<div className="border-t bg-muted/30">
							<div className="overflow-x-auto font-mono text-sm">
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

	if (!diffData) {
		return (
			<div className="min-h-screen bg-background">
				<EmptyState
					icon="🔍"
					title="Сравнение не найдено"
					description="Не удалось найти указанные коммиты для сравнения"
					actionLabel="Вернуться к плагину"
					onAction={() => router.push(`/plugins/${slug}`)}
				/>
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
							<span>diff</span>
						</div>
					</div>

					{/* Заголовок */}
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<GitCommit className="h-6 w-6 text-muted-foreground" />
							<h1 className="font-bold text-2xl">Сравнение коммитов</h1>
						</div>
						<p className="text-muted-foreground">
							Просмотр изменений между двумя версиями плагина
						</p>
					</div>

					{/* Информация о коммитах */}
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{/* Старый коммит */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-red-600">
									<Minus className="h-5 w-5" />
									Исходная версия
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center gap-2">
									<GitCommit className="h-4 w-4 text-muted-foreground" />
									<span className="font-mono text-sm">{fromHash}</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => copyToClipboard(fromHash)}
									>
										<Copy className="h-3 w-3" />
									</Button>
								</div>
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<Calendar className="h-4 w-4" />
									<span>
										{formatDate(diffData.fromVersion.createdAt)}
									</span>
								</div>
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<GitBranch className="h-4 w-4" />
									<span>v{diffData.fromVersion.version}</span>
								</div>
								{diffData.fromVersion.changelog && (
									<div className="text-sm">
										<p className="mb-1 font-medium">Изменения:</p>
										<p className="rounded bg-muted p-2 text-muted-foreground text-xs">
											{diffData.fromVersion.changelog}
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Новый коммит */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-green-600">
									<Plus className="h-5 w-5" />
									Новая версия
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center gap-2">
									<GitCommit className="h-4 w-4 text-muted-foreground" />
									<span className="font-mono text-sm">{toHash}</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => copyToClipboard(toHash)}
									>
										<Copy className="h-3 w-3" />
									</Button>
								</div>
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<Calendar className="h-4 w-4" />
									<span>
										{formatDate(diffData.toVersion.createdAt)}
									</span>
								</div>
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<GitBranch className="h-4 w-4" />
									<span>v{diffData.toVersion.version}</span>
								</div>
								{diffData.toVersion.changelog && (
									<div className="text-sm">
										<p className="mb-1 font-medium">Изменения:</p>
										<p className="rounded bg-muted p-2 text-muted-foreground text-xs">
											{diffData.toVersion.changelog}
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
