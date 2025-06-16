"use client";

import { Button } from "~/components/ui/button";

interface EmptyStateProps {
	icon?: string;
	title: string;
	description: string;
	actionLabel?: string;
	onAction?: () => void;
}

export function EmptyState({
	icon = "🔍",
	title,
	description,
	actionLabel,
	onAction,
}: EmptyStateProps) {
	return (
		<div className="py-12 text-center">
			<div className="mb-4 text-6xl">{icon}</div>
			<h3 className="mb-2 font-semibold text-xl">{title}</h3>
			<p className="mb-4 text-muted-foreground">{description}</p>
			{actionLabel && onAction && (
				<Button onClick={onAction}>{actionLabel}</Button>
			)}
		</div>
	);
}
