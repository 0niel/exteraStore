"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PageHeader } from "~/components/page-header";
import { PluginCard } from "~/components/plugin-card";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

function FavoritesSkeleton() {
	return (
		<div
			className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
			aria-hidden="true"
		>
			{[0, 1, 2, 3, 4, 5].map((i) => (
				<div key={i} className="space-y-4 rounded-xl border bg-card p-5">
					<div className="flex items-center gap-3">
						<div className="skeleton-shimmer h-12 w-12 shrink-0 rounded-lg" />
						<div className="w-full space-y-2">
							<div className="skeleton-shimmer h-4 w-2/3 rounded-md" />
							<div className="skeleton-shimmer h-3 w-1/3 rounded-md" />
						</div>
					</div>
					<div className="space-y-2">
						<div className="skeleton-shimmer h-3 w-full rounded-md" />
						<div className="skeleton-shimmer h-3 w-4/5 rounded-md" />
					</div>
					<div className="flex gap-2">
						<div className="skeleton-shimmer h-6 w-16 rounded-full" />
						<div className="skeleton-shimmer h-6 w-16 rounded-full" />
					</div>
					<div className="skeleton-shimmer h-11 w-full rounded-lg" />
				</div>
			))}
		</div>
	);
}

export default function FavoritesPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const t = useTranslations("FavoritesPage");
	const reduceMotion = useReducedMotion();
	const queryClient = useQueryClient();
	const utils = api.useUtils();
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);

	const { data: favoritesData, isLoading } =
		api.favorites.getUserFavorites.useQuery(
			{ page, limit: 20 },
			{ enabled: !!session?.user?.id },
		);

	useEffect(() => {
		return queryClient.getMutationCache().subscribe((event) => {
			if (
				event.type === "updated" &&
				event.mutation.state.status === "success"
			) {
				const key = event.mutation.options.mutationKey?.flat(2) ?? [];
				if (key.includes("favorites") && key.includes("toggle")) {
					void utils.favorites.getUserFavorites.invalidate();
				}
			}
		});
	}, [queryClient, utils]);

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

	const filteredFavorites =
		favoritesData?.favorites.filter(
			(plugin) =>
				plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				plugin.description.toLowerCase().includes(searchQuery.toLowerCase()),
		) || [];

	return (
		<div className="bg-background py-6 sm:py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<PageHeader
					badge={t("badge")}
					title={t("title")}
					description={t("subtitle")}
					icon={Heart}
					align="left"
				>
					{!isLoading && (
						<span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-sm">
							<Heart className="h-4 w-4 fill-primary text-primary" />
							<span className="font-mono font-semibold">
								{favoritesData?.pagination?.total ??
									favoritesData?.favorites.length ??
									0}
							</span>
						</span>
					)}
				</PageHeader>

				<div
					className="mb-6 animate-fade-up"
					style={{ animationDelay: "80ms" }}
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
					<FavoritesSkeleton />
				) : filteredFavorites.length === 0 ? (
					<EmptyState
						icon="❤️"
						title={searchQuery ? t("not_found_title") : t("empty_title")}
						description={
							searchQuery ? t("not_found_description") : t("empty_description")
						}
						actionLabel={!searchQuery ? t("browse_catalog") : undefined}
						onAction={!searchQuery ? () => router.push("/plugins") : undefined}
					/>
				) : (
					<>
						<motion.div
							layout={!reduceMotion}
							className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
						>
							<AnimatePresence mode="popLayout" initial={false}>
								{filteredFavorites.map((plugin, index) => (
									<motion.div
										key={plugin.id}
										layout={!reduceMotion}
										initial={
											reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }
										}
										animate={{
											opacity: 1,
											y: 0,
											scale: 1,
											transition: {
												duration: 0.4,
												delay: reduceMotion ? 0 : Math.min(index, 8) * 0.05,
												ease: [0.16, 1, 0.3, 1],
											},
										}}
										exit={
											reduceMotion
												? undefined
												: {
														opacity: 0,
														scale: 0.92,
														transition: { duration: 0.25 },
													}
										}
									>
										<PluginCard plugin={plugin} />
									</motion.div>
								))}
							</AnimatePresence>
						</motion.div>

						{favoritesData && favoritesData.pagination.totalPages > 1 && (
							<div className="mt-8 flex flex-wrap items-center justify-center gap-2">
								<Button
									variant="outline"
									onClick={() => setPage(page - 1)}
									disabled={page === 1}
								>
									{t("prev_page")}
								</Button>
								<span className="flex items-center px-4 text-muted-foreground text-sm">
									{t("page_of", {
										page,
										total: favoritesData.pagination.totalPages,
									})}
								</span>
								<Button
									variant="outline"
									onClick={() => setPage(page + 1)}
									disabled={page === favoritesData.pagination.totalPages}
								>
									{t("next_page")}
								</Button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
