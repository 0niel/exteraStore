"use client";

import {
	Bell,
	BellOff,
	MessageSquare,
	RefreshCw,
	Settings,
	Shield,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";

interface PluginSubscriptionProps {
	pluginId: number;
	pluginName: string;
}

export function PluginSubscription({
	pluginId,
	pluginName,
}: PluginSubscriptionProps) {
	const t = useTranslations("PluginSubscription");
	const { data: session } = useSession();
	const [subscriptions, setSubscriptions] = useState({
		updates: false,
		reviews: false,
		security_alerts: false,
	});

	const utils = api.useUtils();

	const { data: settings } =
		api.pluginPipeline.getNotificationSettings.useQuery(undefined, {
			enabled: !!session,
		});

	const { data: currentSubscriptions } =
		api.pluginPipeline.getSubscriptions.useQuery(
			{ pluginId },
			{ enabled: !!session },
		);

	useEffect(() => {
		if (currentSubscriptions) {
			setSubscriptions(currentSubscriptions);
		}
	}, [currentSubscriptions]);

	const subscribeMutation = api.pluginPipeline.subscribe.useMutation({
		onSuccess: () => {
			toast.success(t("subscription_created"));
			void utils.pluginPipeline.getSubscriptions.invalidate({ pluginId });
		},
		onError: (error) => {
			toast.error(t("subscription_error", { error: error.message }));
		},
	});

	const unsubscribeMutation = api.pluginPipeline.unsubscribe.useMutation({
		onSuccess: () => {
			toast.success(t("subscription_canceled"));
			void utils.pluginPipeline.getSubscriptions.invalidate({ pluginId });
		},
		onError: (error) => {
			toast.error(t("unsubscribe_error", { error: error.message }));
		},
	});

	const handleSubscriptionToggle = async (
		type: keyof typeof subscriptions,
		enabled: boolean,
	) => {
		if (!session) {
			toast.error(t("sign_in"));
			return;
		}

		setSubscriptions((prev) => ({
			...prev,
			[type]: enabled,
		}));

		try {
			if (enabled) {
				await subscribeMutation.mutateAsync({
					pluginId,
					subscriptionType: type,
				});
			} else {
				await unsubscribeMutation.mutateAsync({
					pluginId,
					subscriptionType: type,
				});
			}
		} catch (_error) {
			setSubscriptions((prev) => ({
				...prev,
				[type]: !enabled,
			}));
		}
	};

	if (!session) {
		return (
			<div className="rounded-2xl border border-dashed bg-primary/5 p-6 text-center">
				<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
					<Bell className="h-6 w-6" />
				</div>
				<p className="text-muted-foreground text-sm">{t("sign_in")}</p>
			</div>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<Bell className="h-4 w-4" />
					</span>
					{t("notifications")}
				</CardTitle>
				<CardDescription>
					{t("get_notifications", { pluginName })}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{(
					[
						{
							key: "updates",
							icon: RefreshCw,
							label: t("updates"),
							description: t("new_versions"),
						},
						{
							key: "reviews",
							icon: MessageSquare,
							label: t("new_reviews"),
							description: t("new_reviews_ratings"),
						},
						{
							key: "security_alerts",
							icon: Shield,
							label: t("security"),
							description: t("critical_security"),
							badge: t("important"),
						},
					] as const
				).map((row) => (
					<label
						key={row.key}
						htmlFor={`plugin-subscription-${row.key}`}
						className={`-mx-3 flex min-h-11 items-center justify-between gap-4 rounded-xl px-3 py-2 transition-colors ${
							subscribeMutation.isPending || unsubscribeMutation.isPending
								? "cursor-not-allowed opacity-60"
								: "cursor-pointer hover:bg-primary/5"
						}`}
					>
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<row.icon className="h-3.5 w-3.5" />
								</span>
								<span className="font-medium">{row.label}</span>
								{"badge" in row && (
									<Badge variant="outline" className="text-xs">
										{row.badge}
									</Badge>
								)}
							</div>
							<p className="text-muted-foreground text-sm">{row.description}</p>
						</div>
						<Switch
							id={`plugin-subscription-${row.key}`}
							checked={subscriptions[row.key]}
							onCheckedChange={(checked: boolean) =>
								handleSubscriptionToggle(row.key, checked)
							}
							disabled={
								subscribeMutation.isPending || unsubscribeMutation.isPending
							}
							aria-label={row.label}
						/>
					</label>
				))}

				{settings && (
					<div className="border-t pt-4">
						<div className="mb-2 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Settings className="h-4 w-4" />
								<span className="font-medium">
									{t("telegram_notifications")}
								</span>
							</div>
							<Badge
								variant={
									settings.enableTelegramNotifications ? "default" : "secondary"
								}
							>
								{settings.enableTelegramNotifications
									? t("enabled")
									: t("disabled")}
							</Badge>
						</div>
						<p className="text-muted-foreground text-sm">
							{settings.enableTelegramNotifications
								? t("notifications_on")
								: t("notifications_off")}
						</p>
					</div>
				)}

				<div className="border-t pt-4">
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						{Object.values(subscriptions).some(Boolean) ? (
							<>
								<Bell className="h-4 w-4 text-success" />
								<span>{t("subscribed")}</span>
							</>
						) : (
							<>
								<BellOff className="h-4 w-4" />
								<span>{t("not_subscribed")}</span>
							</>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
