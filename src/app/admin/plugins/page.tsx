"use client";

import {
	CheckCircle,
	Download,
	Loader2,
	Star,
	Trash2,
	User,
	XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { env } from "~/env";
import { api } from "~/trpc/react";

const ADMINS = (env.NEXT_PUBLIC_INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

export default function AdminPluginsPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const t = useTranslations("AdminPlugins");
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<"pending" | "approved" | "rejected">(
		"pending",
	);

	const isAdmin =
		session?.user?.role === "admin" ||
		(session?.user?.telegramUsername &&
			ADMINS.includes(session.user.telegramUsername.toLowerCase()));

	useEffect(() => {
		if (session && !isAdmin) {
			router.push("/");
		}
	}, [session, router, isAdmin]);

	if (!session || !isAdmin) {
		return null;
	}

	const { data, refetch, isFetching } = api.adminPlugins.getPlugins.useQuery({
		page: 1,
		limit: 50,
		status,
		search,
	});

	const approve = api.adminPlugins.approve.useMutation({
		onSuccess: () => refetch(),
	});
	const reject = api.adminPlugins.reject.useMutation({
		onSuccess: () => refetch(),
	});
	const remove = api.adminPlugins.delete.useMutation({
		onSuccess: () => refetch(),
	});

	const action = (id: number, type: "approve" | "reject" | "delete") => {
		if (type === "approve") approve.mutate({ id });
		if (type === "reject") reject.mutate({ id });
		if (type === "delete") remove.mutate({ id });
	};

	return (
		<div className="py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<h1 className="mb-6 font-bold text-4xl">{t("title")}</h1>

				<Input
					placeholder={t("search_placeholder")}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="mb-6"
				/>

				<Tabs defaultValue="pending" onValueChange={(v) => setStatus(v as any)}>
					<TabsList>
						<TabsTrigger value="pending">{t("pending")}</TabsTrigger>
						<TabsTrigger value="approved">{t("approved")}</TabsTrigger>
						<TabsTrigger value="rejected">{t("rejected")}</TabsTrigger>
					</TabsList>

					{(["pending", "approved", "rejected"] as const).map((tab) => (
						<TabsContent key={tab} value={tab} className="mt-6">
							{isFetching ? (
								<div className="flex items-center justify-center p-8">
									<Loader2 className="h-8 w-8 animate-spin" />
								</div>
							) : !data?.plugins.length ? (
								<EmptyState
									icon="📦"
									title={`Нет плагинов со статусом ${status}`}
									description="Плагины с выбранным статусом не найдены"
								/>
							) : (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{data?.plugins.map((plugin: any) => (
										<Card key={plugin.id} className="group">
											<CardHeader>
												<CardTitle>{plugin.name}</CardTitle>
												<CardDescription className="line-clamp-2">
													{plugin.shortDescription || plugin.description}
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-4">
												<div className="flex items-center justify-between text-muted-foreground text-sm">
													<span className="flex items-center gap-1">
														<User className="h-4 w-4" />
														{plugin.author}
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
												<Badge variant="outline">
													{t(plugin.status as any)}
												</Badge>
												<div className="flex flex-wrap gap-2">
													{tab !== "approved" && (
														<Button
															size="sm"
															onClick={() => action(plugin.id, "approve")}
															disabled={approve.isPending}
														>
															{approve.isPending ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<CheckCircle className="mr-1 h-4 w-4" />
															)}
															{t("approve")}
														</Button>
													)}
													{tab !== "rejected" && (
														<Button
															variant="secondary"
															size="sm"
															onClick={() => action(plugin.id, "reject")}
															disabled={reject.isPending}
														>
															{reject.isPending ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<XCircle className="mr-1 h-4 w-4" />
															)}
															{t("reject")}
														</Button>
													)}
													<Button
														variant="destructive"
														size="sm"
														onClick={() => action(plugin.id, "delete")}
														disabled={remove.isPending}
													>
														{remove.isPending ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<Trash2 className="mr-1 h-4 w-4" />
														)}
														{t("delete")}
													</Button>
													<Button variant="outline" size="sm" asChild>
														<Link href={`/plugins/${plugin.slug}`}>View</Link>
													</Button>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							)}
						</TabsContent>
					))}
				</Tabs>
			</div>
		</div>
	);
}
