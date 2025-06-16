import { Grid, Tag } from "lucide-react";

interface PageHeaderProps {
	badge: string;
	title: string;
	description: string;
	icon?: React.ComponentType<{ className?: string }>;
}

export function PageHeader({
	badge,
	title,
	description,
	icon: Icon = Grid,
}: PageHeaderProps) {
	return (
		<div className="mb-12 text-center">
			<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-medium text-primary text-sm">
				<Icon className="h-4 w-4" />
				{badge}
			</div>
			<h1 className="mb-4 font-bold text-4xl sm:text-5xl">{title}</h1>
			<p className="mx-auto max-w-2xl text-muted-foreground text-xl">
				{description}
			</p>
		</div>
	);
}
