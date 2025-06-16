import { Bot, Code, Search, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { TelegramIcon } from "~/components/icons/telegram-icon";
import { SearchDialog } from "~/components/search-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function HeroSection() {
	return (
		<section className="relative overflow-hidden">
			<div className="absolute inset-0 bg-muted/10" />

			<div className="container relative mx-auto px-4 py-20">
				<div className="flex flex-col items-center space-y-12 text-center">
					<div className="max-w-4xl space-y-6">
						<div className="space-y-4">
							<h1 className="font-bold text-5xl text-primary leading-tight sm:text-7xl">
								exteraStore
							</h1>
							<p className="mx-auto max-w-3xl text-muted-foreground text-xl leading-relaxed sm:text-2xl">
								Откройте новые возможности Telegram. Создавайте, делитесь и
								устанавливайте плагины для{" "}
								<span className="font-semibold text-primary">exteraGram</span> —
								самого мощного клиента Telegram.
							</p>
						</div>
					</div>

					<div className="w-full max-w-3xl space-y-6">
						<SearchDialog
							trigger={
								<div className="relative w-full cursor-pointer">
									<Search className="-translate-y-1/2 absolute top-1/2 left-4 h-6 w-6 transform text-muted-foreground" />
									<div className="flex h-16 items-center rounded-lg border-2 border-border/50 bg-background/80 pr-32 pl-12 text-lg text-muted-foreground shadow-lg backdrop-blur-sm transition-colors hover:border-primary/50">
										Откройте магию Telegram — найдите свой идеальный плагин...
									</div>
									<Button
										size="lg"
										className="-translate-y-1/2 absolute top-1/2 right-2 transform bg-red-600 text-white transition-colors hover:bg-red-700"
									>
										<Search className="mr-2 h-5 w-5" />
										Поиск
									</Button>
								</div>
							}
							placeholder="Откройте магию Telegram — найдите свой идеальный плагин..."
						/>

						<div className="flex flex-wrap justify-center gap-3">
							<Badge
								variant="secondary"
								className="cursor-pointer px-4 py-2 text-sm transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
							>
								🎨 UI и темы
							</Badge>
							<Badge
								variant="secondary"
								className="cursor-pointer px-4 py-2 text-sm transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
							>
								🔧 Утилиты
							</Badge>
							<Badge
								variant="secondary"
								className="cursor-pointer px-4 py-2 text-sm transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
							>
								🎵 Медиа
							</Badge>
							<Badge
								variant="secondary"
								className="cursor-pointer px-4 py-2 text-sm transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
							>
								🔒 Безопасность
							</Badge>
							<Badge
								variant="secondary"
								className="cursor-pointer px-4 py-2 text-sm transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
							>
								🤖 Боты
							</Badge>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
