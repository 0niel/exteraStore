export const PLUGIN_VERSION_PATTERN =
	/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export type PluginReleaseChannel =
	| "stable"
	| "rc"
	| "beta"
	| "alpha"
	| "preview";

export function normalizePluginVersion(value: string) {
	const trimmed = value.trim();
	return trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
}

export function isValidPluginVersion(value: string) {
	return PLUGIN_VERSION_PATTERN.test(value.trim());
}

export function getPluginReleaseChannel(
	version: string,
	isStable: boolean,
): PluginReleaseChannel {
	if (isStable && !version.includes("-")) return "stable";
	const prerelease = version.split("-")[1]?.toLowerCase() ?? "";
	if (prerelease.includes("rc")) return "rc";
	if (prerelease.includes("beta")) return "beta";
	if (prerelease.includes("alpha")) return "alpha";
	return "preview";
}
