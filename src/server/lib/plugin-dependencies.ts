import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "~/server/db";
import {
	notifications,
	pluginDependencies,
	plugins,
	pluginTranslations,
} from "~/server/db/schema";

export type PluginDependencyEdge = {
	pluginId: number;
	dependencyPluginId: number;
};

const MAX_DIRECT_DEPENDENCIES = 20;
const MAX_INSTALL_PLAN_SIZE = 50;

export function orderPluginInstallIds(
	rootPluginId: number,
	edges: PluginDependencyEdge[],
): number[] {
	const graph = new Map<number, number[]>();
	for (const edge of edges) {
		const dependencies = graph.get(edge.pluginId) ?? [];
		if (!dependencies.includes(edge.dependencyPluginId)) {
			dependencies.push(edge.dependencyPluginId);
			graph.set(edge.pluginId, dependencies);
		}
	}

	const visiting = new Set<number>();
	const visited = new Set<number>();
	const ordered: number[] = [];

	const visit = (pluginId: number) => {
		if (visiting.has(pluginId)) {
			throw new Error("Обнаружена циклическая зависимость плагинов");
		}
		if (visited.has(pluginId)) return;
		if (visited.size >= MAX_INSTALL_PLAN_SIZE) {
			throw new Error("Цепочка зависимостей слишком большая");
		}

		visiting.add(pluginId);
		for (const dependencyId of graph.get(pluginId) ?? []) {
			visit(dependencyId);
		}
		visiting.delete(pluginId);
		visited.add(pluginId);
		ordered.push(pluginId);
	};

	visit(rootPluginId);
	return ordered;
}

async function loadDependencyEdges(
	database: Database,
	startPluginIds: number[],
): Promise<PluginDependencyEdge[]> {
	let frontier = [...new Set(startPluginIds)];
	const expanded = new Set<number>();
	const edges: PluginDependencyEdge[] = [];

	while (frontier.length > 0) {
		const batch = frontier.filter((id) => !expanded.has(id));
		if (batch.length === 0) break;
		for (const id of batch) expanded.add(id);
		if (expanded.size > MAX_INSTALL_PLAN_SIZE) {
			throw new Error("Цепочка зависимостей слишком большая");
		}

		const rows = await database
			.select({
				pluginId: pluginDependencies.pluginId,
				dependencyPluginId: pluginDependencies.dependencyPluginId,
			})
			.from(pluginDependencies)
			.where(
				and(
					inArray(pluginDependencies.pluginId, batch),
					eq(pluginDependencies.dependencyType, "required"),
				),
			)
			.orderBy(asc(pluginDependencies.id));

		edges.push(...rows);
		frontier = rows.map((row) => row.dependencyPluginId);
	}

	return edges;
}

export async function validatePluginDependencyIds(
	database: Database,
	dependencyPluginIds: number[],
	pluginId?: number,
): Promise<number[]> {
	const uniqueIds = [...new Set(dependencyPluginIds)];
	if (uniqueIds.length > MAX_DIRECT_DEPENDENCIES) {
		throw new Error(
			`Можно указать не более ${MAX_DIRECT_DEPENDENCIES} зависимостей`,
		);
	}
	if (uniqueIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
		throw new Error("Некорректный список зависимостей");
	}
	if (pluginId && uniqueIds.includes(pluginId)) {
		throw new Error("Плагин не может зависеть от самого себя");
	}
	if (uniqueIds.length === 0) return [];

	const availablePlugins = await database
		.select({ id: plugins.id })
		.from(plugins)
		.where(and(inArray(plugins.id, uniqueIds), eq(plugins.status, "approved")));
	if (availablePlugins.length !== uniqueIds.length) {
		throw new Error("Одна или несколько зависимостей недоступны");
	}

	if (pluginId) {
		const reachableEdges = await loadDependencyEdges(database, uniqueIds);
		orderPluginInstallIds(pluginId, [
			...reachableEdges,
			...uniqueIds.map((dependencyPluginId) => ({
				pluginId,
				dependencyPluginId,
			})),
		]);
	}

	return uniqueIds;
}

export async function replacePluginDependencies(
	database: Database,
	pluginId: number,
	dependencyPluginIds: number[],
): Promise<{ addedIds: number[]; removedIds: number[] }> {
	const currentRows = await database
		.select({ dependencyPluginId: pluginDependencies.dependencyPluginId })
		.from(pluginDependencies)
		.where(eq(pluginDependencies.pluginId, pluginId));
	const currentIds = new Set(currentRows.map((row) => row.dependencyPluginId));
	const nextIds = new Set(dependencyPluginIds);
	const addedIds = dependencyPluginIds.filter((id) => !currentIds.has(id));
	const removedIds = [...currentIds].filter((id) => !nextIds.has(id));

	await database
		.delete(pluginDependencies)
		.where(eq(pluginDependencies.pluginId, pluginId));

	if (dependencyPluginIds.length > 0) {
		await database.insert(pluginDependencies).values(
			dependencyPluginIds.map((dependencyPluginId) => ({
				pluginId,
				dependencyPluginId,
				dependencyType: "required",
			})),
		);
	}

	return { addedIds, removedIds };
}

export async function notifyDependencyAuthors(
	database: Database,
	input: {
		pluginId: number;
		pluginName: string;
		actorUserId: string;
		dependencyPluginIds: number[];
	},
): Promise<void> {
	if (input.dependencyPluginIds.length === 0) return;
	const dependencyPlugins = await database
		.select({
			id: plugins.id,
			name: plugins.name,
			authorId: plugins.authorId,
		})
		.from(plugins)
		.where(inArray(plugins.id, input.dependencyPluginIds));

	const values = dependencyPlugins.flatMap((dependency) => {
		if (!dependency.authorId || dependency.authorId === input.actorUserId) {
			return [];
		}
		return [
			{
				userId: dependency.authorId,
				pluginId: input.pluginId,
				type: "dependency_added",
				title: "Ваш плагин добавлен как зависимость",
				message: `${input.pluginName} теперь использует ${dependency.name} как обязательную зависимость.`,
				data: JSON.stringify({ dependencyPluginId: dependency.id }),
			},
		];
	});

	if (values.length > 0) {
		try {
			await database.insert(notifications).values(values);
		} catch (error) {
			console.error("Failed to create dependency notifications:", error);
		}
	}
}

export async function getDirectPluginDependencies(
	database: Database,
	pluginId: number,
	locale?: "ru" | "en",
) {
	const rows = await database
		.select({
			id: plugins.id,
			name: plugins.name,
			slug: plugins.slug,
			shortDescription: plugins.shortDescription,
			version: plugins.version,
			author: plugins.author,
			exteralessCompatible: plugins.exteralessCompatible,
		})
		.from(pluginDependencies)
		.innerJoin(plugins, eq(pluginDependencies.dependencyPluginId, plugins.id))
		.where(
			and(
				eq(pluginDependencies.pluginId, pluginId),
				eq(pluginDependencies.dependencyType, "required"),
				eq(plugins.status, "approved"),
			),
		)
		.orderBy(asc(pluginDependencies.id));
	if (!locale || rows.length === 0) return rows;
	const translations = await database
		.select()
		.from(pluginTranslations)
		.where(
			and(
				inArray(
					pluginTranslations.pluginId,
					rows.map((row) => row.id),
				),
				eq(pluginTranslations.locale, locale),
			),
		);
	const byPlugin = new Map(translations.map((item) => [item.pluginId, item]));
	return rows.map((row) => ({
		...row,
		name: byPlugin.get(row.id)?.name ?? row.name,
		shortDescription:
			byPlugin.get(row.id)?.shortDescription ?? row.shortDescription,
	}));
}

export async function getPluginInstallPlan(
	database: Database,
	rootPluginId: number,
	locale?: "ru" | "en",
) {
	const edges = await loadDependencyEdges(database, [rootPluginId]);
	const installIds = orderPluginInstallIds(rootPluginId, edges);
	const pluginRows = await database
		.select({
			id: plugins.id,
			name: plugins.name,
			slug: plugins.slug,
			shortDescription: plugins.shortDescription,
			description: plugins.description,
			version: plugins.version,
			author: plugins.author,
			exteralessCompatible: plugins.exteralessCompatible,
		})
		.from(plugins)
		.where(
			and(inArray(plugins.id, installIds), eq(plugins.status, "approved")),
		);
	const translations = locale
		? await database
				.select()
				.from(pluginTranslations)
				.where(
					and(
						inArray(pluginTranslations.pluginId, installIds),
						eq(pluginTranslations.locale, locale),
					),
				)
		: [];
	const translationsByPlugin = new Map(
		translations.map((translation) => [translation.pluginId, translation]),
	);
	const pluginsById = new Map(
		pluginRows.map((plugin) => {
			const translation = translationsByPlugin.get(plugin.id);
			return [
				plugin.id,
				translation
					? {
							...plugin,
							name: translation.name,
							shortDescription: translation.shortDescription,
							description: translation.description,
						}
					: plugin,
			] as const;
		}),
	);

	if (pluginRows.length !== installIds.length) {
		throw new Error("Одна из обязательных зависимостей сейчас недоступна");
	}

	return installIds.map((id, index) => {
		const plugin = pluginsById.get(id);
		if (!plugin) {
			throw new Error("Одна из обязательных зависимостей сейчас недоступна");
		}
		return {
			...plugin,
			installOrder: index + 1,
			isRequestedPlugin: id === rootPluginId,
		};
	});
}
