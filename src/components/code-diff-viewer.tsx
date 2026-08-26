"use client";

import { Copy, FileText, Minus, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { type CodeDiffLineKind, createCodeDiff } from "~/lib/code-diff";
import { cn } from "~/lib/utils";

interface CodeDiffViewerProps {
	oldContent?: string | null;
	newContent?: string | null;
	fileName: string;
	copyLabel: string;
	noChangesTitle: string;
	noChangesDescription: string;
	additionsLabel: (count: number) => string;
	deletionsLabel: (count: number) => string;
	onCopy: (content: string) => void;
}

const LINE_STYLES = {
	added: {
		row: "border-l-success bg-success/10",
		text: "text-success",
		prefix: "+",
	},
	removed: {
		row: "border-l-destructive bg-destructive/10",
		text: "text-destructive",
		prefix: "-",
	},
	unchanged: {
		row: "border-l-transparent",
		text: "text-muted-foreground",
		prefix: " ",
	},
} satisfies Record<
	CodeDiffLineKind,
	{ row: string; text: string; prefix: string }
>;

export function CodeDiffViewer({
	oldContent,
	newContent,
	fileName,
	copyLabel,
	noChangesTitle,
	noChangesDescription,
	additionsLabel,
	deletionsLabel,
	onCopy,
}: CodeDiffViewerProps) {
	if (oldContent == null || newContent == null) {
		return (
			<div className="rounded-2xl border border-dashed bg-primary/5 py-12 text-center text-muted-foreground">
				<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
					<FileText className="h-7 w-7" />
				</div>
				<h3 className="mb-2 font-medium text-foreground text-lg">
					{noChangesTitle}
				</h3>
				<p>{noChangesDescription}</p>
			</div>
		);
	}

	const diff = createCodeDiff(oldContent, newContent);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-4 text-sm">
					<div className="flex items-center gap-1 text-success">
						<Plus className="h-4 w-4" />
						<span className="font-medium">
							{additionsLabel(diff.additions)}
						</span>
					</div>
					<div className="flex items-center gap-1 text-destructive">
						<Minus className="h-4 w-4" />
						<span className="font-medium">
							{deletionsLabel(diff.deletions)}
						</span>
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					className="min-h-11 md:min-h-8"
					onClick={() => onCopy(newContent)}
				>
					<Copy className="mr-2 h-4 w-4" />
					{copyLabel}
				</Button>
			</div>

			<Card className="overflow-hidden py-0">
				<CardContent className="p-0">
					<div className="max-h-[70vh] overflow-y-auto bg-muted/30">
						<div className="glass sticky top-0 z-10 border-b px-4 py-3">
							<div className="flex items-center gap-2 font-mono text-sm">
								<FileText className="h-4 w-4 shrink-0" />
								<span className="truncate">{fileName}</span>
							</div>
						</div>
						<div className="scrollbar-hide overflow-x-auto font-mono text-sm">
							<div className="min-w-max">
								{diff.lines.map((line) => {
									const style = LINE_STYLES[line.kind];
									return (
										<div
											key={line.id}
											className={cn(
												"flex border-l-4 hover:bg-muted/50",
												style.row,
											)}
										>
											<div className="w-12 shrink-0 select-none border-r bg-muted/20 px-2 py-1 text-right text-muted-foreground text-xs">
												{line.oldLineNumber}
											</div>
											<div className="w-12 shrink-0 select-none border-r bg-muted/20 px-2 py-1 text-right text-muted-foreground text-xs">
												{line.newLineNumber}
											</div>
											<div className="w-8 shrink-0 select-none px-2 py-1 text-center font-bold text-xs">
												<span className={style.text}>{style.prefix}</span>
											</div>
											<div
												className={cn(
													"flex-1 whitespace-pre px-2 py-1",
													style.text,
												)}
											>
												{line.value}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
