"use client";

import { Bot, Download, ExternalLink, Shield, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { TelegramIcon } from "~/components/icons/telegram-icon";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { env } from "~/env";

interface TelegramBotIntegrationProps {
	pluginId: number;
	pluginName: string;
	telegramBotDeeplink?: string | null;
	price: number;
	onDownload?: () => void;
}

export function TelegramBotIntegration({
	pluginId,
	pluginName,
	telegramBotDeeplink,
	price,
	onDownload,
}: TelegramBotIntegrationProps) {
	const t = useTranslations("TelegramBotIntegration");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);

	const handleTelegramDownload = async () => {
		setIsDownloading(true);

		try {
			if (onDownload) {
				onDownload();
			}

			setIsDialogOpen(true);

			setTimeout(() => {
				if (telegramBotDeeplink) {
					window.open(telegramBotDeeplink, "_blank");
					toast.success(t("bot_opened"));
				} else {
					const botUsername =
						env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "exterastore_bot";
					const fallbackLink = `https://t.me/${botUsername}?start=plugin_${pluginId}`;
					window.open(fallbackLink, "_blank");
					toast.success(t("bot_opened"));
				}
			}, 500);
		} catch (error) {
			toast.error(t("bot_open_error"));
		} finally {
			setTimeout(() => setIsDownloading(false), 1000);
		}
	};

	return (
		<>
			<Card className="bot-integration-card">
				<CardHeader className="pb-3">
					<div className="flex items-center gap-2">
						<div className="rounded-lg bg-primary/10 p-2">
							<Bot className="telegram-pulse h-5 w-5 text-primary" />
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
					<div className="flex items-center justify-center">
						<Badge variant="outline" className="text-xs">
							<Shield className="mr-1 h-3 w-3" />
							{t("verified")}
						</Badge>
					</div>

					<Button
						onClick={handleTelegramDownload}
						disabled={isDownloading}
						className="w-full bg-red-600 text-white transition-colors hover:bg-red-700"
						size="lg"
					>
						{isDownloading ? (
							<>
								<div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
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

			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Bot className="h-5 w-5 text-primary" />
							{t("installation_via_telegram")}
						</DialogTitle>
						<DialogDescription>{t("follow_instructions")}</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-3 rounded-lg bg-muted/50 p-4">
							<div className="flex items-start gap-3">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
									1
								</div>
								<div>
									<p className="font-medium">{t("open_bot")}</p>
									<p className="text-muted-foreground text-sm">
										{t("bot_auto_open")}
									</p>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
									2
								</div>
								<div>
									<p className="font-medium">{t("press_start")}</p>
									<p className="text-muted-foreground text-sm">
										{t("bot_will_start_installation", { pluginName })}
									</p>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
									3
								</div>
								<div>
									<p className="font-medium">{t("follow_bot_instructions")}</p>
									<p className="text-muted-foreground text-sm">
										{t("bot_will_guide")}
									</p>
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
							<Shield className="h-4 w-4 text-blue-600" />
							<p className="text-blue-800 text-sm dark:text-blue-200">
								{t("plugins_verified")}
							</p>
						</div>

						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => setIsDialogOpen(false)}
								className="flex-1"
							>
								{t("close")}
							</Button>
							<Button
								onClick={() => {
									const botUsername =
										env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "exterastore_bot";
									const botLink =
										telegramBotDeeplink ||
										`https://t.me/${botUsername}?start=plugin_${pluginId}`;
									window.open(botLink, "_blank");
								}}
								className="flex-1"
							>
								<ExternalLink className="mr-2 h-4 w-4" />
								{t("open_bot_button")}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

export function BotIntegrationStatus({
	hasIntegration,
}: { hasIntegration: boolean }) {
	const t = useTranslations("TelegramBotIntegration");
	return (
		<div
			className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
				hasIntegration
					? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
					: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
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
		<Card className="bot-integration-card">
			<CardContent className="pt-6">
				<div className="space-y-4 text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
						<Bot className="telegram-bounce h-8 w-8 text-primary" />
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
