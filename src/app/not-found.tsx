"use client";

import { Home, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";

export default function NotFound() {
	const t = useTranslations("Errors");

	return (
		<div className="relative isolate flex min-h-[60dvh] items-center justify-center overflow-hidden px-4 py-12">
			<div className="grid-fade absolute inset-x-0 top-0 -z-10 h-full" />
			<div className="absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
			<div className="mx-auto max-w-xl animate-fade-up text-center">
				<p className="font-bold text-[clamp(6rem,28vw,12rem)] text-gradient-red leading-none tracking-tighter">
					404
				</p>
				<h1 className="mt-4 text-balance font-bold text-2xl tracking-tight sm:text-4xl">
					{t("notfound_title")}
				</h1>
				<p className="mt-3 text-pretty text-muted-foreground">
					{t("notfound_description")}
				</p>
				<div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button asChild className="min-h-11">
						<Link href="/plugins">
							<Search />
							{t("open_catalog")}
						</Link>
					</Button>
					<Button asChild variant="outline" className="min-h-11">
						<Link href="/">
							<Home />
							{t("go_home")}
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
