"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	Download,
	Eye,
	GitBranch,
	MoreHorizontal,
	Package,
	Plus,
	Search,
	Settings,
	Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatNumber } from "~/lib/utils";
import type { plugins as Plugin } from "~/server/db/schema";
import { api } from "~/trpc/react";

const fadeUp = {
	hidden: { opacity: 0, y: 14 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
	},
};

const stagger = {
	hidden: {},
	show: { transition: { staggerChildren: 0.06 } },
};

function MyPluginsSkeleton() {
	return (
		<div className="space-y-6" aria-hidden="true">
			<div className="flex flex-wrap gap-3">
				{[0, 1, 2].map((i) => (
					<div key={i} className="skeleton-shimmer h-11 w-36 rounded-full" />
				))}
			</div>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
				{[0, 1, 2, 3, 4, 5].map((i) => (
					<div key={i} className="space-y-4 rounded-xl border bg-card p-5">
						<div className="flex items-start justify-between gap-3">
							<div className="w-full space-y-2">
								<div className="skeleton-shimmer h-5 w-2/3 rounded-md" />
								<div className="skeleton-shimmer h-3 w-full rounded-md" />
								<div className="skeleton-shimmer h-3 w-3/4 rounded-md" />
							</div>
							<div className="skeleton-shimmer h-6 w-20 shrink-0 rounded-full" />
						</div>
						<div className="flex justify-between gap-2">
							<div className="skeleton-shimmer h-4 w-14 rounded-md" />
							<div className="skeleton-shimmer h-4 w-14 rounded-md" />
							<div className="skeleton-shimmer h-4 w-14 rounded-md" />
						</div>
						<div className="skeleton-shimmer h-11 w-full rounded-lg" />
					</div>
				))}
			</div>
		</div>
	);
}

export default function MyPluginsPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const t = useTranslations("MyPluginsPage");
	const reduceMotion = useReducedMotion();
	const [searchQuery, setSearchQuery] = useState("");

	const { data: myPlugins, isLoading } = api.plugins.getByAuthor.useQuery(
		{ authorId: session?.user?.id || "" },
		{ enabled: !!session?.user?.id },
	);

	if (!session) {
		return (
			<div className="flex min-h-[60dvh] items-center justify-center px-4">
				<Card className="w-full max-w-md animate-scale-in">
					<CardHeader className="text-center">
						<CardTitle>{t("login_required")}</CardTitle>
						<CardDescription>{t("login_required_description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							onClick={() => router.push("/auth/signin")}
							className="w-full"
						>
							{t("login")}
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const filteredPlugins =
		myPlugins?.filter(
			(plugin: typeof Plugin.$inferSelect) =>
				plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				plugin.description.toLowerCase().includes(searchQuery.toLowerCase()),
		) || [];

	const publishedPlugins = filteredPlugins.filter(
		(p: typeof Plugin.$inferSelect) => p.status === "approved",
	);
	const pendingPlugins = filteredPlugins.filter(
		(p: typeof Plugin.$inferSelect) => p.status === "pending",
	);
	const rejectedPlugins = filteredPlugins.filter(
		(p: typeof Plugin.$inferSelect) => p.status === "rejected",
	);

	const totalDownloads = (myPlugins ?? []).reduce(
		(sum: number, p: typeof Plugin.$inferSelect) => sum + p.downloadCount,
		0,
	);
	const ratedPlugins = (myPlugins ?? []).filter(
		(p: typeof Plugin.$inferSelect) => p.ratingCount > 0,
	);
	const averageRating =
		ratedPlugins.length > 0
			? ratedPlugins.reduce(
					(sum: number, p: typeof Plugin.$inferSelect) => sum + p.rating,
					0,
				) / ratedPlugins.length
			: 0;

	const statChips = [
		{
			key: "stat_total",
			icon: Package,
			value: formatNumber(myPlugins?.length ?? 0),
		},
		{
			key: "stat_downloads",
			icon: Download,
			value: formatNumber(totalDownloads),
		},
		{ key: "stat_rating", icon: Star, value: averageRating.toFixed(1) },
	] as const;

	const renderGrid = (plugins: (typeof Plugin.$inferSelect)[]) => (
		<motion.div
			initial={reduceMotion ? false : "hidden"}
			animate="show"
			variants={stagger}
			className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
		>
			{plugins.map((plugin) => (
				<motion.div key={plugin.id} variants={fadeUp}>
					<PluginCard plugin={plugin} />
				</motion.div>
			))}
		</motion.div>
	);

	return (
		<div className="bg-background py-6 sm:py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-6 flex animate-fade-up flex-col gap-4 sm:mb-8 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="mb-2 font-bold text-3xl sm:text-4xl">
							{t("title")}
						</h1>
						<p className="text-lg text-muted-foreground sm:text-xl">
							{t("subtitle")}
						</p>
					</div>
					<Button asChild className="press-scale w-full md:w-auto">
						<Link href="/upload">
							<Plus className="mr-2 h-4 w-4" />
							{t("upload_new")}
						</Link>
					</Button>
				</div>

				{!isLoading && (
					<div
						className="mb-6 flex animate-fade-up flex-wrap gap-3"
						style={{ animationDelay: "60ms" }}
					>
						{statChips.map((chip) => (
							<div
								key={chip.key}
								className="flex min-h-11 items-center gap-2 rounded-full border bg-surface px-4 py-2"
							>
								<chip.icon className="h-4 w-4 text-primary" />
								<span className="font-semibold text-sm">{chip.value}</span>
								<span className="text-muted-foreground text-sm">
									{t(chip.key)}
								</span>
							</div>
						))}
					</div>
				)}

				<div
					className="mb-6 animate-fade-up"
					style={{ animationDelay: "120ms" }}
				>
					<div className="relative max-w-md">
						<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder={t("search_placeholder")}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="min-h-11 pl-10"
						/>
					</div>
				</div>

				{isLoading ? (
					<MyPluginsSkeleton />
				) : (
					<Tabs defaultValue="published" className="space-y-6">
						<TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
							<TabsTrigger value="published" className="min-h-9">
								{t("tab_published")} ({publishedPlugins.length})
							</TabsTrigger>
							<TabsTrigger value="pending" className="min-h-9">
								{t("tab_pending")} ({pendingPlugins.length})
							</TabsTrigger>
							<TabsTrigger value="rejected" className="min-h-9">
								{t("tab_rejected")} ({rejectedPlugins.length})
							</TabsTrigger>
						</TabsList>

						<TabsContent value="published">
							{publishedPlugins.length === 0 ? (
								<EmptyState
									icon="📤"
									title={t("empty_published_title")}
									description={t("empty_published_description")}
									actionLabel={t("empty_published_action")}
									onAction={() => router.push("/upload")}
								/>
							) : (
								renderGrid(publishedPlugins)
							)}
						</TabsContent>

						<TabsContent value="pending">
							{pendingPlugins.length === 0 ? (
								<EmptyState
									icon="⏳"
									title={t("empty_pending_title")}
									description={t("empty_pending_description")}
								/>
							) : (
								renderGrid(pendingPlugins)
							)}
						</TabsContent>

						<TabsContent value="rejected">
							{rejectedPlugins.length === 0 ? (
								<EmptyState
									icon="✅"
									title={t("empty_rejected_title")}
									description={t("empty_rejected_description")}
								/>
							) : (
								renderGrid(rejectedPlugins)
							)}
						</TabsContent>
					</Tabs>
				)}
			</div>
		</div>
	);
}

function PluginCard({ plugin }: { plugin: typeof Plugin.$inferSelect }) {
	const t = useTranslations("MyPluginsPage");

	const statusStyles: Record<string, string> = {
		approved: "border-transparent bg-success/15 text-success",
		pending: "border-transparent bg-warning/15 text-warning",
		rejected: "border-transparent bg-destructive/15 text-destructive",
	};

	const statusLabels: Record<string, string> = {
		approved: t("status_approved"),
		pending: t("status_pending"),
		rejected: t("status_rejected"),
	};

	return (
		<Card className="card-lift h-full">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<CardTitle className="mb-1 truncate text-lg">
							{plugin.name}
						</CardTitle>
						<CardDescription className="line-clamp-2">
							{plugin.shortDescription || plugin.description}
						</CardDescription>
					</div>
					<Badge
						className={
							statusStyles[plugin.status] ??
							"border-transparent bg-muted text-muted-foreground"
						}
					>
						{statusLabels[plugin.status] ?? t("status_unknown")}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between text-muted-foreground text-sm">
					<span className="flex items-center gap-1">
						<GitBranch className="h-4 w-4" />v{plugin.version}
					</span>
					<span className="flex items-center gap-1">
						<Download className="h-4 w-4" />
						{formatNumber(plugin.downloadCount)}
					</span>
					<span className="flex items-center gap-1">
						<Star className="h-4 w-4" />
						{plugin.rating.toFixed(1)}
					</span>
				</div>

				<div className="space-y-2 sm:hidden">
					<Button
						variant="outline"
						size="sm"
						asChild
						className="min-h-11 w-full"
					>
						<Link href={`/plugins/${plugin.slug}`}>
							<Eye className="mr-2 h-4 w-4" />
							{t("view")}
						</Link>
					</Button>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							asChild
							className="min-h-11 flex-1"
						>
							<Link href={`/plugins/${plugin.slug}/versions`}>
								<GitBranch className="mr-1 h-4 w-4" />
								{t("versions")}
							</Link>
						</Button>
						<Button
							variant="outline"
							size="sm"
							asChild
							className="min-h-11 flex-1"
						>
							<Link href={`/my-plugins/${plugin.slug}/manage`}>
								<Settings className="mr-1 h-4 w-4" />
								{t("manage")}
							</Link>
						</Button>
					</div>
				</div>

				<div className="hidden items-center gap-2 sm:flex lg:hidden">
					<Button
						variant="outline"
						size="sm"
						asChild
						className="min-h-11 flex-1"
					>
						<Link href={`/plugins/${plugin.slug}`}>
							<Eye className="mr-2 h-4 w-4" />
							{t("view")}
						</Link>
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="min-h-11"
								aria-label={t("manage")}
							>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem asChild>
								<Link
									href={`/plugins/${plugin.slug}/versions`}
									className="flex items-center"
								>
									<GitBranch className="mr-2 h-4 w-4" />
									{t("versions")}
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link
									href={`/my-plugins/${plugin.slug}/manage`}
									className="flex items-center"
								>
									<Settings className="mr-2 h-4 w-4" />
									{t("manage")}
								</Link>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="hidden items-center gap-1 lg:flex">
					<Button
						variant="outline"
						size="sm"
						asChild
						className="min-h-11 flex-1"
						title={t("view")}
					>
						<Link href={`/plugins/${plugin.slug}`} aria-label={t("view")}>
							<Eye className="h-4 w-4" />
						</Link>
					</Button>
					<Button
						variant="outline"
						size="sm"
						asChild
						className="min-h-11 flex-1"
						title={t("versions")}
					>
						<Link
							href={`/plugins/${plugin.slug}/versions`}
							aria-label={t("versions")}
						>
							<GitBranch className="h-4 w-4" />
						</Link>
					</Button>
					<Button
						variant="outline"
						size="sm"
						asChild
						className="min-h-11 flex-1"
						title={t("manage")}
					>
						<Link
							href={`/my-plugins/${plugin.slug}/manage`}
							aria-label={t("manage")}
						>
							<Settings className="h-4 w-4" />
						</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
