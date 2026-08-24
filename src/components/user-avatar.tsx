"use client";

import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";

function initials(name?: string | null) {
	const value = name?.trim();
	if (!value) return null;
	return value
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase();
}

export function UserAvatar({
	name,
	src,
	className,
	imageClassName,
	fallbackClassName,
}: {
	name?: string | null;
	src?: string | null;
	className?: string;
	imageClassName?: string;
	fallbackClassName?: string;
}) {
	const fallback = initials(name);
	return (
		<Avatar className={className}>
			<AvatarImage
				src={src || undefined}
				alt={name || ""}
				className={cn("object-cover", imageClassName)}
				referrerPolicy="no-referrer"
			/>
			<AvatarFallback
				className={cn(
					"bg-primary/10 font-semibold text-primary",
					fallbackClassName,
				)}
			>
				{fallback || <UserRound className="size-1/2" />}
			</AvatarFallback>
		</Avatar>
	);
}
