"use client";

import { Blocks, Check, Plus, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export type PluginDependencySummary = {
	id: number;
	name: string;
	slug: string;
	shortDescription: string | null;
	version: string;
	author: string;
};

type PluginDependencyPickerProps = {
	selectedIds: number[];
	onChange: (pluginIds: number[]) => void;
	selectedPlugins?: PluginDependencySummary[];
	excludePluginId?: number;
	disabled?: boolean;
};

export function PluginDependencyPicker({
	selectedIds,
	onChange,
	selectedPlugins = [],
	excludePluginId,
	disabled = false,
}: PluginDependencyPickerProps) {
	const t = useTranslations("PluginDependencies");
	const [search, setSearch] = useState("");
	const [selectedCache, setSelectedCache] =
		useState<PluginDependencySummary[]>(selectedPlugins);
	const [debouncedSearch] = useDebounce(search.trim(), 250);
	const { data: options, isFetching } = api.plugins.dependencyOptions.useQuery({
		search: debouncedSearch,
		excludePluginId,
		limit: 20,
	});

	useEffect(() => {
		setSelectedCache((current) => {
			const merged = new Map(
				[...current, ...selectedPlugins, ...(options ?? [])]
					.filter((plugin) => selectedIds.includes(plugin.id))
					.map((plugin) => [plugin.id, plugin]),
			);
			const next = [...merged.values()];
			if (
				next.length === current.length &&
				next.every((plugin, index) => plugin.id === current[index]?.id)
			) {
				return current;
			}
			return next;
		});
	}, [options, selectedIds, selectedPlugins]);

	const pluginsById = useMemo(() => {
		return new Map(
			[...selectedCache, ...selectedPlugins, ...(options ?? [])].map(
				(plugin) => [plugin.id, plugin],
			),
		);
	}, [options, selectedCache, selectedPlugins]);

	const selected = selectedIds
		.map((id) => pluginsById.get(id))
		.filter((plugin): plugin is PluginDependencySummary => Boolean(plugin));

	const togglePlugin = (pluginId: number) => {
		if (disabled) return;
		if (selectedIds.includes(pluginId)) {
			onChange(selectedIds.filter((id) => id !== pluginId));
			return;
		}
		if (selectedIds.length >= 20) {
			toast.warning(t("limit_reached"));
			return;
		}
		onChange([...selectedIds, pluginId]);
	};

	return (
		<section className="rounded-2xl bg-muted/45 p-4 sm:p-5">
			<div className="flex items-start gap-3">
				<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
					<Blocks className="size-4" />
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="font-semibold">{t("picker_title")}</h3>
						{selectedIds.length > 0 && (
							<Badge variant="secondary">
								{t("selected_count", { count: selectedIds.length })}
							</Badge>
						)}
					</div>
					<p className="mt-1 text-muted-foreground text-sm leading-relaxed">
						{t("picker_description")}
					</p>
				</div>
			</div>

			{selected.length > 0 && (
				<div className="mt-4 flex flex-wrap gap-2">
					{selected.map((plugin) => (
						<button
							key={plugin.id}
							type="button"
							onClick={() => togglePlugin(plugin.id)}
							disabled={disabled}
							className="inline-flex min-h-9 items-center gap-2 rounded-full bg-primary px-3 font-medium text-primary-foreground text-xs transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
							aria-label={t("remove_dependency", { name: plugin.name })}
						>
							<Check className="size-3.5" />
							<span className="max-w-40 truncate">{plugin.name}</span>
							<X className="size-3.5" />
						</button>
					))}
				</div>
			)}

			<div className="relative mt-4">
				<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder={t("search_placeholder")}
					className="bg-background pr-10 pl-10"
					disabled={disabled}
				/>
				{isFetching && (
					<span className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				)}
			</div>

			<div className="mt-3 max-h-72 space-y-1 overflow-y-auto overscroll-contain">
				{options?.map((plugin) => {
					const isSelected = selectedIds.includes(plugin.id);
					return (
						<button
							key={plugin.id}
							type="button"
							onClick={() => togglePlugin(plugin.id)}
							disabled={disabled || (!isSelected && selectedIds.length >= 20)}
							className={cn(
								"flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
								isSelected
									? "bg-primary/10 text-foreground"
									: "hover:bg-background",
							)}
						>
							<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background font-bold text-primary text-xs">
								{plugin.name.slice(0, 2).toUpperCase()}
							</span>
							<span className="min-w-0 flex-1">
								<span className="flex items-center gap-2">
									<span className="truncate font-medium text-sm">
										{plugin.name}
									</span>
									<span className="shrink-0 font-mono text-muted-foreground text-xs">
										v{plugin.version}
									</span>
								</span>
								<span className="line-clamp-1 text-muted-foreground text-xs">
									{plugin.shortDescription || t("no_description")}
								</span>
							</span>
							<span
								className={cn(
									"flex size-8 shrink-0 items-center justify-center rounded-full",
									isSelected
										? "bg-primary text-primary-foreground"
										: "bg-background text-primary",
								)}
							>
								{isSelected ? (
									<Check className="size-4" />
								) : (
									<Plus className="size-4" />
								)}
							</span>
						</button>
					);
				})}
				{options?.length === 0 && !isFetching && (
					<p className="px-3 py-6 text-center text-muted-foreground text-sm">
						{t("nothing_found")}
					</p>
				)}
			</div>

			<p className="mt-3 text-muted-foreground text-xs leading-relaxed">
				{t("required_hint")}
			</p>
		</section>
	);
}
