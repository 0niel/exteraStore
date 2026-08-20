"use client";

import { Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";

export default function ErrorPage({
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const t = useTranslations("Errors");

	return (
		<div className="relative isolate flex min-h-[60dvh] items-center justify-center overflow-hidden px-4 py-12">
			<div className="grid-fade absolute inset-x-0 top-0 -z-10 h-full" />
			<div className="mx-auto max-w-xl text-center">
				<p className="font-bold text-[clamp(5rem,22vw,10rem)] text-gradient-red leading-none tracking-tighter">
					500
				</p>
				<h1 className="mt-4 text-balance font-bold text-2xl tracking-tight sm:text-4xl">
					{t("error_title")}
				</h1>
				<p className="mt-3 text-pretty text-muted-foreground">
					{t("error_description")}
				</p>
				<div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button onClick={reset} className="min-h-11">
						<RotateCcw />
						{t("retry")}
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
