"use client";

import { AlertTriangle, ArrowDown, Blocks, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { TelegramIcon } from "~/components/icons/telegram-icon";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { env } from "~/env";
import { api } from "~/trpc/react";

type PluginInstallDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pluginId: number;
	pluginName: string;
	pluginSlug: string;
	telegramBotDeeplink?: string | null;
	onDownload: () => void;
};

export function PluginInstallDialog({
	open,
	onOpenChange,
	pluginId,
	pluginName,
	pluginSlug,
	telegramBotDeeplink,
	onDownload,
}: PluginInstallDialogProps) {
	const t = useTranslations("PluginDependencies");
	const {
		data: installPlan,
		isLoading,
		isError,
		refetch,
	} = api.plugins.getInstallPlan.useQuery(
		{ pluginId },
		{ enabled: open, retry: 1, staleTime: 60_000 },
	);
	const { data: serverDeepLink } =
		api.telegramNotifications.createDeepLink.useQuery(
			{ pluginSlug },
			{ enabled: open, retry: false, staleTime: 60_000 },
		);

	const dependencyCount = Math.max((installPlan?.length ?? 1) - 1, 0);
	const resolveBotLink = () => {
		if (serverDeepLink?.deepLink) return serverDeepLink.deepLink;
		if (telegramBotDeeplink) return telegramBotDeeplink;
		const botUsername =
			env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "exterastore_bot";
		return `https://t.me/${botUsername}?start=plugin_${pluginId}`;
	};

	const handleInstall = () => {
		if (!installPlan || isError) return;
		const botWindow = window.open(resolveBotLink(), "_blank");
		if (!botWindow) {
			toast.error(t("bot_open_error"));
			return;
		}
		botWindow.opener = null;
		onDownload();
		toast.success(t("telegram_opened"), {
			description:
				dependencyCount > 0
					? t("telegram_opened_dependencies", { count: dependencyCount })
					: t("telegram_opened_single"),
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[min(90dvh,48rem)] overflow-y-auto border-0 shadow-none sm:max-w-lg">
				<DialogHeader>
					<div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<Blocks className="size-5" />
					</div>
					<DialogTitle>{t("install_title", { name: pluginName })}</DialogTitle>
					<DialogDescription>
						{dependencyCount > 0
							? t("install_description_multiple", {
									count: dependencyCount,
								})
							: t("install_description_single")}
					</DialogDescription>
				</DialogHeader>

				{isLoading && (
					<div className="space-y-2 py-2" role="status">
						<span className="sr-only">{t("loading_plan")}</span>
						{[0, 1, 2].map((item) => (
							<div key={item} className="skeleton-shimmer h-16 rounded-2xl" />
						))}
					</div>
				)}

				{isError && (
					<div className="rounded-2xl bg-destructive/10 p-4 text-destructive">
						<div className="flex items-start gap-3">
							<AlertTriangle className="mt-0.5 size-5 shrink-0" />
							<div className="min-w-0 flex-1">
								<p className="font-medium">{t("plan_error")}</p>
								<p className="mt-1 text-sm opacity-80">
									{t("plan_error_description")}
								</p>
								<Button
									variant="outline"
									size="sm"
									className="mt-3"
									onClick={() => void refetch()}
								>
									{t("retry")}
								</Button>
							</div>
						</div>
					</div>
				)}

				{installPlan && (
					<div className="space-y-1 py-2">
						{installPlan.map((plugin, index) => (
							<div key={plugin.id}>
								<div className="flex items-center gap-3 rounded-2xl bg-muted/55 p-3">
									<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background font-bold font-mono text-primary text-xs">
										{String(plugin.installOrder).padStart(2, "0")}
									</span>
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium text-sm">
											{plugin.name}
										</p>
										<p className="truncate text-muted-foreground text-xs">
											{plugin.isRequestedPlugin
												? t("requested_plugin")
												: t("required_dependency")}{" "}
											· v{plugin.version}
										</p>
									</div>
								</div>
								{index < installPlan.length - 1 && (
									<div className="flex h-5 items-center justify-center text-primary">
										<ArrowDown className="size-4" />
									</div>
								)}
							</div>
						))}
					</div>
				)}

				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button
						variant="ghost"
						className="min-h-11"
						onClick={() => onOpenChange(false)}
					>
						{t("cancel")}
					</Button>
					<Button
						className="min-h-11"
						onClick={handleInstall}
						disabled={isLoading || isError || !installPlan}
					>
						<TelegramIcon className="mr-2 size-4" />
						{dependencyCount > 0
							? t("install_all", { count: installPlan?.length ?? 1 })
							: t("open_telegram")}
						<ExternalLink className="ml-2 size-4" />
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
