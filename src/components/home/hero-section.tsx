"use client";

import { ArrowRight, Code, Search, Shield, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SearchDialog } from "~/components/search-dialog";
import { AnimatedBackground } from "~/components/home/animated-background";
import { FloatingElements } from "~/components/home/floating-elements";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useEffect, useState } from "react";

function CountUpAnimation({ value }: { value: number }) {
	const [count, setCount] = useState(0);

	useEffect(() => {
		const duration = 2000;
		const steps = 60;
		const increment = value / steps;
		let current = 0;

		const timer = setInterval(() => {
			current += increment;
			if (current >= value) {
				setCount(value);
				clearInterval(timer);
			} else {
				setCount(Math.floor(current));
			}
		}, duration / steps);

		return () => clearInterval(timer);
	}, [value]);

	return <>{count.toLocaleString()}</>;
}

export function HeroSection() {
	const { data: stats } = api.plugins.getStats.useQuery();

	return (
		<section className="relative overflow-hidden border-b">
			<AnimatedBackground />
			<FloatingElements />

			<div className="container relative mx-auto px-4 py-20 sm:py-32">
				<div className="mx-auto max-w-4xl text-center">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="mb-8 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-1.5 text-sm backdrop-blur-sm"
					>
						<Sparkles className="h-4 w-4 text-yellow-500" />
						<span className="font-medium">Магазин плагинов для exteraGram</span>
					</motion.div>

					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="mb-6 font-bold text-5xl tracking-tight sm:text-6xl md:text-7xl"
					>
						Расширьте возможности
						<motion.span
							initial={{ opacity: 0, backgroundPosition: "0% 50%" }}
							animate={{ 
								opacity: 1,
								backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
							}}
							transition={{
								opacity: { duration: 0.5, delay: 0.2 },
								backgroundPosition: { duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }
							}}
							className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-[length:200%_auto] bg-clip-text text-transparent"
						>
							{" "}
							Telegram
						</motion.span>
					</motion.h1>

					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground sm:text-xl"
					>
						Откройте для себя тысячи плагинов, созданных сообществом для самого
						мощного клиента Telegram
					</motion.p>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
						className="mx-auto mb-8 max-w-2xl"
					>
						<SearchDialog
							trigger={
								<div className="group relative w-full cursor-pointer">
									<motion.div
										className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 blur-xl"
										animate={{
											opacity: [0, 0.3, 0],
											scale: [0.8, 1.1, 0.8],
										}}
										transition={{
											duration: 4,
											repeat: Number.POSITIVE_INFINITY,
											ease: "easeInOut",
										}}
									/>
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
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.4 }}
						className="flex flex-wrap items-center justify-center gap-4"
					>
						<Link href="/plugins">
							<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
								<Button size="lg" className="group h-12 px-8">
									Каталог плагинов
									<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Button>
							</motion.div>
						</Link>
						<Link href="/upload">
							<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
								<Button size="lg" variant="outline" className="h-12 px-8">
									Загрузить плагин
								</Button>
							</motion.div>
						</Link>
					</motion.div>

					{stats && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.5 }}
							className="mt-16 grid grid-cols-3 gap-8 border-t pt-8"
						>
							{[
								{ value: stats.totalPlugins, label: "Плагинов", delay: 0.6 },
								{ value: stats.totalDownloads, label: "Загрузок", delay: 0.7 },
								{ value: stats.totalDevelopers, label: "Разработчиков", delay: 0.8 },
							].map((stat, index) => (
								<motion.div
									key={index}
									initial={{ opacity: 0, scale: 0.5 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{
										duration: 0.5,
										delay: stat.delay,
										type: "spring",
										stiffness: 200,
									}}
								>
									<motion.div
										className="font-bold text-3xl text-primary"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ duration: 1, delay: stat.delay }}
									>
										<CountUpAnimation value={stat.value} />
									</motion.div>
									<div className="mt-1 text-muted-foreground text-sm">
										{stat.label}
									</div>
								</motion.div>
							))}
						</motion.div>
					)}
				</div>
			</div>
		</section>
	);
}
