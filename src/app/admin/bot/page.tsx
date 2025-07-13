"use client";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";

export default function TelegramBotAdminPage() {
	const t = useTranslations("TelegramBot");
	const [broadcastMessage, setBroadcastMessage] = useState("");
	const [personalUsername, setPersonalUsername] = useState("");
	const [personalMessage, setPersonalMessage] = useState("");
	const [testChatId, setTestChatId] = useState("");
	const [testMessage, setTestMessage] = useState("");
	const [webhookUrl, setWebhookUrl] = useState("");

	const broadcastMutation = api.telegramNotifications.broadcast.useMutation({
		onSuccess: (data: { sent: number; failed: number }) => {
			toast.success(t("broadcastSuccess", { sent: data.sent, failed: data.failed }));
			setBroadcastMessage("");
		},
		onError: (error) => {
			toast.error(t("broadcastError"));
			console.error("Broadcast error:", error);
		},
	});

	const personalMessageMutation = api.telegramNotifications.sendPersonalMessage.useMutation({
		onSuccess: () => {
			toast.success(t("personalMessageSuccess"));
			setPersonalUsername("");
			setPersonalMessage("");
		},
		onError: (error) => {
			toast.error(t("personalMessageError"));
			console.error("Personal message error:", error);
		},
	});

	const testMessageMutation = api.telegramNotifications.testMessage.useMutation({
		onSuccess: () => {
			toast.success(t("testMessageSuccess"));
			setTestChatId("");
			setTestMessage("");
		},
		onError: (error) => {
			toast.error(t("testMessageError"));
			console.error("Test message error:", error);
		},
	});

	const setWebhookMutation = api.telegramNotifications.setWebhook.useMutation({
		onSuccess: () => {
			toast.success(t("webhookSuccess"));
			setWebhookUrl("");
		},
		onError: (error) => {
			toast.error(t("webhookError"));
			console.error("Webhook error:", error);
		},
	});

	const handleBroadcast = async () => {
		if (!broadcastMessage.trim()) {
			toast.error(t("enterMessage"));
			return;
		}

		broadcastMutation.mutate({
			message: broadcastMessage,
		});
	};

	const handlePersonalMessage = async () => {
		if (!personalUsername.trim() || !personalMessage.trim()) {
			toast.error(t("enterUsernameAndMessage"));
			return;
		}

		personalMessageMutation.mutate({
			username: personalUsername,
			message: personalMessage,
		});
	};

	const handleTestMessage = async () => {
		if (!testChatId.trim() || !testMessage.trim()) {
			toast.error(t("enterChatIdAndMessage"));
			return;
		}

		testMessageMutation.mutate({
			chatId: testChatId,
			message: testMessage,
		});
	};

	const handleSetWebhook = async () => {
		if (!webhookUrl.trim()) {
			toast.error(t("enterWebhookUrl"));
			return;
		}

		setWebhookMutation.mutate({
			url: webhookUrl,
		});
	};

	return (
		<div className="container mx-auto p-6 space-y-6">
			<h1 className="text-3xl font-bold">{t("title")}</h1>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>{t("broadcast")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="broadcast-message">{t("message")}</Label>
							<Textarea
								id="broadcast-message"
								placeholder={t("enterMessage")}
								value={broadcastMessage}
								onChange={(e) => setBroadcastMessage(e.target.value)}
								rows={4}
							/>
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
							{t("sendBroadcast")}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("personalMessage")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="personal-username">{t("username")}</Label>
							<Input
								id="personal-username"
								placeholder={t("enterUsername")}
								value={personalUsername}
								onChange={(e) => setPersonalUsername(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="personal-message">{t("message")}</Label>
							<Textarea
								id="personal-message"
								placeholder={t("enterMessage")}
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
							{t("sendPersonalMessage")}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("testMessage")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="test-chat-id">{t("chatId")}</Label>
							<Input
								id="test-chat-id"
								placeholder={t("enterChatId")}
								value={testChatId}
								onChange={(e) => setTestChatId(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="test-message">{t("message")}</Label>
							<Textarea
								id="test-message"
								placeholder={t("enterMessage")}
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
							{t("sendTestMessage")}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("webhook")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="webhook-url">{t("webhookUrl")}</Label>
							<Input
								id="webhook-url"
								placeholder={t("enterWebhookUrl")}
								value={webhookUrl}
								onChange={(e) => setWebhookUrl(e.target.value)}
							/>
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
							{t("setWebhook")}
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
