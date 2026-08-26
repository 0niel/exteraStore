import assert from "node:assert/strict";
import test from "node:test";
import { createCodeDiff } from "~/lib/code-diff";

test("code diff tracks old and new line numbers independently", () => {
	const result = createCodeDiff(
		"alpha\nbeta\ngamma\n",
		"alpha\ndelta\ngamma\n",
	);

	assert.equal(result.additions, 1);
	assert.equal(result.deletions, 1);
	assert.deepEqual(
		result.lines.map((line) => ({
			kind: line.kind,
			old: line.oldLineNumber,
			new: line.newLineNumber,
		})),
		[
			{ kind: "unchanged", old: 1, new: 1 },
			{ kind: "removed", old: 2, new: null },
			{ kind: "added", old: null, new: 2 },
			{ kind: "unchanged", old: 3, new: 3 },
		],
	);
});

test("code diff preserves intentional blank lines", () => {
	const result = createCodeDiff("alpha\n\nomega", "alpha\nnew\n\nomega");
	assert.equal(result.additions, 1);
	assert.equal(
		result.lines.some((line) => line.value === ""),
		true,
	);
});
