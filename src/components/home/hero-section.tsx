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

			<div className="container relative mx-auto px-3 py-10 sm:px-4 sm:py-16 md:py-20">
				<div className="flex flex-col items-center space-y-6 text-center sm:space-y-12">
					<div className="max-w-4xl space-y-4 sm:space-y-6">
						<div className="space-y-3 sm:space-y-4">
							<h1 className="font-bold text-3xl text-primary leading-tight sm:text-5xl md:text-7xl">
								exteraStore
							</h1>
							<p className="mx-auto max-w-3xl text-base text-muted-foreground leading-relaxed sm:text-xl md:text-2xl">
								Откройте новые возможности Telegram. Создавайте, делитесь и
								устанавливайте плагины для{" "}
								<span className="font-semibold text-primary">exteraGram</span> —
								самого мощного клиента Telegram.
							</p>
						</div>
					</div>

					<div className="w-full max-w-3xl space-y-4 sm:space-y-6">
						<SearchDialog
							trigger={
								<div className="relative w-full cursor-pointer">
									<Search className="-translate-y-1/2 absolute top-1/2 left-2 h-4 w-4 transform text-muted-foreground sm:left-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
									<div className="flex h-12 items-center truncate rounded-lg border-2 border-border/50 bg-background/80 pr-16 pl-8 text-muted-foreground text-sm shadow-lg backdrop-blur-sm transition-colors hover:border-primary/50 sm:h-14 sm:pr-24 sm:pl-12 sm:text-base md:h-16 md:pr-32 md:text-lg">
										<span className="truncate">
											Найдите свой идеальный плагин...
										</span>
									</div>
									<Button
										size="sm"
										className="-translate-y-1/2 absolute top-1/2 right-2 h-8 transform bg-red-600 text-white text-xs transition-colors hover:bg-red-700 sm:h-10 sm:text-sm md:h-12"
									>
										<Search className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4 md:h-5 md:w-5" />
										<span className="xs:inline hidden">Поиск</span>
									</Button>
								</div>
							}
							placeholder="Найдите свой идеальный плагин..."
						/>

						<div className="flex flex-wrap justify-center gap-2 sm:gap-3">
							<Badge
								variant="secondary"
								className="cursor-pointer px-2 py-1 text-xs transition-all duration-200 hover:bg-primary hover:text-primary-foreground sm:px-4 sm:py-2 sm:text-sm"
							>
								🎨 UI и темы
							</Badge>
							<Badge
								variant="secondary"
								className="cursor-pointer px-2 py-1 text-xs transition-all duration-200 hover:bg-primary hover:text-primary-foreground sm:px-4 sm:py-2 sm:text-sm"
							>
								🔧 Утилиты
							</Badge>
							<Badge
								variant="secondary"
								className="cursor-pointer px-2 py-1 text-xs transition-all duration-200 hover:bg-primary hover:text-primary-foreground sm:px-4 sm:py-2 sm:text-sm"
							>
								🎵 Медиа
							</Badge>
							<Badge
								variant="secondary"
								className="cursor-pointer px-2 py-1 text-xs transition-all duration-200 hover:bg-primary hover:text-primary-foreground sm:px-4 sm:py-2 sm:text-sm"
							>
								🔒 Безопасность
							</Badge>
							<Badge
								variant="secondary"
								className="cursor-pointer px-2 py-1 text-xs transition-all duration-200 hover:bg-primary hover:text-primary-foreground sm:px-4 sm:py-2 sm:text-sm"
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
