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
		<div className="mb-6 text-center sm:mb-8 md:mb-12">
			<div className="mb-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-xs sm:mb-4 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
				<Icon className="h-3 w-3 sm:h-4 sm:w-4" />
				{badge}
			</div>
			<h1 className="mb-3 font-bold text-2xl sm:mb-4 sm:text-3xl md:text-4xl lg:text-5xl">
				{title}
			</h1>
			<p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl">
				{description}
			</p>
		</div>
	);
}
