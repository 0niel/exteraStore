"use client";

import {
	Download,
	Edit,
	Eye,
	GitBranch,
	Plus,
	Search,
	Settings,
	Star,
	Trash2,
	Upload,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { plugins as Plugin } from "~/server/db/schema";
import { api } from "~/trpc/react";

export default function MyPluginsPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const t = useTranslations("MyPluginsPage");
	const [searchQuery, setSearchQuery] = useState("");

	const { data: myPlugins, isLoading } = api.plugins.getByAuthor.useQuery(
		{ authorId: session?.user?.id || "" },
		{ enabled: !!session?.user?.id },
	);

	if (!session) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle>Требуется авторизация</CardTitle>
						<CardDescription>
							Войдите в систему для управления плагинами
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

	return (
		<div className="min-h-screen bg-background py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h1 className="mb-2 font-bold text-4xl">Мои плагины</h1>
						<p className="text-muted-foreground text-xl">
							Управляйте своими плагинами и отслеживайте статистику
						</p>
					</div>
					<Button
						asChild
						className="bg-primary text-primary-foreground hover:bg-primary/90"
					>
						<Link href="/upload">
							<Plus className="mr-2 h-4 w-4" />
							Загрузить новый плагин
						</Link>
					</Button>
				</div>

				<div className="mb-6">
					<div className="relative max-w-md">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
						<Input
							placeholder="Поиск среди ваших плагинов..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
				</div>

				{isLoading ? (
					<div className="py-12 text-center">
						<p className="text-muted-foreground">Загрузка плагинов...</p>
					</div>
				) : (
					<Tabs defaultValue="published" className="space-y-6">
						<TabsList>
							<TabsTrigger
								value="published"
								className="flex items-center gap-2"
							>
								Опубликованные ({publishedPlugins.length})
							</TabsTrigger>
							<TabsTrigger value="pending" className="flex items-center gap-2">
								На модерации ({pendingPlugins.length})
							</TabsTrigger>
							<TabsTrigger value="rejected" className="flex items-center gap-2">
								Отклоненные ({rejectedPlugins.length})
							</TabsTrigger>
						</TabsList>

						<TabsContent value="published">
							{publishedPlugins.length === 0 ? (
								<EmptyState
									icon="📤"
									title="Нет опубликованных плагинов"
									description="Загрузите свой первый плагин и поделитесь им с сообществом"
									actionLabel="Загрузить плагин"
									onAction={() => (window.location.href = "/upload")}
								/>
							) : (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{publishedPlugins.map(
										(plugin: typeof Plugin.$inferSelect) => (
											<PluginCard key={plugin.id} plugin={plugin} />
										),
									)}
								</div>
							)}
						</TabsContent>

						<TabsContent value="pending">
							{pendingPlugins.length === 0 ? (
								<EmptyState
									icon="⏳"
									title="Нет плагинов на модерации"
									description="Здесь будут отображаться плагины, ожидающие проверки"
								/>
							) : (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{pendingPlugins.map((plugin: typeof Plugin.$inferSelect) => (
										<PluginCard key={plugin.id} plugin={plugin} />
									))}
								</div>
							)}
						</TabsContent>

						<TabsContent value="rejected">
							{rejectedPlugins.length === 0 ? (
								<EmptyState
									icon="✅"
									title="Нет отклоненных плагинов"
									description="Отлично! У вас нет отклоненных плагинов"
								/>
							) : (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{rejectedPlugins.map((plugin: typeof Plugin.$inferSelect) => (
										<PluginCard key={plugin.id} plugin={plugin} />
									))}
								</div>
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
	const getStatusColor = (status: string) => {
		switch (status) {
			case "approved":
				return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
			case "pending":
				return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
			case "rejected":
				return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "approved":
				return "Опубликован";
			case "pending":
				return "На модерации";
			case "rejected":
				return "Отклонен";
			default:
				return "Неизвестно";
		}
	};

	return (
		<Card className="group transition-all duration-200 hover:shadow-lg">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<CardTitle className="mb-1 text-lg">{plugin.name}</CardTitle>
						<CardDescription className="line-clamp-2">
							{plugin.shortDescription || plugin.description}
						</CardDescription>
					</div>
					<Badge className={getStatusColor(plugin.status)}>
						{getStatusText(plugin.status)}
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
						{plugin.downloadCount}
					</span>
					<span className="flex items-center gap-1">
						<Star className="h-4 w-4" />
						{plugin.rating.toFixed(1)}
					</span>
				</div>

				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" asChild className="flex-1">
						<Link href={`/plugins/${plugin.slug}`}>
							<Eye className="mr-1 h-4 w-4" />
							{t("view")}
						</Link>
					</Button>
					<Button variant="outline" size="sm" asChild>
						<Link href={`/plugins/${plugin.slug}/versions`}>
							<GitBranch className="mr-1 h-4 w-4" />
							{t("versions")}
						</Link>
					</Button>
					<Button variant="outline" size="sm" asChild>
						<Link href={`/my-plugins/${plugin.slug}/manage`}>
							<Settings className="mr-1 h-4 w-4" />
							{t("manage")}
						</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
