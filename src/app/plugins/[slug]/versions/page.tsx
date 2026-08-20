import { ArrowLeft, Download, GitBranch, Star, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PluginVersions } from "~/components/plugin-versions";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/server";

interface PluginVersionsPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export default async function PluginVersionsPage({
	params,
}: PluginVersionsPageProps) {
	const t = await getTranslations("PluginVersionsPage");
	const { slug } = await params;
	const plugin = await api.plugins.getBySlug({ slug });

	if (!plugin) {
		notFound();
	}

	return (
		<div className="bg-background py-6 md:py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-8 animate-fade-up">
					<Link href={`/plugins/${slug}`}>
						<Button variant="ghost" className="mb-4 min-h-11 md:min-h-9">
							<ArrowLeft className="mr-2 h-4 w-4" />
							{t("back_to_plugin")}
						</Button>
					</Link>

					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h1 className="mb-2 text-balance font-bold text-3xl md:text-4xl">
								{plugin.name}
							</h1>
							<p className="mb-4 text-lg text-muted-foreground md:text-xl">
								{t("version_history_and_changes")}
							</p>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-sm">
								<span className="flex items-center gap-1">
									<User className="h-4 w-4" />
									{plugin.author}
								</span>
								<span className="flex items-center gap-1">
									<Download className="h-4 w-4" />
									{plugin.downloadCount} {t("downloads")}
								</span>
								<span className="flex items-center gap-1">
									<Star className="h-4 w-4 fill-warning text-warning" />
									{plugin.rating.toFixed(1)} ({plugin.ratingCount}{" "}
									{t("reviews")})
								</span>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Badge variant="outline" className="px-3 py-1 text-base">
								<GitBranch className="mr-1 h-4 w-4" />v{plugin.version}
							</Badge>
							<Badge variant="secondary">{plugin.category}</Badge>
						</div>
					</div>
				</div>

				<PluginVersions pluginSlug={slug} />
			</div>
		</div>
	);
}
