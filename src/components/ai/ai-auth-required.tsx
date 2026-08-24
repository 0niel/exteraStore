"use client";

import { LockKeyhole, LogIn, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function AiAuthRequired({ compact = false }: { compact?: boolean }) {
	const t = useTranslations("AI");

	return (
		<section
			className={cn(
				"relative overflow-hidden rounded-3xl bg-surface px-5 py-8 text-center sm:px-8",
				compact ? "mx-auto max-w-3xl" : "min-h-72",
			)}
		>
			<div className="dot-grid absolute inset-0 opacity-35" />
			<div className="relative mx-auto flex h-full max-w-lg flex-col items-center justify-center">
				<span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
					<LockKeyhole className="size-6" />
				</span>
				<div className="mb-3 inline-flex items-center gap-2 font-mono font-semibold text-primary text-xs uppercase tracking-[0.18em]">
					<Sparkles className="size-4" />
					{t("auth_badge")}
				</div>
				<h2 className="font-bold text-2xl tracking-tight">{t("auth_title")}</h2>
				<p className="mt-3 text-muted-foreground leading-relaxed">
					{t("auth_description")}
				</p>
				<Button asChild className="mt-6 min-h-11 gap-2 px-6">
					<Link href="/auth/signin">
						<LogIn className="size-4" />
						{t("auth_action")}
					</Link>
				</Button>
			</div>
		</section>
	);
}
