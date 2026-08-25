import type * as React from "react";

import { cn } from "~/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"flex h-12 min-h-12 w-full min-w-0 rounded-2xl border-0 bg-surface px-4 py-2.5 text-base text-foreground shadow-none outline-none ring-1 ring-transparent transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-out-expo)] selection:bg-primary selection:text-primary-foreground file:mr-3 file:inline-flex file:h-8 file:border-0 file:bg-transparent file:font-semibold file:text-foreground file:text-sm placeholder:text-muted-foreground/85 read-only:bg-muted/50 read-only:text-muted-foreground hover:bg-accent/75 focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground disabled:opacity-100",
				"aria-invalid:bg-destructive/5 aria-invalid:ring-2 aria-invalid:ring-destructive/35",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
