import { ArrowRight, Code, Github, Rocket, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export function DeveloperCTA() {
	return (
		<section className="relative overflow-hidden py-24 sm:py-32">
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
			<div className="container relative mx-auto px-4">
				<div className="mx-auto max-w-4xl">
					<div className="rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 p-8 sm:p-12 md:p-16">
						<div className="mx-auto max-w-3xl text-center">
							<div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm">
								<Rocket className="h-4 w-4" />
								<span className="font-medium">Для разработчиков</span>
							</div>

							<h2 className="mb-4 font-bold text-4xl tracking-tight sm:text-5xl">
								Создавайте плагины для миллионов
							</h2>

							<p className="mb-12 text-lg text-muted-foreground sm:text-xl">
								Присоединяйтесь к растущему сообществу разработчиков и
								создавайте инновационные плагины для exteraGram
							</p>

							<div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
								<div className="rounded-2xl bg-background/50 p-6 backdrop-blur-sm">
									<div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
										<Code className="h-6 w-6 text-primary" />
									</div>
									<h3 className="mb-2 font-semibold text-lg">Простой API</h3>
									<p className="text-muted-foreground text-sm">
										Интуитивный API на Python с полной документацией
									</p>
								</div>

								<div className="rounded-2xl bg-background/50 p-6 backdrop-blur-sm">
									<div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
										<Users className="h-6 w-6 text-primary" />
									</div>
									<h3 className="mb-2 font-semibold text-lg">
										Большое сообщество
									</h3>
									<p className="text-muted-foreground text-sm">
										Активное сообщество готово помочь и поддержать
									</p>
								</div>

								<div className="rounded-2xl bg-background/50 p-6 backdrop-blur-sm">
									<div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
										<Rocket className="h-6 w-6 text-primary" />
									</div>
									<h3 className="mb-2 font-semibold text-lg">Быстрый старт</h3>
									<p className="text-muted-foreground text-sm">
										От идеи до публикации за считанные минуты
									</p>
								</div>
							</div>

							<div className="flex flex-wrap items-center justify-center gap-4">
								<Link href="http://plugins.exteragram.app">
									<Button size="lg" className="group h-12 px-8">
										Начать разработку
										<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
									</Button>
								</Link>
								<Link href="https://github.com/0niel/exteraStore">
									<Button size="lg" variant="outline" className="h-12 px-8">
										<Github className="mr-2 h-4 w-4" />
										GitHub
									</Button>
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
