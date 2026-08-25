import type * as React from "react";

import { cn } from "~/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"field-sizing-content flex min-h-28 w-full rounded-2xl border-0 bg-surface px-4 py-3 text-base text-foreground shadow-none outline-none ring-1 ring-transparent transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-out-expo)] placeholder:text-muted-foreground/85 read-only:bg-muted/50 read-only:text-muted-foreground hover:bg-accent/75 focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground disabled:opacity-100 aria-invalid:bg-destructive/5 aria-invalid:ring-2 aria-invalid:ring-destructive/35",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
