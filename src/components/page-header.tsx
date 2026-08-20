import { Grid } from "lucide-react";

interface PageHeaderProps {
	badge: string;
	title: string;
	description: string;
	icon?: React.ComponentType<{ className?: string }>;
	align?: "center" | "left";
	children?: React.ReactNode;
}

export function PageHeader({
	badge,
	title,
	description,
	icon: Icon = Grid,
	align = "center",
	children,
}: PageHeaderProps) {
	const centered = align === "center";

	return (
		<div
			className={`relative isolate mb-8 animate-fade-up sm:mb-10 md:mb-14 ${
				centered ? "text-center" : "text-left"
			}`}
		>
			<div className="dot-grid absolute -inset-x-8 -top-10 -z-10 h-56" />
			<div
				className={`mb-4 flex items-center gap-2 ${centered ? "justify-center" : ""}`}
			>
				<span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 font-medium text-primary text-sm shadow-primary/5 shadow-sm">
					<Icon className="h-4 w-4" />
					{badge}
				</span>
			</div>
			<h1 className="mb-3 text-balance font-bold text-3xl tracking-tighter sm:mb-4 sm:text-4xl md:text-5xl">
				{title}
			</h1>
			<p
				className={`max-w-2xl text-balance text-base text-muted-foreground leading-relaxed sm:text-lg ${
					centered ? "mx-auto" : ""
				}`}
			>
				{description}
			</p>
			{children ? (
				<div
					className={`mt-6 flex flex-wrap items-center gap-3 ${
						centered ? "justify-center" : ""
					}`}
				>
					{children}
				</div>
			) : null}
		</div>
	);
}
