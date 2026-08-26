"use client";

import { XIcon } from "lucide-react";
import type * as React from "react";
import { Drawer } from "vaul";

import { cn } from "~/lib/utils";

function Dialog({ ...props }: React.ComponentProps<typeof Drawer.Root>) {
	return (
		<Drawer.Root
			data-slot="dialog"
			direction="bottom"
			handleOnly
			closeThreshold={0.25}
			scrollLockTimeout={200}
			shouldScaleBackground={false}
			{...props}
		/>
	);
}

function DialogTrigger({
	...props
}: React.ComponentProps<typeof Drawer.Trigger>) {
	return <Drawer.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
	...props
}: React.ComponentProps<typeof Drawer.Portal>) {
	return <Drawer.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof Drawer.Close>) {
	return <Drawer.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof Drawer.Overlay>) {
	return (
		<Drawer.Overlay
			data-slot="dialog-overlay"
			className={cn(
				"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/72 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in",
				className,
			)}
			{...props}
		/>
	);
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	closeLabel = "Close",
	...props
}: React.ComponentProps<typeof Drawer.Content> & {
	showCloseButton?: boolean;
	closeLabel?: string;
}) {
	return (
		<DialogPortal data-slot="dialog-portal">
			<DialogOverlay />
			<Drawer.Content
				data-slot="dialog-content"
				className="fixed inset-x-0 bottom-0 z-50 outline-none sm:pointer-events-none sm:inset-0 sm:flex sm:items-center sm:justify-center"
				{...props}
			>
				<div
					className={cn(
						"relative grid max-h-[calc(100dvh-env(safe-area-inset-top)-.5rem)] w-full min-w-0 gap-3 overflow-y-auto rounded-t-3xl bg-popover px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] text-popover-foreground sm:pointer-events-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg sm:gap-4 sm:rounded-3xl sm:p-6 md:max-w-2xl",
						className,
					)}
				>
					<Drawer.Handle className="mx-auto mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/55 sm:hidden" />
					{children}
					{showCloseButton && (
						<Drawer.Close
							data-slot="dialog-close"
							className="absolute top-4 right-4 flex size-10 touch-manipulation items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/55 disabled:pointer-events-none disabled:opacity-50 sm:size-9"
						>
							<XIcon className="size-5" />
							<span className="sr-only">{closeLabel}</span>
						</Drawer.Close>
					)}
				</div>
			</Drawer.Content>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn("flex flex-col gap-2 pr-10 text-left", className)}
			{...props}
		/>
	);
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				"flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end",
				className,
			)}
			{...props}
		/>
	);
}

function DialogTitle({
	className,
	...props
}: React.ComponentProps<typeof Drawer.Title>) {
	return (
		<Drawer.Title
			data-slot="dialog-title"
			className={cn("font-semibold text-xl leading-tight", className)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof Drawer.Description>) {
	return (
		<Drawer.Description
			data-slot="dialog-description"
			className={cn("text-muted-foreground text-sm leading-relaxed", className)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
