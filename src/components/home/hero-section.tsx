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

			<div className="container relative mx-auto px-3 py-8 sm:px-4 sm:py-12 md:py-20">
				<div className="flex flex-col items-center space-y-4 text-center sm:space-y-6 md:space-y-8">
					<div className="max-w-4xl space-y-3 sm:space-y-4 md:space-y-6">
						<div className="space-y-2 sm:space-y-3 md:space-y-4">
							<h1 className="font-bold text-2xl text-primary leading-tight sm:text-3xl md:text-5xl lg:text-7xl">
								exteraStore
							</h1>
							<p className="mx-auto max-w-3xl text-muted-foreground text-sm leading-relaxed sm:text-base md:text-xl lg:text-2xl">
								Откройте новые возможности Telegram. Создавайте, делитесь и
								устанавливайте плагины для{" "}
								<span className="font-semibold text-primary">exteraGram</span> —
								самого мощного клиента Telegram.
							</p>
						</div>
					</div>

					<div className="w-full max-w-3xl space-y-3 sm:space-y-4 md:space-y-6">
						<SearchDialog
							trigger={
								<div className="relative w-full cursor-pointer">
									<Search className="-translate-y-1/2 absolute top-1/2 left-2 h-3.5 w-3.5 text-muted-foreground sm:left-3 sm:h-4 sm:w-4 md:left-4 md:h-5 md:w-5" />
									<div className="flex h-10 items-center truncate rounded-lg border-2 border-border/50 bg-background/80 pr-12 pl-7 text-muted-foreground text-xs shadow-lg backdrop-blur-sm transition-colors hover:border-primary/50 sm:h-12 sm:pr-16 sm:pl-9 sm:text-sm md:h-14 md:pr-24 md:pl-12 md:text-base lg:h-16 lg:text-lg">
										<span className="truncate">
											Найдите свой идеальный плагин...
										</span>
									</div>
									<Button
										size="sm"
										className="-translate-y-1/2 absolute top-1/2 right-1.5 h-7 bg-red-600 px-2 text-[10px] text-white transition-colors hover:bg-red-700 sm:right-2 sm:h-8 sm:px-3 sm:text-xs md:h-10 md:px-4 md:text-sm lg:h-12"
									>
										<Search className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5 md:mr-2 md:h-4 md:w-4 lg:h-5 lg:w-5" />
										<span className="xs:inline hidden">Поиск</span>
									</Button>
								</div>
							}
							placeholder="Найдите свой идеальный плагин..."
						/>

						<div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-3">
							<Link href="/categories/ui-themes">
								<Badge
									variant="secondary"
									className="cursor-pointer px-1.5 py-0.5 text-[10px] transition-all duration-200 hover:bg-primary hover:text-primary-foreground sm:px-2 sm:py-1 sm:text-xs md:px-4 md:py-2 md:text-sm"
								>
									🎨 UI и темы
								</Badge>
							</Link>
							<Link href="/categories/utilities">
								<Badge
									variant="secondary"
									className="cursor-pointer px-1.5 py-0.5 text-[10px] transition-all duration-200 hover:bg-primary hover:text-primary-foreground sm:px-2 sm:py-1 sm:text-xs md:px-4 md:py-2 md:text-sm"
								>
									🔧 Утилиты
								</Badge>
							</Link>
							<Link href="/categories/media">
								<Badge
									variant="secondary"
									className="cursor-pointer px-1.5 py-0.5 text-[10px] transition-all duration-200 hover:bg-primary hover:text-primary-foreground sm:px-2 sm:py-1 sm:text-xs md:px-4 md:py-2 md:text-sm"
								>
									🎵 Медиа
								</Badge>
							</Link>
							<Link href="/categories/security">
								<Badge
									variant="secondary"
									className="cursor-pointer px-1.5 py-0.5 text-[10px] transition-all duration-200 hover:bg-primary hover:text-primary-foreground sm:px-2 sm:py-1 sm:text-xs md:px-4 md:py-2 md:text-sm"
								>
									🔒 Безопасность
								</Badge>
							</Link>
							<Link href="/categories/bots">
								<Badge
									variant="secondary"
									className="cursor-pointer px-1.5 py-0.5 text-[10px] transition-all duration-200 hover:bg-primary hover:text-primary-foreground sm:px-2 sm:py-1 sm:text-xs md:px-4 md:py-2 md:text-sm"
								>
									🤖 Боты
								</Badge>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
