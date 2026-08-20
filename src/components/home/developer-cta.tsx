"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";

export function DeveloperCTA() {
	const t = useTranslations("Home");
	const reduceMotion = useReducedMotion();

	return (
		<section className="py-16 sm:py-24">
			<div className="container mx-auto px-4">
				<motion.div
					initial={reduceMotion ? false : { opacity: 0, y: 24 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
					className="mx-auto max-w-4xl"
				>
					<div className="relative overflow-hidden rounded-3xl bg-contrast p-6 text-contrast-foreground shadow-xl sm:p-10 md:p-12">
						<div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
						<div className="relative mx-auto max-w-3xl text-center">
							<div className="mb-5 inline-flex min-h-9 items-center gap-2 rounded-full border border-contrast-foreground/15 px-4 text-sm">
								<span className="size-2 animate-pulse-dot rounded-full bg-primary" />
								<span className="font-medium">{t("developer.eyebrow")}</span>
							</div>

							<h2 className="text-balance font-bold text-3xl tracking-tight sm:text-5xl">
								{t("developer.title")}
							</h2>

							<p className="mx-auto mt-4 max-w-2xl text-base text-contrast-foreground/65 sm:text-lg">
								{t("developer.description")}
							</p>

							<div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
								<Button asChild size="lg" className="group">
									<Link href="https://plugins.exteragram.app">
										{t("developer.start")}
										<ArrowRight className="transition-transform group-hover:translate-x-1" />
									</Link>
								</Button>
								<Button
									asChild
									size="lg"
									variant="outline"
									className="border-contrast-foreground/20 bg-transparent text-contrast-foreground hover:bg-contrast-foreground/10 hover:text-contrast-foreground"
								>
									<Link href="https://github.com/0niel/exteraStore">
										<Github />
										{t("developer.github")}
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
