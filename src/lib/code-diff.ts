import { diffLines } from "diff";

export type CodeDiffLineKind = "added" | "removed" | "unchanged";

interface CodeDiffLine {
	id: string;
	kind: CodeDiffLineKind;
	value: string;
	oldLineNumber: number | null;
	newLineNumber: number | null;
}

export interface CodeDiff {
	lines: CodeDiffLine[];
	additions: number;
	deletions: number;
}

function getChangeLines(value: string): string[] {
	const lines = value.split("\n");
	if (lines.at(-1) === "") {
		lines.pop();
	}
	return lines;
}

export function createCodeDiff(
	oldContent: string,
	newContent: string,
): CodeDiff {
	let oldLineNumber = 1;
	let newLineNumber = 1;
	let additions = 0;
	let deletions = 0;
	const lines: CodeDiffLine[] = [];

	for (const [changeIndex, change] of diffLines(
		oldContent,
		newContent,
	).entries()) {
		const kind: CodeDiffLineKind = change.added
			? "added"
			: change.removed
				? "removed"
				: "unchanged";

		for (const [lineIndex, value] of getChangeLines(change.value).entries()) {
			const oldNumber = kind === "added" ? null : oldLineNumber++;
			const newNumber = kind === "removed" ? null : newLineNumber++;

			if (kind === "added") additions += 1;
			if (kind === "removed") deletions += 1;

			lines.push({
				id: `${changeIndex}-${lineIndex}`,
				kind,
				value,
				oldLineNumber: oldNumber,
				newLineNumber: newNumber,
			});
		}
	}

	return { lines, additions, deletions };
}
