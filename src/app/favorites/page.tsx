"use client";

import { Heart, Loader2, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type plugins as Plugin } from "~/server/db/schema";
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

export default function FavoritesPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);

	const { data: favoritesData, isLoading } =
		api.favorites.getUserFavorites.useQuery(
			{ page, limit: 20 },
			{ enabled: !!session?.user?.id },
		);

	if (!session) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle>Требуется авторизация</CardTitle>
						<CardDescription>
							Войдите в систему для просмотра избранных плагинов
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							onClick={() => router.push("/auth/signin")}
							className="w-full"
						>
							Войти
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const filteredFavorites =
		favoritesData?.favorites.filter(
			(plugin: typeof Plugin.$inferSelect) =>
				plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				plugin.description.toLowerCase().includes(searchQuery.toLowerCase()),
		) || [];

	return (
		<div className="min-h-screen bg-background py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h1 className="mb-2 flex items-center gap-3 font-bold text-4xl">
							<Heart className="h-8 w-8 fill-red-500 text-red-500" />
							Избранные плагины
						</h1>
						<p className="text-muted-foreground text-xl">
							Ваша коллекция любимых плагинов
						</p>
					</div>
				</div>

				<div className="mb-6">
					<div className="relative max-w-md">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
						<Input
							placeholder="Поиск среди избранных..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin" />
						<span className="ml-2">Загрузка избранных плагинов...</span>
					</div>
				) : filteredFavorites.length === 0 ? (
					<EmptyState
						icon="❤️"
						title={searchQuery ? "Ничего не найдено" : "Нет избранных плагинов"}
						description={
							searchQuery
								? "Попробуйте изменить поисковый запрос"
								: "Добавьте плагины в избранное, нажав на ❤️ на странице плагина"
						}
						actionLabel={!searchQuery ? "Просмотреть каталог" : undefined}
						onAction={!searchQuery ? () => router.push("/plugins") : undefined}
					/>
				) : (
					<>
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
							{filteredFavorites.map((plugin: typeof Plugin.$inferSelect) => (
								<PluginCard key={plugin.id} plugin={plugin} />
							))}
						</div>

						{favoritesData && favoritesData.pagination.totalPages > 1 && (
							<div className="mt-8 flex justify-center gap-2">
								<Button
									variant="outline"
									onClick={() => setPage(page - 1)}
									disabled={page === 1}
								>
									Предыдущая
								</Button>
								<span className="flex items-center px-4">
									Страница {page} из {favoritesData.pagination.totalPages}
								</span>
								<Button
									variant="outline"
									onClick={() => setPage(page + 1)}
									disabled={page === favoritesData.pagination.totalPages}
								>
									Следующая
								</Button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
