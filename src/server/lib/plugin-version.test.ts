import assert from "node:assert/strict";
import test from "node:test";
import {
	getPluginReleaseChannel,
	isValidPluginVersion,
	normalizePluginVersion,
} from "../../lib/plugin-version";

test("validates and normalizes semantic plugin versions", () => {
	assert.equal(isValidPluginVersion("1.2.3"), true);
	assert.equal(isValidPluginVersion("v2.0.0-beta.1+build.7"), true);
	assert.equal(isValidPluginVersion("1.0"), false);
	assert.equal(isValidPluginVersion("01.0.0"), false);
	assert.equal(normalizePluginVersion(" v1.2.3 "), "1.2.3");
});

test("derives release channels from semantic versions", () => {
	assert.equal(getPluginReleaseChannel("1.0.0", true), "stable");
	assert.equal(getPluginReleaseChannel("1.0.0-rc.1", false), "rc");
	assert.equal(getPluginReleaseChannel("1.0.0-beta.2", false), "beta");
	assert.equal(getPluginReleaseChannel("1.0.0-alpha.1", false), "alpha");
	assert.equal(getPluginReleaseChannel("1.0.0-nightly", false), "preview");
});
