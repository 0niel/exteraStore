import { Bot, Code, Star, Zap } from "lucide-react";
import Link from "next/link";
import { TelegramIcon } from "~/components/icons/telegram-icon";
import { Button } from "~/components/ui/button";

export function DeveloperCTA() {
	return (
		<section className="relative overflow-hidden bg-muted/20 py-24">
			<div className="container relative mx-auto px-4 text-center">
				<div className="mx-auto max-w-4xl space-y-12">
					<div className="space-y-6">
						<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-medium text-primary text-sm">
							<Code className="h-4 w-4" />
							Для разработчиков
						</div>
						<h2 className="font-bold text-4xl text-red-600 leading-tight sm:text-6xl">
							Создайте свой плагин
						</h2>
						<p className="mx-auto max-w-3xl text-muted-foreground text-xl leading-relaxed sm:text-2xl">
							Присоединяйтесь к сообществу разработчиков и создавайте плагины
							для exteraGram
						</p>
					</div>

					<div className="grid grid-cols-1 gap-8 md:grid-cols-3">
						<div className="space-y-4 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
								<Code className="h-6 w-6 text-blue-600" />
							</div>
							<h3 className="font-semibold text-lg">Простая разработка</h3>
							<p className="text-muted-foreground text-sm">
								Используйте Python или Xposed для создания мощных плагинов
							</p>
						</div>
						<div className="space-y-4 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20">
								<Zap className="h-6 w-6 text-green-600" />
							</div>
							<h3 className="font-semibold text-lg">Быстрая публикация</h3>
							<p className="text-muted-foreground text-sm">
								Опубликуйте свой плагин за несколько минут
							</p>
						</div>
						<div className="space-y-4 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20">
								<Star className="h-6 w-6 text-purple-600" />
							</div>
							<h3 className="font-semibold text-lg">Большая аудитория</h3>
							<p className="text-muted-foreground text-sm">
								Тысячи пользователей увидят ваш плагин
							</p>
						</div>
					</div>

					<div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
						<Button
							size="lg"
							className="bg-red-600 px-10 py-4 text-lg text-white shadow-xl transition-colors hover:bg-red-700"
						>
							<Code className="mr-2 h-5 w-5" />
							Начать разработку
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="border-2 px-10 py-4 text-lg hover:bg-primary/5"
						>
							<Bot className="mr-2 h-5 w-5" />
							Документация
						</Button>
					</div>

					<div className="border-border/50 border-t pt-8">
						<p className="mb-4 text-muted-foreground">
							Нужна помощь? Присоединяйтесь к exteraGram сообществу
						</p>
						<div className="flex flex-wrap justify-center gap-4">
							<Button variant="ghost" size="sm" asChild>
								<Link href="https://t.me/exteraForum">
									<TelegramIcon className="mr-2 h-4 w-4" />
									Telegram чат
								</Link>
							</Button>
							<Button variant="ghost" size="sm" asChild>
								<Link href="https://github.com/exteraSquad/exteraGram-plugins">
									<Code className="mr-2 h-4 w-4" />
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
