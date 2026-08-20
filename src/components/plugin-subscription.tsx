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
import { useState } from "react";
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

	const { data: settings } =
		api.pluginPipeline.getNotificationSettings.useQuery(undefined, {
			enabled: !!session,
		});

	const subscribeMutation = api.pluginPipeline.subscribe.useMutation({
		onSuccess: () => {
			toast.success(t("subscription_created"));
		},
		onError: (error) => {
			toast.error(t("subscription_error", { error: error.message }));
		},
	});

	const unsubscribeMutation = api.pluginPipeline.unsubscribe.useMutation({
		onSuccess: () => {
			toast.success(t("subscription_canceled"));
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

			setSubscriptions((prev) => ({
				...prev,
				[type]: enabled,
			}));
		} catch (_error) {}
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
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<RefreshCw className="h-3.5 w-3.5" />
							</span>
							<span className="font-medium">{t("updates")}</span>
						</div>
						<p className="text-muted-foreground text-sm">{t("new_versions")}</p>
					</div>
					<Switch
						checked={subscriptions.updates}
						onCheckedChange={(checked: boolean) =>
							handleSubscriptionToggle("updates", checked)
						}
						disabled={
							subscribeMutation.isPending || unsubscribeMutation.isPending
						}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<MessageSquare className="h-3.5 w-3.5" />
							</span>
							<span className="font-medium">{t("new_reviews")}</span>
						</div>
						<p className="text-muted-foreground text-sm">
							{t("new_reviews_ratings")}
						</p>
					</div>
					<Switch
						checked={subscriptions.reviews}
						onCheckedChange={(checked: boolean) =>
							handleSubscriptionToggle("reviews", checked)
						}
						disabled={
							subscribeMutation.isPending || unsubscribeMutation.isPending
						}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<Shield className="h-3.5 w-3.5" />
							</span>
							<span className="font-medium">{t("security")}</span>
							<Badge variant="outline" className="text-xs">
								{t("important")}
							</Badge>
						</div>
						<p className="text-muted-foreground text-sm">
							{t("critical_security")}
						</p>
					</div>
					<Switch
						checked={subscriptions.security_alerts}
						onCheckedChange={(checked: boolean) =>
							handleSubscriptionToggle("security_alerts", checked)
						}
						disabled={
							subscribeMutation.isPending || unsubscribeMutation.isPending
						}
					/>
				</div>

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
