import { ArrowRight, Github, Rocket } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export function DeveloperCTA() {
	return (
		<section className="py-12 sm:py-16">
			<div className="container mx-auto px-4">
				<div className="mx-auto max-w-4xl">
					<div className="rounded-3xl border bg-foreground p-6 text-background shadow-xl sm:p-10 md:p-12">
						<div className="mx-auto max-w-3xl text-center">
							<div className="mb-5 inline-flex items-center gap-2 rounded-full bg-background/10 px-4 py-1.5 text-sm">
								<Rocket className="h-4 w-4" />
								<span className="font-medium">Для разработчиков</span>
							</div>

							<h2 className="font-bold text-3xl tracking-tight sm:text-5xl">
								Создайте то, чего вам не хватает
							</h2>

							<p className="mx-auto mt-4 max-w-2xl text-background/65 text-base sm:text-lg">
								Python API, документация и публикация в каталоге exteraGram.
							</p>

							<div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
								<Button asChild size="lg" className="group">
									<Link href="https://plugins.exteragram.app">
										Начать разработку
										<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
									</Link>
								</Button>
								<Button asChild size="lg" variant="secondary">
									<Link href="https://github.com/0niel/exteraStore">
										<Github className="mr-2 h-4 w-4" />
										GitHub
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
