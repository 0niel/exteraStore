"use client";

import {
	BarChart3,
	Bot,
	Download,
	MessageSquare,
	Send,
	Settings,
	Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

export default function BotAdminPage() {
	const t = useTranslations("BotAdmin");
	const [broadcastMessage, setBroadcastMessage] = useState("");
	const [testChatId, setTestChatId] = useState("");
	const [testMessage, setTestMessage] = useState("");

	const { data: botStats, isLoading: statsLoading } =
		api.telegramBot.getBotStats.useQuery();

	const handleTestMessage = async () => {
		if (!testChatId || !testMessage) {
			toast.error(t("fill_all_fields"));
			return;
		}

		try {
			const response = await fetch("/api/telegram/test", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					chatId: Number(testChatId),
					message: testMessage,
				}),
			});

			if (response.ok) {
				toast.success(t("test_message_sent"));
				setTestMessage("");
			} else {
				toast.error(t("message_send_error"));
			}
		} catch (error) {
			toast.error(t("message_send_error"));
		}
	};

	const handleSetWebhook = async () => {
		try {
			const response = await fetch("/api/telegram/set-webhook", {
				method: "POST",
			});

			if (response.ok) {
				toast.success(t("webhook_set"));
			} else {
				toast.error(t("webhook_set_error"));
			}
		} catch (error) {
			toast.error(t("webhook_set_error"));
		}
	};

	return (
		<div className="py-8">
			<div className="container mx-auto px-4">
				<div className="mb-8">
					<h1 className="mb-2 font-bold text-3xl">{t("title")}</h1>
					<p className="text-muted-foreground">{t("description")}</p>
				</div>

				<Tabs defaultValue="stats" className="space-y-6">
					<TabsList className="grid w-full grid-cols-4">
						<TabsTrigger value="stats">{t("stats")}</TabsTrigger>
						<TabsTrigger value="settings">{t("settings")}</TabsTrigger>
						<TabsTrigger value="test">{t("testing")}</TabsTrigger>
						<TabsTrigger value="broadcast">{t("broadcast")}</TabsTrigger>
					</TabsList>

					<TabsContent value="stats" className="space-y-6">
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="font-medium text-sm">
										{t("total_plugins")}
									</CardTitle>
									<Bot className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="font-bold text-2xl">
										{statsLoading ? "..." : botStats?.totalPlugins || 0}
									</div>
									<p className="text-muted-foreground text-xs">
										{t("available_for_download")}
									</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="font-medium text-sm">
										{t("bot_downloads")}
									</CardTitle>
									<Download className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="font-bold text-2xl">
										{statsLoading ? "..." : botStats?.botDownloads || 0}
									</div>
									<p className="text-muted-foreground text-xs">
										{t("all_time")}
									</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="font-medium text-sm">
										{t("total_downloads")}
									</CardTitle>
									<BarChart3 className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="font-bold text-2xl">
										{statsLoading ? "..." : botStats?.totalDownloads || 0}
									</div>
									<p className="text-muted-foreground text-xs">
										{t("including_website")}
									</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="font-medium text-sm">
										{t("bot_conversion")}
									</CardTitle>
									<Users className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="font-bold text-2xl">
										{statsLoading
											? "..."
											: botStats?.totalDownloads && botStats?.botDownloads
												? `${Math.round((botStats.botDownloads / botStats.totalDownloads) * 100)}%`
												: "0%"}
									</div>
									<p className="text-muted-foreground text-xs">
										{t("from_total_downloads")}
									</p>
								</CardContent>
							</Card>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>{t("bot_information")}</CardTitle>
								<CardDescription>
									{t("bot_information_description")}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="font-medium text-sm">{t("bot_status")}</span>
									<Badge variant="default">{t("active")}</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="font-medium text-sm">
										{t("webhook_url")}
									</span>
									<code className="rounded bg-muted px-2 py-1 text-xs">
										{process.env.NEXTAUTH_URL || "http://localhost:3000"}
									</code>
								</div>
								<div className="flex items-center justify-between">
									<span className="font-medium text-sm">{t("commands")}</span>
									<div className="flex gap-1">
										<Badge variant="outline">/start</Badge>
										<Badge variant="outline">/plugins</Badge>
										<Badge variant="outline">/search</Badge>
										<Badge variant="outline">/help</Badge>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="settings" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>{t("webhook_settings")}</CardTitle>
								<CardDescription>
									{t("webhook_settings_description")}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<label className="font-medium text-sm">
										{t("webhook_url")}
									</label>
									<Input
										value={`${process.env.NEXTAUTH_URL || "http://localhost:3000"}`}
										readOnly
									/>
								</div>
								<Button onClick={handleSetWebhook}>
									<Settings className="mr-2 h-4 w-4" />
									{t("set_webhook")}
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>{t("bot_commands")}</CardTitle>
								<CardDescription>
									{t("bot_commands_description")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									<div className="flex items-center justify-between rounded-lg border p-3">
										<div>
											<code className="font-mono">/start [plugin_id]</code>
											<p className="text-muted-foreground text-sm">
												{t("start_command_description")}
											</p>
										</div>
									</div>
									<div className="flex items-center justify-between rounded-lg border p-3">
										<div>
											<code className="font-mono">/plugins</code>
											<p className="text-muted-foreground text-sm">
												{t("plugins_command_description")}
											</p>
										</div>
									</div>
									<div className="flex items-center justify-between rounded-lg border p-3">
										<div>
											<code className="font-mono">/search &lt;query&gt;</code>
											<p className="text-muted-foreground text-sm">
												{t("search_command_description")}
											</p>
										</div>
									</div>
									<div className="flex items-center justify-between rounded-lg border p-3">
										<div>
											<code className="font-mono">/help</code>
											<p className="text-muted-foreground text-sm">
												{t("help_command_description")}
											</p>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="test" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>{t("bot_testing")}</CardTitle>
								<CardDescription>
									{t("bot_testing_description")}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<label className="font-medium text-sm">{t("chat_id")}</label>
									<Input
										placeholder={t("chat_id_placeholder")}
										value={testChatId}
										onChange={(e) => setTestChatId(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<label className="font-medium text-sm">{t("message")}</label>
									<Textarea
										placeholder={t("message_placeholder")}
										value={testMessage}
										onChange={(e) => setTestMessage(e.target.value)}
										rows={3}
									/>
								</div>
								<Button onClick={handleTestMessage}>
									<Send className="mr-2 h-4 w-4" />
									{t("send_test_message")}
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>{t("test_links")}</CardTitle>
								<CardDescription>{t("test_links_description")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="space-y-2">
									<label className="font-medium text-sm">
										{t("start_command_test")}
									</label>
									<code className="block rounded bg-muted p-2 text-sm">
										https://t.me/exteragram_plugins_bot?start=test
									</code>
								</div>
								<div className="space-y-2">
									<label className="font-medium text-sm">
										{t("plugin_test")}
									</label>
									<code className="block rounded bg-muted p-2 text-sm">
										https://t.me/exteragram_plugins_bot?start=plugin_1
									</code>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="broadcast" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>{t("mass_broadcast")}</CardTitle>
								<CardDescription>
									{t("mass_broadcast_description")}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<label className="font-medium text-sm">
										{t("broadcast_message")}
									</label>
									<Textarea
										placeholder={t("broadcast_message_placeholder")}
										value={broadcastMessage}
										onChange={(e) => setBroadcastMessage(e.target.value)}
										rows={4}
									/>
								</div>
								<Button disabled>
									<MessageSquare className="mr-2 h-4 w-4" />
									{t("send_broadcast")}
								</Button>
								<p className="text-muted-foreground text-sm">
									{t("broadcast_feature_description")}
								</p>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
