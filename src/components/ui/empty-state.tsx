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
		<div className="mx-auto flex max-w-lg animate-fade-up flex-col items-center px-4 py-12 text-center sm:py-16">
			<div
				className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 font-semibold text-2xl text-primary"
				aria-hidden="true"
			>
				{icon}
			</div>
			<h3 className="text-balance font-semibold text-xl">{title}</h3>
			<p className="mt-2 text-pretty text-muted-foreground">{description}</p>
			{actionLabel && onAction && (
				<Button className="press-scale mt-5 min-h-11" onClick={onAction}>
					{actionLabel}
				</Button>
			)}
		</div>
	);
}
