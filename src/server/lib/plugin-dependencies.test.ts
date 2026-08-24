import assert from "node:assert/strict";
import test from "node:test";
import { orderPluginInstallIds } from "./plugin-dependencies";

test("orders nested dependencies before the requested plugin", () => {
	assert.deepEqual(
		orderPluginInstallIds(1, [
			{ pluginId: 1, dependencyPluginId: 2 },
			{ pluginId: 1, dependencyPluginId: 3 },
			{ pluginId: 2, dependencyPluginId: 4 },
		]),
		[4, 2, 3, 1],
	);
});

test("deduplicates shared transitive dependencies", () => {
	assert.deepEqual(
		orderPluginInstallIds(1, [
			{ pluginId: 1, dependencyPluginId: 2 },
			{ pluginId: 1, dependencyPluginId: 3 },
			{ pluginId: 2, dependencyPluginId: 4 },
			{ pluginId: 3, dependencyPluginId: 4 },
		]),
		[4, 2, 3, 1],
	);
});

test("rejects cyclic dependency graphs", () => {
	assert.throws(
		() =>
			orderPluginInstallIds(1, [
				{ pluginId: 1, dependencyPluginId: 2 },
				{ pluginId: 2, dependencyPluginId: 1 },
			]),
		/циклическая зависимость/,
	);
});
