"use client";

import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import {
	ArrowRight,
	Braces,
	Infinity as InfinityIcon,
	Search,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { SearchDialog } from "~/components/search-dialog";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

function StatCounter({ value, label }: { value: number; label: string }) {
	const locale = useLocale();
	const reduceMotion = useReducedMotion();
	const ref = useRef<HTMLSpanElement>(null);
	const inView = useInView(ref, { once: true, margin: "-40px" });
	const [display, setDisplay] = useState(0);

	useEffect(() => {
		if (!inView) return;
		if (reduceMotion) {
			setDisplay(value);
			return;
		}
		const controls = animate(0, value, {
			duration: 1.4,
			ease: [0.16, 1, 0.3, 1],
			onUpdate: (latest) => setDisplay(Math.round(latest)),
		});
		return () => controls.stop();
	}, [inView, value, reduceMotion]);

	return (
		<div className="flex flex-col items-center gap-1">
			<span
				ref={ref}
				className="font-bold text-3xl tabular-nums tracking-tight sm:text-4xl"
			>
				{display.toLocaleString(locale)}
			</span>
			<span className="text-muted-foreground text-sm">{label}</span>
		</div>
	);
}

export function HeroSection() {
	const t = useTranslations("Home");
	const { data: stats } = api.plugins.getStats.useQuery();
	const reduceMotion = useReducedMotion();
	const reveal = {
		initial: reduceMotion ? false : { opacity: 0, y: 14 },
		animate: { opacity: 1, y: 0 },
	};

	const features = [
		{
			icon: Braces,
			title: t("hero.featurePythonTitle"),
			text: t("hero.featurePythonText"),
		},
		{
			icon: ShieldCheck,
			title: t("hero.featureXposedTitle"),
			text: t("hero.featureXposedText"),
		},
		{
			icon: InfinityIcon,
			title: t("hero.featureLimitlessTitle"),
			text: t("hero.featureLimitlessText"),
		},
	];

	const tags = [
		t("hero.tagThemes"),
		t("hero.tagAutomation"),
		t("hero.tagPrivacy"),
		t("hero.tagInterface"),
		t("hero.tagTools"),
		t("hero.tagMedia"),
		t("hero.tagBots"),
		t("hero.tagProductivity"),
	];

	return (
		<section className="relative isolate overflow-hidden border-b">
			<div className="grid-fade absolute inset-x-0 top-0 -z-10 h-[38rem]" />
			<div className="absolute -top-32 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
			<div className="container mx-auto px-4 pt-14 pb-10 sm:pt-20 lg:pt-28">
				<div className="mx-auto max-w-5xl text-center">
					<motion.div
						{...reveal}
						transition={{ duration: 0.35 }}
						className="mb-5 inline-flex min-h-9 items-center gap-2 rounded-full border bg-background/80 px-3 font-medium text-sm shadow-sm backdrop-blur"
					>
						<span className="size-2 animate-pulse-dot rounded-full bg-primary" />
						{t("hero.badge")}
					</motion.div>

					<motion.h1
						{...reveal}
						transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.05 }}
						className="text-balance font-bold text-[clamp(2.35rem,8vw,5.5rem)] leading-[0.98] tracking-[-0.055em]"
					>
						{t("hero.titleLine1")}
						<span className="block text-gradient-red">
							{t("hero.titleLine2")}
						</span>
					</motion.h1>

					<motion.p
						{...reveal}
						transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.1 }}
						className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground leading-relaxed sm:text-xl"
					>
						{t("hero.subtitle")}
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
									aria-label={t("hero.searchAria")}
								>
									<Search className="size-5 shrink-0 text-primary" />
									<span className="min-w-0 flex-1 truncate text-muted-foreground">
										{t("hero.searchPlaceholder")}
									</span>
									<kbd className="pointer-events-none hidden rounded-md border bg-muted px-2 py-1 font-mono text-muted-foreground text-xs sm:block">
										⌘ K
									</kbd>
								</button>
							}
							placeholder={t("hero.searchDialogPlaceholder")}
						/>
					</motion.div>

					<motion.div
						{...reveal}
						transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.2 }}
						className="mt-4 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
					>
						<Button asChild size="lg" className="group w-full sm:w-auto">
							<Link href="/plugins">
								{t("hero.browseCatalog")}
								<ArrowRight className="transition-transform group-hover:translate-x-0.5" />
							</Link>
						</Button>
						<Button
							asChild
							size="lg"
							variant="outline"
							className="w-full sm:w-auto"
						>
							<Link href="/collections">{t("hero.openCollections")}</Link>
						</Button>
					</motion.div>

					<div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
						{features.map(({ icon: Icon, title, text }) => (
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
						<div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4 border-t pt-8">
							<StatCounter
								value={stats.totalPlugins}
								label={t("hero.statsPlugins")}
							/>
							<StatCounter
								value={stats.totalDownloads}
								label={t("hero.statsDownloads")}
							/>
							<StatCounter
								value={stats.totalDevelopers}
								label={t("hero.statsDevelopers")}
							/>
						</div>
					)}
				</div>
			</div>

			<div className="relative border-t py-4 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
				<div className="flex w-max animate-marquee gap-3">
					{[...tags, ...tags].map((tag, index) => (
						<span
							key={`${tag}-${index}`}
							className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border bg-card/70 px-4 py-1.5 font-medium text-muted-foreground text-sm"
						>
							<span className="size-1.5 rounded-full bg-primary" />
							{tag}
						</span>
					))}
				</div>
			</div>
		</section>
	);
}
