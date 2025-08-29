"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as React from "react";

import { cn } from "~/lib/utils";

function Avatar({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
	return (
		<AvatarPrimitive.Root
			data-slot="avatar"
			className={cn(
				"relative flex size-8 shrink-0 overflow-hidden rounded-full",
				className,
			)}
			{...props}
		/>
	);
}

function AvatarImage({
	className,
	onLoad,
	onError,
	src,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	const [shouldRenderImage, setShouldRenderImage] = React.useState<boolean>(
		Boolean(src),
	);

	const handleLoad = React.useCallback<
		React.ReactEventHandler<HTMLImageElement>
	>(
		(event) => {
			const img = event.currentTarget;
			// If the image is a 1x1 px placeholder, hide image and let fallback render
			if (img.naturalWidth === 1 && img.naturalHeight === 1) {
				setShouldRenderImage(false);
			} else {
				setShouldRenderImage(true);
			}
			onLoad?.(event);
		},
		[onLoad],
	);

	const handleError = React.useCallback<
		React.ReactEventHandler<HTMLImageElement>
	>(
		(event) => {
			setShouldRenderImage(false);
			onError?.(event);
		},
		[onError],
	);

	if (!shouldRenderImage) return null;

	return (
		<AvatarPrimitive.Image
			data-slot="avatar-image"
			className={cn("aspect-square size-full", className)}
			onLoad={handleLoad}
			onError={handleError}
			src={src}
			{...props}
		/>
	);
}

function AvatarFallback({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
	return (
		<AvatarPrimitive.Fallback
			data-slot="avatar-fallback"
			className={cn(
				"flex size-full items-center justify-center rounded-full bg-muted",
				className,
			)}
			{...props}
		/>
	);
}

export { Avatar, AvatarImage, AvatarFallback };
