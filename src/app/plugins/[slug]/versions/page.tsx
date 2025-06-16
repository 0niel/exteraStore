import { ArrowLeft, Download, GitBranch, Star, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PluginVersions } from "~/components/plugin-versions";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/server";

interface PluginVersionsPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export default async function PluginVersionsPage({
	params,
}: PluginVersionsPageProps) {
	const { slug } = await params;
	const plugin = await api.plugins.getBySlug({ slug });

	if (!plugin) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-background py-8">
			<div className="container mx-auto max-w-6xl px-4">
				<div className="mb-8">
					<Link href={`/plugins/${slug}`}>
						<Button variant="ghost" className="mb-4">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Назад к плагину
						</Button>
					</Link>

					<div className="flex items-start justify-between">
						<div>
							<h1 className="mb-2 font-bold text-4xl">{plugin.name}</h1>
							<p className="mb-4 text-muted-foreground text-xl">
								История версий и изменений
							</p>
							<div className="flex items-center gap-4 text-muted-foreground text-sm">
								<span className="flex items-center gap-1">
									<User className="h-4 w-4" />
									{plugin.author}
								</span>
								<span className="flex items-center gap-1">
									<Download className="h-4 w-4" />
									{plugin.downloadCount} загрузок
								</span>
								<span className="flex items-center gap-1">
									<Star className="h-4 w-4" />
									{plugin.rating.toFixed(1)} ({plugin.ratingCount} отзывов)
								</span>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Badge variant="outline" className="px-3 py-1 text-lg">
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
