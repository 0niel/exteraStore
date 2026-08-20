"use client";

import { Bell, MessageSquare, RefreshCw, Shield } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";

type SettingsFlags = {
	enableTelegramNotifications: boolean;
	enablePluginUpdates: boolean;
	enableSecurityAlerts: boolean;
	enableReviewNotifications: boolean;
};

const DEFAULT_FLAGS: SettingsFlags = {
	enableTelegramNotifications: true,
	enablePluginUpdates: true,
	enableSecurityAlerts: true,
	enableReviewNotifications: false,
};

export function NotificationSettings() {
	const t = useTranslations("NotificationSettings");
	const { data: session } = useSession();
	const [flags, setFlags] = useState<SettingsFlags>(DEFAULT_FLAGS);

	const utils = api.useUtils();
	const { data: settings, isLoading } =
		api.pluginPipeline.getNotificationSettings.useQuery(undefined, {
			enabled: !!session,
		});

	useEffect(() => {
		if (settings) {
			setFlags({
				enableTelegramNotifications: settings.enableTelegramNotifications,
				enablePluginUpdates: settings.enablePluginUpdates,
				enableSecurityAlerts: settings.enableSecurityAlerts,
				enableReviewNotifications: settings.enableReviewNotifications,
			});
		}
	}, [settings]);

	const updateMutation =
		api.pluginPipeline.updateNotificationSettings.useMutation({
			onSuccess: () => {
				toast.success(t("saved"));
				void utils.pluginPipeline.getNotificationSettings.invalidate();
			},
			onError: (error, variables) => {
				setFlags((prev) => {
					const reverted = { ...prev };
					for (const key of Object.keys(variables) as (keyof SettingsFlags)[]) {
						reverted[key] = !prev[key];
					}
					return reverted;
				});
				toast.error(t("save_error", { error: error.message }));
			},
		});

	const handleToggle = (key: keyof SettingsFlags, enabled: boolean) => {
		setFlags((prev) => ({ ...prev, [key]: enabled }));
		updateMutation.mutate({ [key]: enabled });
	};

	if (!session) {
		return null;
	}

	const rows: Array<{
		key: keyof SettingsFlags;
		icon: typeof Bell;
		label: string;
		description: string;
		disabled?: boolean;
	}> = [
		{
			key: "enableTelegramNotifications",
			icon: Bell,
			label: t("telegram_label"),
			description: t("telegram_description"),
		},
		{
			key: "enablePluginUpdates",
			icon: RefreshCw,
			label: t("updates_label"),
			description: t("updates_description"),
			disabled: !flags.enableTelegramNotifications,
		},
		{
			key: "enableSecurityAlerts",
			icon: Shield,
			label: t("security_label"),
			description: t("security_description"),
			disabled: !flags.enableTelegramNotifications,
		},
		{
			key: "enableReviewNotifications",
			icon: MessageSquare,
			label: t("reviews_label"),
			description: t("reviews_description"),
			disabled: !flags.enableTelegramNotifications,
		},
	];

	return (
		<Card>
			<CardHeader>
				<span className="eyebrow">{t("eyebrow")}</span>
				<CardTitle className="flex items-center gap-2">
					<span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<Bell className="h-4 w-4" />
					</span>
					{t("title")}
				</CardTitle>
				<CardDescription>{t("description")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{isLoading ? (
					<div className="space-y-4">
						{[0, 1, 2, 3].map((index) => (
							<div
								key={index}
								className="flex min-h-11 items-center justify-between gap-4"
							>
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-40" />
									<Skeleton className="h-3 w-56" />
								</div>
								<Skeleton className="h-5 w-9 rounded-full" />
							</div>
						))}
					</div>
				) : (
					rows.map((row) => (
						<div
							key={row.key}
							className="flex min-h-11 items-center justify-between gap-4"
						>
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
										<row.icon className="h-3.5 w-3.5" />
									</span>
									<span className="font-medium">{row.label}</span>
								</div>
								<p className="text-muted-foreground text-sm">
									{row.description}
								</p>
							</div>
							<Switch
								checked={flags[row.key]}
								onCheckedChange={(checked: boolean) =>
									handleToggle(row.key, checked)
								}
								disabled={row.disabled}
								aria-label={row.label}
							/>
						</div>
					))
				)}
			</CardContent>
		</Card>
	);
}
