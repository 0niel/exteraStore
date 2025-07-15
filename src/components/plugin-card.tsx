"use client";

import {
	Calendar,
	Code,
	Download,
	ExternalLink,
	Heart,
	Shield,
	Star,
	User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { SecurityWarning } from "~/components/ui/security-warning";
import { cn, formatDate, formatNumber } from "~/lib/utils";
import { api } from "~/trpc/react";

interface Plugin {
	id: number;
	name: string;
	slug: string;
	description: string;
	shortDescription?: string | null;
	version: string;
	author?: string | null;
	authorId?: string | null;
	category: string;
	tags: string | null;
	downloadCount: number;
	rating: number;
	ratingCount: number;
	price: number;
	featured: boolean;
	verified: boolean;
	screenshots: string | null;
	createdAt: Date | number;
	latestSecurityCheck?: {
		status: string;
		classification: string;
		shortDescription: string;
		details: string;
	} | null;
}

interface PluginCardProps {
	plugin: Plugin;
	className?: string;
	showAuthor?: boolean;
	compact?: boolean;
}

export function PluginCard({
	plugin,
	className,
	showAuthor = true,
	compact = false,
}: PluginCardProps) {
	const t = useTranslations("PluginCard");
	const tags = plugin.tags ? (JSON.parse(plugin.tags) as string[]) : [];
	const screenshots = plugin.screenshots
		? (JSON.parse(plugin.screenshots) as string[])
		: [];

	const { data: categories } = api.categories.getAll.useQuery();
	const { data: authorData } = api.users.getPublicProfile.useQuery(
		{ id: plugin.authorId || "" },
		{ enabled: !!plugin.authorId },
	);

	const categoryName =
		categories?.find((c) => c.slug === plugin.category)?.name ||
		plugin.category;

	if (compact) {
		return (
			<Card
				className={cn(
					"group border-border/50 transition-all duration-200 hover:shadow-md",
					className,
				)}
			>
				<div className="flex items-center gap-4 p-4">
					<div className="relative flex-shrink-0">
						<div
							className={cn(
								"flex h-12 w-12 items-center justify-center rounded-lg",
								plugin.category === "ui" &&
									"bg-purple-100 dark:bg-purple-900/20",
								plugin.category === "utility" &&
									"bg-blue-100 dark:bg-blue-900/20",
								plugin.category === "security" &&
									"bg-red-100 dark:bg-red-900/20",
								plugin.category === "automation" &&
									"bg-green-100 dark:bg-green-900/20",
								plugin.category === "development" &&
									"bg-indigo-100 dark:bg-indigo-900/20",
								![
									"ui",
									"utility",
									"security",
									"automation",
									"development",
								].includes(plugin.category) &&
									"bg-gray-100 dark:bg-gray-900/20",
							)}
						>
							<Code
								className={cn(
									"h-6 w-6",
									plugin.category === "ui" &&
										"text-purple-600 dark:text-purple-400",
									plugin.category === "utility" &&
										"text-blue-600 dark:text-blue-400",
									plugin.category === "security" &&
										"text-red-600 dark:text-red-400",
									plugin.category === "automation" &&
										"text-green-600 dark:text-green-400",
									plugin.category === "development" &&
										"text-indigo-600 dark:text-indigo-400",
									![
										"ui",
										"utility",
										"security",
										"automation",
										"development",
									].includes(plugin.category) &&
										"text-gray-600 dark:text-gray-400",
								)}
							/>
						</div>
						{plugin.verified && (
							<div className="-top-1 -right-1 absolute">
								<div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
									<Shield className="h-3 w-3" />
								</div>
							</div>
						)}
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<h3 className="truncate font-semibold transition-colors group-hover:text-primary">
									<Link
										href={`/plugins/${plugin.slug}`}
										className="hover:underline"
									>
										{plugin.name}
									</Link>
								</h3>
								<p className="line-clamp-1 text-muted-foreground text-sm">
									{plugin.shortDescription || plugin.description}
								</p>
							</div>
							<div className="flex flex-shrink-0 items-center gap-2">
								<div className="flex items-center gap-1">
									<Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
									<span className="font-medium text-sm">
										{plugin.rating.toFixed(1)}
									</span>
								</div>
								<Badge variant="outline" className="text-xs">
									{categoryName}
								</Badge>
							</div>
						</div>

						<div className="mt-2 flex items-center gap-4 text-muted-foreground text-xs">
							<div className="flex items-center gap-1">
								<User className="h-3 w-3" />
								<span>{plugin.author || "Unknown"}</span>
							</div>
							<div className="flex items-center gap-1">
								<Download className="h-3 w-3" />
								<span>{formatNumber(plugin.downloadCount)}</span>
							</div>
							<div className="flex items-center gap-1">
								<Calendar className="h-3 w-3" />
								<span>{formatDate(plugin.createdAt)}</span>
							</div>
						</div>

						{plugin.latestSecurityCheck && plugin.latestSecurityCheck.status !== "passed" && plugin.latestSecurityCheck.details && (
							<div className="mt-2">
								<SecurityWarning
									securityResult={{
										status: plugin.latestSecurityCheck.classification as "safe" | "warning" | "danger",
										classification: plugin.latestSecurityCheck.classification as "safe" | "potentially_unsafe" | "unsafe" | "critical",
										shortDescription: plugin.latestSecurityCheck.shortDescription,
										issues: JSON.parse(plugin.latestSecurityCheck.details).issues || [],
									}}
									variant="compact"
								/>
							</div>
						)}
					</div>

					<Button size="sm" variant="ghost" asChild>
						<Link href={`/plugins/${plugin.slug}`}>
							<ExternalLink className="h-4 w-4" />
						</Link>
					</Button>
				</div>
			</Card>
		);
	}

	return (
		<Link href={`/plugins/${plugin.slug}`} className="group block">
			<Card
				className={cn(
					"hover:-translate-y-1 overflow-hidden border-border/50 transition-all duration-200 hover:shadow-xl",
					plugin.featured && "ring-2 ring-yellow-500/20",
					className,
				)}
			>
				<div className="space-y-4 p-5">
					<div className="space-y-2">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0 flex-1">
								<h3 className="truncate font-semibold text-lg transition-colors group-hover:text-primary">
									{plugin.name}
								</h3>
								<p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
									{plugin.shortDescription || plugin.description}
								</p>
							</div>
							{plugin.verified && (
								<div className="flex-shrink-0">
									<div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10">
										<Shield className="h-4 w-4 text-blue-500" />
									</div>
								</div>
							)}
						</div>
					</div>

					<div className="flex items-center gap-3">
						<Avatar className="h-8 w-8">
							<AvatarImage src={authorData?.image || undefined} />
							<AvatarFallback className="bg-primary/10 text-xs">
								{(plugin.author || "??").slice(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<p className="truncate font-medium text-sm">
								{plugin.author || "Unknown"}
							</p>
							<p className="text-muted-foreground text-xs">Разработчик</p>
						</div>
						<Badge
							variant="outline"
							className={cn(
								"text-xs",
								plugin.category === "ui" &&
									"border-purple-500/50 text-purple-600 dark:text-purple-400",
								plugin.category === "utility" &&
									"border-blue-500/50 text-blue-600 dark:text-blue-400",
								plugin.category === "security" &&
									"border-red-500/50 text-red-600 dark:text-red-400",
								plugin.category === "automation" &&
									"border-green-500/50 text-green-600 dark:text-green-400",
								plugin.category === "development" &&
									"border-indigo-500/50 text-indigo-600 dark:text-indigo-400",
							)}
						>
							{categoryName}
						</Badge>
					</div>

					<div className="flex items-center justify-between border-t pt-3">
						<div className="flex items-center gap-4 text-sm">
							<div className="flex items-center gap-1">
								<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
								<span className="font-medium">{plugin.rating.toFixed(1)}</span>
								<span className="text-muted-foreground">
									({plugin.ratingCount})
								</span>
							</div>
							<div className="flex items-center gap-1 text-muted-foreground">
								<Download className="h-4 w-4" />
								<span>{formatNumber(plugin.downloadCount)}</span>
							</div>
						</div>

						{plugin.price > 0 && (
							<Badge className="border-green-500/20 bg-green-500/10 text-green-600">
								${plugin.price}
							</Badge>
						)}
					</div>

					{tags.length > 0 && (
						<div className="flex flex-wrap gap-1 pt-2">
							{tags.slice(0, 3).map((tag) => (
								<Badge
									key={tag}
									variant="secondary"
									className="px-2 py-0 text-xs"
								>
									{tag}
								</Badge>
							))}
							{tags.length > 3 && (
								<Badge variant="secondary" className="px-2 py-0 text-xs">
									+{tags.length - 3}
								</Badge>
							)}
						</div>
					)}

					{plugin.latestSecurityCheck && plugin.latestSecurityCheck.status !== "passed" && plugin.latestSecurityCheck.details && (
						<SecurityWarning
							securityResult={{
								status: plugin.latestSecurityCheck.classification as "safe" | "warning" | "danger",
								classification: plugin.latestSecurityCheck.classification as "safe" | "potentially_unsafe" | "unsafe" | "critical",
								shortDescription: plugin.latestSecurityCheck.shortDescription,
								issues: JSON.parse(plugin.latestSecurityCheck.details).issues || [],
							}}
							variant="compact"
						/>
					)}
				</div>
			</Card>
		</Link>
	);
}
