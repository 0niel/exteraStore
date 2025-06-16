"use client";

import {
	Calendar,
	Download,
	ExternalLink,
	Github,
	Globe,
	Linkedin,
	Mail,
	Package,
	Star,
	Twitter,
	User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { PluginCard } from "~/components/plugin-card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

interface DeveloperProfilePageProps {
	params: Promise<{
		id: string;
	}>;
}

export default async function DeveloperProfilePage({
	params,
}: DeveloperProfilePageProps) {
	const t = useTranslations("DeveloperProfile");
	const [pluginsPage, setPluginsPage] = useState(1);
	const { id } = await params;

	const { data: developerData, isLoading } =
		api.developers.getDeveloper.useQuery({
			id: id,
		});

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background py-8">
				<div className="container mx-auto max-w-6xl px-4">
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
						<div className="lg:col-span-1">
							<Card>
								<CardHeader className="text-center">
									<Skeleton className="mx-auto mb-4 h-24 w-24 rounded-full" />
									<Skeleton className="mx-auto mb-2 h-6 w-32" />
									<Skeleton className="mx-auto h-4 w-24" />
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-3/4" />
										<Skeleton className="h-4 w-1/2" />
									</div>
								</CardContent>
							</Card>
						</div>
						<div className="lg:col-span-2">
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								{Array.from({ length: 4 }).map((_, i) => (
									<Skeleton key={i} className="h-64" />
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!developerData) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle>{t("not_found")}</CardTitle>
						<CardDescription>{t("not_found_description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild className="w-full">
							<Link href="/developers">{t("back_to_developers")}</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const { developer, plugins, stats } = developerData;

	return (
		<div className="min-h-screen bg-background py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
					<div className="lg:col-span-1">
						<Card className="sticky top-8">
							<CardHeader className="text-center">
								<Avatar className="mx-auto mb-4 h-24 w-24">
									<AvatarImage
										src={developer.image || undefined}
										alt={developer.name || ""}
									/>
									<AvatarFallback className="text-2xl">
										{developer.name?.slice(0, 2).toUpperCase() || "??"}
									</AvatarFallback>
								</Avatar>
								<CardTitle className="text-xl">
									{developer.name || t("anonymous")}
								</CardTitle>
								{developer.isVerified && (
									<Badge variant="secondary" className="mx-auto w-fit">
										{t("verified")}
									</Badge>
								)}
								{developer.telegramUsername && (
									<p className="text-blue-600 text-sm">
										@{developer.telegramUsername}
									</p>
								)}
							</CardHeader>

							<CardContent className="space-y-6">
								{developer.bio && (
									<div>
										<h3 className="mb-2 font-semibold">{t("about")}</h3>
										<p className="text-muted-foreground text-sm">
											{developer.bio}
										</p>
									</div>
								)}

								<div>
									<h3 className="mb-3 font-semibold">{t("stats")}</h3>
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Package className="h-4 w-4 text-muted-foreground" />
												<span className="text-sm">{t("total_plugins")}</span>
											</div>
											<span className="font-medium">{stats.totalPlugins}</span>
										</div>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Download className="h-4 w-4 text-muted-foreground" />
												<span className="text-sm">{t("total_downloads")}</span>
											</div>
											<span className="font-medium">
												{stats.totalDownloads || 0}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Star className="h-4 w-4 text-muted-foreground" />
												<span className="text-sm">{t("average_rating")}</span>
											</div>
											<span className="font-medium">
												{stats.averageRating?.toFixed(1) || "0.0"}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Calendar className="h-4 w-4 text-muted-foreground" />
												<span className="text-sm">{t("member_since")}</span>
											</div>
											<span className="font-medium">
												{new Date(developer.createdAt).getFullYear()}
											</span>
										</div>
									</div>
								</div>

								{(developer.website ||
									developer.githubUsername ||
									(developer.links &&
										JSON.parse(developer.links).length > 0)) && (
									<div>
										<h3 className="mb-3 font-semibold">{t("links")}</h3>
										<div className="flex flex-wrap gap-2">
											{developer.website && (
												<Button variant="outline" size="sm" asChild>
													<a
														href={developer.website}
														target="_blank"
														rel="noopener noreferrer"
													>
														<Globe className="mr-2 h-4 w-4" />
														{t("website")}
													</a>
												</Button>
											)}
											{developer.githubUsername && (
												<Button variant="outline" size="sm" asChild>
													<a
														href={`https://github.com/${developer.githubUsername}`}
														target="_blank"
														rel="noopener noreferrer"
													>
														<Github className="mr-2 h-4 w-4" />
														GitHub
													</a>
												</Button>
											)}
											{developer.links &&
												JSON.parse(developer.links).map(
													(link: any, index: number) => (
														<Button
															key={index}
															variant="outline"
															size="sm"
															asChild
														>
															<a
																href={link.url}
																target="_blank"
																rel="noopener noreferrer"
															>
																<ExternalLink className="mr-2 h-4 w-4" />
																{link.title}
															</a>
														</Button>
													),
												)}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					<div className="lg:col-span-2">
						<div className="mb-6">
							<h2 className="mb-2 font-bold text-2xl">
								{t("plugins_by")} {developer.name}
							</h2>
							<p className="text-muted-foreground">
								{t("plugins_count", { count: plugins.length })}
							</p>
						</div>

						{plugins.length === 0 ? (
							<EmptyState
								icon="📦"
								title={t("no_plugins")}
								description={t("no_plugins_description")}
							/>
						) : (
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								{plugins.map((plugin: any) => (
									<PluginCard key={plugin.id} plugin={plugin} />
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
