import { ArrowRight, Code, Search, Shield, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { SearchDialog } from "~/components/search-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

export function HeroSection() {
	const { data: stats } = api.plugins.getStats.useQuery();

	return (
		<section className="relative overflow-hidden border-b">
			<div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
			<div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

			<div className="container relative mx-auto px-4 py-20 sm:py-32">
				<div className="mx-auto max-w-4xl text-center">
					<div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-1.5 text-sm backdrop-blur-sm">
						<Sparkles className="h-4 w-4 text-yellow-500" />
						<span className="font-medium">Магазин плагинов для exteraGram</span>
					</div>

					<h1 className="mb-6 font-bold text-5xl tracking-tight sm:text-6xl md:text-7xl">
						Расширьте возможности
						<span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
							{" "}
							Telegram
						</span>
					</h1>

					<p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground sm:text-xl">
						Откройте для себя тысячи плагинов, созданных сообществом для самого
						мощного клиента Telegram
					</p>

					<div className="mx-auto mb-8 max-w-2xl">
						<SearchDialog
							trigger={
								<div className="group relative w-full cursor-pointer">
									<div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
									<div className="relative flex items-center gap-3 rounded-xl border bg-background/80 p-4 shadow-lg backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-xl">
										<Search className="h-5 w-5 text-muted-foreground" />
										<span className="flex-1 text-left text-muted-foreground">
											Найдите идеальный плагин...
										</span>
										<kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-muted-foreground text-xs opacity-100 sm:flex">
											<span className="text-xs">⌘</span>K
										</kbd>
									</div>
								</div>
							}
							placeholder="Поиск плагинов..."
						/>
					</div>

					<div className="flex flex-wrap items-center justify-center gap-4">
						<Link href="/plugins">
							<Button size="lg" className="group h-12 px-8">
								Каталог плагинов
								<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
							</Button>
						</Link>
						<Link href="/upload">
							<Button size="lg" variant="outline" className="h-12 px-8">
								Загрузить плагин
							</Button>
						</Link>
					</div>

					{stats && (
						<div className="mt-16 grid grid-cols-3 gap-8 border-t pt-8">
							<div>
								<div className="font-bold text-3xl text-primary">
									{stats.totalPlugins.toLocaleString()}
								</div>
								<div className="mt-1 text-muted-foreground text-sm">
									Плагинов
								</div>
							</div>
							<div>
								<div className="font-bold text-3xl text-primary">
									{stats.totalDownloads.toLocaleString()}
								</div>
								<div className="mt-1 text-muted-foreground text-sm">
									Загрузок
								</div>
							</div>
							<div>
								<div className="font-bold text-3xl text-primary">
									{stats.totalDevelopers.toLocaleString()}
								</div>
								<div className="mt-1 text-muted-foreground text-sm">
									Разработчиков
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
