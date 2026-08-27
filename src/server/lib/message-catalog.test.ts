import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

type CatalogValue = string | { [key: string]: CatalogValue };

function loadCatalog(locale: "ru" | "en"): Record<string, CatalogValue> {
	return JSON.parse(
		readFileSync(
			new URL(`../../messages/${locale}.json`, import.meta.url),
			"utf8",
		),
	) as Record<string, CatalogValue>;
}

function keys(value: Record<string, CatalogValue>, prefix = ""): string[] {
	return Object.entries(value).flatMap(([key, entry]) => {
		const path = prefix ? `${prefix}.${key}` : key;
		return typeof entry === "string" ? [path] : keys(entry, path);
	});
}

test("Russian and English message catalogs contain the same keys", () => {
	assert.deepEqual(
		keys(loadCatalog("ru")).sort(),
		keys(loadCatalog("en")).sort(),
	);
});

test("Russian interface labels are localized", () => {
	const catalog = loadCatalog("ru");
	const value = (section: string, key: string) => {
		const group = catalog[section];
		if (!group || typeof group === "string") {
			throw new Error(`Missing message group: ${section}`);
		}
		const entry = group[key];
		if (typeof entry !== "string") {
			throw new Error(`Missing message: ${section}.${key}`);
		}
		return entry;
	};

	assert.match(value("PluginPipeline", "workflow_label"), /[А-Яа-яЁё]/);
	assert.match(value("BotAdmin", "webhook_url_label"), /[А-Яа-яЁё]/);
	assert.match(value("Developers", "tier_rising"), /[А-Яа-яЁё]/);
	assert.match(value("AdminCategories", "slug"), /[А-Яа-яЁё]/);
	assert.match(value("PulsePage", "live"), /[А-Яа-яЁё]/);
});
