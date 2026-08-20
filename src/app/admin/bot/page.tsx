"use client";

import { FlaskConical, Loader2, Megaphone, Send, Webhook } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

export default function TelegramBotAdminPage() {
	const t = useTranslations("BotAdmin");
	const [broadcastMessage, setBroadcastMessage] = useState("");
	const [personalUsername, setPersonalUsername] = useState("");
	const [personalMessage, setPersonalMessage] = useState("");
	const [testChatId, setTestChatId] = useState("");
	const [testMessage, setTestMessage] = useState("");
	const [webhookUrl, setWebhookUrl] = useState("");

	const broadcastMutation = api.telegramNotifications.broadcast.useMutation({
		onSuccess: (data: { sent: number; failed: number }) => {
			toast.success(
				t("broadcast_success", { sent: data.sent, failed: data.failed }),
			);
			setBroadcastMessage("");
		},
		onError: (error) => {
			toast.error(t("broadcast_error"), { description: error.message });
		},
	});

	const personalMessageMutation =
		api.telegramNotifications.sendPersonalMessage.useMutation({
			onSuccess: () => {
				toast.success(t("personal_message_sent"));
				setPersonalUsername("");
				setPersonalMessage("");
			},
			onError: (error) => {
				toast.error(t("personal_message_error"), {
					description: error.message,
				});
			},
		});

	const testMessageMutation = api.telegramNotifications.testMessage.useMutation(
		{
			onSuccess: () => {
				toast.success(t("test_message_sent"));
				setTestChatId("");
				setTestMessage("");
			},
			onError: (error) => {
				toast.error(t("message_send_error"), { description: error.message });
			},
		},
	);

	const setWebhookMutation = api.telegramNotifications.setWebhook.useMutation({
		onSuccess: () => {
			toast.success(t("webhook_set"));
			setWebhookUrl("");
		},
		onError: (error) => {
			toast.error(t("webhook_set_error"), { description: error.message });
		},
	});

	const handleBroadcast = () => {
		if (!broadcastMessage.trim()) {
			toast.error(t("enter_message"));
			return;
		}

		broadcastMutation.mutate({
			message: broadcastMessage,
		});
	};

	const handlePersonalMessage = () => {
		if (!personalUsername.trim() || !personalMessage.trim()) {
			toast.error(t("fill_all_fields"));
			return;
		}

		personalMessageMutation.mutate({
			username: personalUsername,
			message: personalMessage,
		});
	};

	const handleTestMessage = () => {
		if (!testChatId.trim() || !testMessage.trim()) {
			toast.error(t("fill_all_fields"));
			return;
		}

		testMessageMutation.mutate({
			chatId: testChatId,
			message: testMessage,
		});
	};

	const handleSetWebhook = () => {
		if (!webhookUrl.trim()) {
			toast.error(t("enter_webhook_url"));
			return;
		}

		setWebhookMutation.mutate({
			url: webhookUrl,
		});
	};

	return (
		<div className="py-8">
			<div className="container mx-auto max-w-6xl space-y-6 px-4">
				<div className="animate-fade-up">
					<span className="eyebrow mb-2">{t("eyebrow")}</span>
					<h1 className="font-bold text-3xl tracking-tight md:text-4xl">
						{t("title")}
					</h1>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
					<Card className="animate-fade-in">
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<Megaphone className="h-4 w-4" />
								</span>
								{t("mass_broadcast")}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="broadcast-message">{t("message")}</Label>
								<Textarea
									id="broadcast-message"
									placeholder={t("broadcast_message_placeholder")}
									value={broadcastMessage}
									onChange={(e) => setBroadcastMessage(e.target.value)}
									rows={4}
								/>
								<p className="text-muted-foreground text-xs">
									{t("broadcast_hint")}
								</p>
							</div>
							<Button
								onClick={handleBroadcast}
								disabled={broadcastMutation.isPending}
								className="w-full"
							>
								{broadcastMutation.isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Send className="mr-2 h-4 w-4" />
								)}
								{t("send_broadcast")}
							</Button>
						</CardContent>
					</Card>

					<Card className="animate-fade-in">
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<Send className="h-4 w-4" />
								</span>
								{t("send_to_user")}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="personal-username">{t("username")}</Label>
								<Input
									id="personal-username"
									className="min-h-11"
									placeholder={t("username_placeholder")}
									value={personalUsername}
									onChange={(e) => setPersonalUsername(e.target.value)}
								/>
								<p className="text-muted-foreground text-xs">
									{t("username_hint")}
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="personal-message">{t("message")}</Label>
								<Textarea
									id="personal-message"
									placeholder={t("personal_message_placeholder")}
									value={personalMessage}
									onChange={(e) => setPersonalMessage(e.target.value)}
									rows={3}
								/>
							</div>
							<Button
								onClick={handlePersonalMessage}
								disabled={personalMessageMutation.isPending}
								className="w-full"
							>
								{personalMessageMutation.isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Send className="mr-2 h-4 w-4" />
								)}
								{t("send_personal_message")}
							</Button>
						</CardContent>
					</Card>

					<Card className="animate-fade-in">
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<FlaskConical className="h-4 w-4" />
								</span>
								{t("bot_testing")}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="test-chat-id">{t("chat_id")}</Label>
								<Input
									id="test-chat-id"
									className="min-h-11 font-mono"
									placeholder={t("chat_id_placeholder")}
									value={testChatId}
									onChange={(e) => setTestChatId(e.target.value)}
								/>
								<p className="text-muted-foreground text-xs">
									{t("chat_id_hint")}
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="test-message">{t("message")}</Label>
								<Textarea
									id="test-message"
									placeholder={t("message_placeholder")}
									value={testMessage}
									onChange={(e) => setTestMessage(e.target.value)}
									rows={3}
								/>
							</div>
							<Button
								onClick={handleTestMessage}
								disabled={testMessageMutation.isPending}
								className="w-full"
							>
								{testMessageMutation.isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Send className="mr-2 h-4 w-4" />
								)}
								{t("send_test_message")}
							</Button>
						</CardContent>
					</Card>

					<Card className="animate-fade-in">
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<Webhook className="h-4 w-4" />
								</span>
								{t("webhook_settings")}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="webhook-url">{t("webhook_url_label")}</Label>
								<Input
									id="webhook-url"
									className="min-h-11 font-mono"
									placeholder={t("webhook_url_placeholder")}
									value={webhookUrl}
									onChange={(e) => setWebhookUrl(e.target.value)}
								/>
								<p className="text-muted-foreground text-xs">
									{t("webhook_hint")}
								</p>
							</div>
							<Button
								onClick={handleSetWebhook}
								disabled={setWebhookMutation.isPending}
								className="w-full"
							>
								{setWebhookMutation.isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Send className="mr-2 h-4 w-4" />
								)}
								{t("set_webhook")}
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
