"use client";

import { Blocks, Bot, Download, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { TelegramIcon } from "~/components/icons/telegram-icon";
import type { PluginDependencySummary } from "~/components/plugin-dependency-picker";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

interface TelegramBotIntegrationProps {
	dependencies?: PluginDependencySummary[];
	onRequestInstall: () => void;
	isDownloading?: boolean;
}

export function TelegramBotIntegration({
	dependencies = [],
	onRequestInstall,
	isDownloading = false,
}: TelegramBotIntegrationProps) {
	const t = useTranslations("TelegramBotIntegration");

	return (
		<Card className="gap-0 bg-primary/[0.07] py-0 sm:py-0">
			<CardHeader className="pb-3">
				<div className="flex items-center gap-2">
					<div className="rounded-xl bg-primary/10 p-2 text-primary">
						<Bot className="h-5 w-5 animate-pulse-dot text-primary" />
					</div>
					<div>
						<CardTitle className="text-lg">
							{t("download_via_telegram")}
						</CardTitle>
						<CardDescription>{t("fast_installation")}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{dependencies.length > 0 && (
					<div className="rounded-2xl bg-background/70 p-3">
						<div className="flex items-center gap-2 text-sm">
							<Blocks className="size-4 text-primary" />
							<span className="font-medium">
								{t("dependencies_required", {
									count: dependencies.length,
								})}
							</span>
						</div>
						<div className="mt-2 flex flex-wrap gap-1.5">
							{dependencies.map((dependency) => (
								<Link
									key={dependency.id}
									href={`/plugins/${dependency.slug}`}
									className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground text-xs transition-colors hover:bg-primary/10 hover:text-primary"
								>
									{dependency.name}
								</Link>
							))}
						</div>
					</div>
				)}
				<div className="flex items-center justify-center">
					<Badge variant="secondary" className="bg-background/70 text-xs">
						<Shield className="mr-1 h-3 w-3" />
						{t("verified")}
					</Badge>
				</div>

				<Button
					onClick={onRequestInstall}
					disabled={isDownloading}
					className="press-scale min-h-11 w-full"
					size="lg"
				>
					{isDownloading ? (
						<>
							<div className="mr-2 h-4 w-4 animate-spin rounded-full border-primary-foreground border-b-2" />
							{t("opening_bot")}
						</>
					) : (
						<>
							<TelegramIcon className="mr-2 h-4 w-4" />
							{t("download_in_telegram")}
						</>
					)}
				</Button>

				<div className="text-center text-muted-foreground text-xs">
					{t("redirect_notice")}
				</div>
			</CardContent>
		</Card>
	);
}

export function BotIntegrationStatus({
	hasIntegration,
}: {
	hasIntegration: boolean;
}) {
	const t = useTranslations("TelegramBotIntegration");
	return (
		<div
			className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
				hasIntegration
					? "bg-success/15 text-success"
					: "bg-muted text-muted-foreground"
			}`}
		>
			<Bot className="h-3 w-3" />
			<span>
				{hasIntegration ? t("telegram_integration") : t("direct_download")}
			</span>
		</div>
	);
}

export function BotIntegrationPromo() {
	const t = useTranslations("TelegramBotIntegration");
	return (
		<Card className="bg-primary/[0.07]">
			<CardContent className="pt-6">
				<div className="space-y-4 text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<Bot className="h-8 w-8 animate-pulse-dot" />
					</div>
					<div>
						<h3 className="mb-2 font-semibold text-lg">{t("title")}</h3>
						<p className="text-muted-foreground text-sm">
							{t("promo_description")}
						</p>
					</div>
					<div className="flex flex-wrap justify-center gap-2">
						<Badge variant="secondary" className="text-xs">
							<Shield className="mr-1 h-3 w-3" />
							{t("secure")}
						</Badge>
						<Badge variant="secondary" className="text-xs">
							<Zap className="mr-1 h-3 w-3" />
							{t("fast")}
						</Badge>
						<Badge variant="secondary" className="text-xs">
							<Download className="mr-1 h-3 w-3" />
							{t("simple")}
						</Badge>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
