import { Bot, Code, Star, Zap } from "lucide-react";
import Link from "next/link";
import { TelegramIcon } from "~/components/icons/telegram-icon";
import { Button } from "~/components/ui/button";

export function DeveloperCTA() {
	return (
		<section className="relative overflow-hidden bg-muted/20 py-12 sm:py-16 md:py-24">
			<div className="container relative mx-auto px-4 text-center">
				<div className="mx-auto max-w-4xl space-y-8 sm:space-y-12">
					<div className="space-y-3 sm:space-y-6">
						<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-medium text-primary text-sm">
							<Code className="h-4 w-4" />
							Для разработчиков
						</div>
						<h2 className="font-bold text-3xl text-red-600 leading-tight sm:text-4xl md:text-6xl">
							Создайте свой плагин
						</h2>
						<p className="mx-auto max-w-3xl text-base text-muted-foreground leading-relaxed sm:text-xl md:text-2xl">
							Присоединяйтесь к сообществу разработчиков и создавайте плагины
							для exteraGram
						</p>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 md:gap-8">
						<div className="space-y-3 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm sm:space-y-4 sm:p-6">
							<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 sm:h-12 sm:w-12">
								<Code className="h-5 w-5 text-blue-600 sm:h-6 sm:w-6" />
							</div>
							<h3 className="font-semibold text-base sm:text-lg">
								Простая разработка
							</h3>
							<p className="text-muted-foreground text-xs sm:text-sm">
								Используйте Python или Xposed для создания мощных плагинов
							</p>
						</div>
						<div className="space-y-3 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm sm:space-y-4 sm:p-6">
							<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20 sm:h-12 sm:w-12">
								<Zap className="h-5 w-5 text-green-600 sm:h-6 sm:w-6" />
							</div>
							<h3 className="font-semibold text-base sm:text-lg">
								Быстрая публикация
							</h3>
							<p className="text-muted-foreground text-xs sm:text-sm">
								Опубликуйте свой плагин за несколько минут
							</p>
						</div>
						<div className="space-y-3 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm sm:space-y-4 sm:p-6">
							<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 sm:h-12 sm:w-12">
								<Star className="h-5 w-5 text-purple-600 sm:h-6 sm:w-6" />
							</div>
							<h3 className="font-semibold text-base sm:text-lg">
								Большая аудитория
							</h3>
							<p className="text-muted-foreground text-xs sm:text-sm">
								Тысячи пользователей увидят ваш плагин
							</p>
						</div>
					</div>

					<div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
						<Button
							size="lg"
							className="w-full bg-red-600 px-6 py-3 text-base text-white shadow-xl transition-colors hover:bg-red-700 sm:w-auto sm:px-10 sm:py-4 sm:text-lg"
							asChild
						>
							<Link href="/docs/development">
								<Code className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
								Начать разработку
							</Link>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="w-full border-2 px-6 py-3 text-base hover:bg-primary/5 sm:w-auto sm:px-10 sm:py-4 sm:text-lg"
							asChild
						>
							<Link href="/docs">
								<Bot className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
								Документация
							</Link>
						</Button>
					</div>

					<div className="border-border/50 border-t pt-6 sm:pt-8">
						<p className="mb-4 text-muted-foreground text-sm sm:text-base">
							Нужна помощь? Присоединяйтесь к exteraGram сообществу
						</p>
						<div className="flex flex-wrap justify-center gap-3 sm:gap-4">
							<Button
								variant="ghost"
								size="sm"
								className="h-8 text-xs sm:h-9 sm:text-sm"
								asChild
							>
								<Link href="https://t.me/exteraForum">
									<TelegramIcon className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
									Telegram чат
								</Link>
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 text-xs sm:h-9 sm:text-sm"
								asChild
							>
								<Link href="https://github.com/exteraSquad/exteraGram-plugins">
									<Code className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
									GitHub
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
