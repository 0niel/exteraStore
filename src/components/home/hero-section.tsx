"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	ArrowRight,
	Braces,
	Infinity as InfinityIcon,
	Search,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { SearchDialog } from "~/components/search-dialog";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

export function HeroSection() {
	const { data: stats } = api.plugins.getStats.useQuery();
	const reduceMotion = useReducedMotion();
	const reveal = {
		initial: reduceMotion ? false : { opacity: 0, y: 14 },
		animate: { opacity: 1, y: 0 },
	};

	return (
		<section className="relative isolate overflow-hidden border-b">
			<div className="absolute -top-32 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
			<div className="container mx-auto px-4 py-12 sm:py-18 lg:py-24">
				<div className="mx-auto max-w-5xl text-center">
					<motion.div
						{...reveal}
						transition={{ duration: 0.35 }}
						className="mb-5 inline-flex min-h-9 items-center gap-2 rounded-full border bg-background/80 px-3 font-medium text-sm shadow-sm backdrop-blur"
					>
						<span className="size-2 rounded-full bg-primary" />
						Официальный каталог сообщества exteraGram
					</motion.div>

					<motion.h1
						{...reveal}
						transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.05 }}
						className="text-balance font-bold text-[clamp(2.35rem,8vw,5.5rem)] leading-[0.98] tracking-[-0.055em]"
					>
						Ваш Telegram.
						<span className="block text-primary">Без ограничений.</span>
					</motion.h1>

					<motion.p
						{...reveal}
						transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.1 }}
						className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground leading-relaxed sm:text-xl"
					>
						Находите проверенные плагины, меняйте интерфейс и автоматизируйте
						рутину в самом гибком клиенте Telegram.
					</motion.p>

					<motion.div
						{...reveal}
						transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.15 }}
						className="mx-auto mt-8 max-w-2xl"
					>
						<SearchDialog
							trigger={
								<button
									type="button"
									className="group flex min-h-16 w-full touch-manipulation items-center gap-3 rounded-2xl border bg-background px-4 text-left shadow-black/5 shadow-lg transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-5"
									aria-label="Поиск плагинов"
								>
									<Search className="size-5 shrink-0 text-primary" />
									<span className="min-w-0 flex-1 truncate text-muted-foreground">
										Что хотите добавить в Telegram?
									</span>
									<kbd className="pointer-events-none hidden rounded-md border bg-muted px-2 py-1 font-mono text-muted-foreground text-xs sm:block">
										⌘ K
									</kbd>
								</button>
							}
							placeholder="Поиск плагинов..."
						/>
					</motion.div>

					<motion.div
						{...reveal}
						transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.2 }}
						className="mt-4 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
					>
						<Button asChild size="lg" className="group w-full sm:w-auto">
							<Link href="/plugins">
								Смотреть каталог
								<ArrowRight className="transition-transform group-hover:translate-x-0.5" />
							</Link>
						</Button>
						<Button
							asChild
							size="lg"
							variant="outline"
							className="w-full sm:w-auto"
						>
							<Link href="/collections">Открыть подборки</Link>
						</Button>
					</motion.div>

					<div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
						{[
							{
								icon: Braces,
								title: "Python",
								text: "Простой API и быстрый старт",
							},
							{
								icon: ShieldCheck,
								title: "Xposed",
								text: "Глубокая настройка клиента",
							},
							{
								icon: InfinityIcon,
								title: "Limitless",
								text: "Свобода без лишнего шума",
							},
						].map(({ icon: Icon, title, text }) => (
							<div
								key={title}
								className="flex min-h-24 items-center gap-3 rounded-2xl border bg-card/70 p-4"
							>
								<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<Icon className="size-5" />
								</div>
								<div>
									<div className="font-semibold">{title}</div>
									<div className="text-muted-foreground text-sm">{text}</div>
								</div>
							</div>
						))}
					</div>

					{stats && (
						<p className="mt-6 text-muted-foreground text-sm">
							{stats.totalPlugins.toLocaleString()} плагинов ·{" "}
							{stats.totalDownloads.toLocaleString()} загрузок ·{" "}
							{stats.totalDevelopers.toLocaleString()} разработчиков
						</p>
					)}
				</div>
			</div>
		</section>
	);
}
