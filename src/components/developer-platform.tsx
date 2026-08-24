"use client";

import {
	Activity,
	Check,
	Clock3,
	Copy,
	KeyRound,
	Loader2,
	Plus,
	Power,
	RefreshCw,
	RotateCcw,
	Send,
	Trash2,
	Webhook,
	XCircle,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const scopes = [
	"plugins:read",
	"profile:read",
	"webhooks:read",
	"webhooks:write",
] as const;

const events = [
	"plugin.created",
	"plugin.approved",
	"plugin.rejected",
	"plugin.updated",
	"security.completed",
	"review.created",
	"download.recorded",
] as const;

type Scope = (typeof scopes)[number];
type Event = (typeof events)[number];

function TogglePill({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"min-h-11 rounded-xl px-3 py-2 text-left text-sm transition-colors",
				active
					? "bg-primary text-primary-foreground"
					: "bg-surface text-muted-foreground hover:text-foreground",
			)}
			aria-pressed={active}
		>
			{children}
		</button>
	);
}

function SecretDialog({
	value,
	open,
	onOpenChange,
}: {
	value: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const t = useTranslations("DeveloperPlatform");
	const copy = async () => {
		await navigator.clipboard.writeText(value);
		toast.success(t("copied"));
	};
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("secret_once")}</DialogTitle>
					<DialogDescription>{t("api_keys_description")}</DialogDescription>
				</DialogHeader>
				<div className="break-all rounded-2xl bg-contrast p-4 font-mono text-contrast-foreground text-sm selection:bg-primary">
					{value}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("close")}
					</Button>
					<Button onClick={copy}>
						<Copy className="size-4" />
						{t("copy")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function DeveloperPlatform() {
	const t = useTranslations("DeveloperPlatform");
	const format = useFormatter();
	const utils = api.useUtils();
	const [keyName, setKeyName] = useState("");
	const [expiry, setExpiry] = useState("90");
	const [selectedScopes, setSelectedScopes] = useState<Scope[]>([
		"plugins:read",
	]);
	const [webhookName, setWebhookName] = useState("");
	const [webhookUrl, setWebhookUrl] = useState("");
	const [selectedEvents, setSelectedEvents] = useState<Event[]>([
		"plugin.updated",
		"review.created",
	]);
	const [revealedSecret, setRevealedSecret] = useState("");
	const [secretOpen, setSecretOpen] = useState(false);

	const keysQuery = api.developerPlatform.listApiKeys.useQuery();
	const webhooksQuery = api.developerPlatform.listWebhooks.useQuery();
	const refresh = async () =>
		Promise.all([
			utils.developerPlatform.listApiKeys.invalidate(),
			utils.developerPlatform.listWebhooks.invalidate(),
		]);
	const reveal = (secret: string) => {
		setRevealedSecret(secret);
		setSecretOpen(true);
	};

	const createKey = api.developerPlatform.createApiKey.useMutation({
		onSuccess: async (result) => {
			if (result.key) reveal(result.key);
			setKeyName("");
			await refresh();
			toast.success(t("created"));
		},
		onError: () => toast.error(t("create_error")),
	});
	const revokeKey = api.developerPlatform.revokeApiKey.useMutation({
		onSuccess: refresh,
		onError: () => toast.error(t("action_error")),
	});
	const createWebhook = api.developerPlatform.createWebhook.useMutation({
		onSuccess: async (result) => {
			reveal(result.secret);
			setWebhookName("");
			setWebhookUrl("");
			await refresh();
			toast.success(t("created"));
		},
		onError: (error) => toast.error(error.message || t("create_error")),
	});
	const deleteWebhook = api.developerPlatform.deleteWebhook.useMutation({
		onSuccess: refresh,
		onError: () => toast.error(t("action_error")),
	});
	const testWebhook = api.developerPlatform.testWebhook.useMutation({
		onSuccess: async () => {
			await refresh();
			toast.success(t("test_sent"));
		},
		onError: () => toast.error(t("action_error")),
	});
	const updateWebhook = api.developerPlatform.updateWebhook.useMutation({
		onSuccess: refresh,
		onError: () => toast.error(t("action_error")),
	});
	const retryDelivery = api.developerPlatform.retryDelivery.useMutation({
		onSuccess: refresh,
		onError: () => toast.error(t("action_error")),
	});
	const rotateWebhook = api.developerPlatform.rotateWebhookSecret.useMutation({
		onSuccess: async (result) => {
			reveal(result.secret);
			await refresh();
		},
		onError: () => toast.error(t("action_error")),
	});

	const expiryTimestamp = useMemo(() => {
		if (expiry === "never") return null;
		return Math.floor(Date.now() / 1000) + Number(expiry) * 24 * 60 * 60;
	}, [expiry]);
	const toggleScope = (scope: Scope) =>
		setSelectedScopes((current) =>
			current.includes(scope)
				? current.filter((item) => item !== scope)
				: [...current, scope],
		);
	const toggleEvent = (event: Event) =>
		setSelectedEvents((current) =>
			current.includes(event)
				? current.filter((item) => item !== event)
				: [...current, event],
		);
	const date = (timestamp: number) =>
		format.dateTime(new Date(timestamp * 1000), {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});

	return (
		<div className="space-y-6">
			<SecretDialog
				value={revealedSecret}
				open={secretOpen}
				onOpenChange={setSecretOpen}
			/>
			<div>
				<span className="eyebrow mb-2">{t("eyebrow")}</span>
				<h2 className="font-bold text-2xl tracking-tight">{t("title")}</h2>
				<p className="mt-1 max-w-2xl text-muted-foreground text-sm">
					{t("description")}
				</p>
			</div>

			<Card className="overflow-hidden border-0 bg-surface/70 shadow-none">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<KeyRound className="size-5 text-primary" />
						{t("api_keys")}
					</CardTitle>
					<p className="text-muted-foreground text-sm">
						{t("api_keys_description")}
					</p>
				</CardHeader>
				<CardContent className="space-y-5">
					<div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
						<div>
							<Label htmlFor="api-key-name">{t("key_name")}</Label>
							<Input
								id="api-key-name"
								className="mt-1 h-11"
								value={keyName}
								onChange={(event) => setKeyName(event.target.value)}
								placeholder={t("key_name_placeholder")}
							/>
						</div>
						<div>
							<Label>{t("expires")}</Label>
							<Select value={expiry} onValueChange={setExpiry}>
								<SelectTrigger className="mt-1 h-11 w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="never">{t("never")}</SelectItem>
									<SelectItem value="30">{t("days_30")}</SelectItem>
									<SelectItem value="90">{t("days_90")}</SelectItem>
									<SelectItem value="365">{t("days_365")}</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<Button
							className="h-11 self-end"
							disabled={
								!keyName.trim() ||
								selectedScopes.length === 0 ||
								createKey.isPending
							}
							onClick={() =>
								createKey.mutate({
									name: keyName,
									scopes: selectedScopes,
									expiresAt: expiryTimestamp,
								})
							}
						>
							{createKey.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Plus className="size-4" />
							)}
							{t("create_key")}
						</Button>
					</div>
					<div>
						<Label>{t("scopes")}</Label>
						<div className="mt-2 grid gap-2 sm:grid-cols-2">
							{scopes.map((scope) => (
								<TogglePill
									key={scope}
									active={selectedScopes.includes(scope)}
									onClick={() => toggleScope(scope)}
								>
									{t(`scope_${scope.replace(":", "_")}`)}
								</TogglePill>
							))}
						</div>
					</div>
					<p className="rounded-xl bg-background/70 p-3 font-mono text-muted-foreground text-xs">
						{t("endpoint_hint")}
					</p>
					<div className="space-y-2">
						{keysQuery.isLoading ? (
							<div className="flex justify-center p-6">
								<Loader2 className="size-5 animate-spin text-primary" />
							</div>
						) : keysQuery.data?.length ? (
							keysQuery.data.map((key) => {
								const expired =
									key.expiresAt !== null && key.expiresAt * 1000 <= Date.now();
								const revoked = key.revokedAt !== null;
								return (
									<div
										key={key.id}
										className="flex flex-col gap-3 rounded-2xl bg-background/80 p-4 sm:flex-row sm:items-center"
									>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="font-semibold">{key.name}</span>
												<Badge
													variant={revoked || expired ? "secondary" : "default"}
												>
													{revoked
														? t("revoked")
														: expired
															? t("expired")
															: t("active")}
												</Badge>
											</div>
											<p className="mt-1 truncate font-mono text-muted-foreground text-xs">
												{key.prefix}••••••••
											</p>
											<p className="mt-1 text-muted-foreground text-xs">
												{t("requests_week", { count: key.requestsLast7Days })} ·{" "}
												{key.lastUsedAt
													? `${t("last_used")}: ${date(key.lastUsedAt)}`
													: t("never_used")}{" "}
												· {t("expires")}:{" "}
												{key.expiresAt ? date(key.expiresAt) : t("never")}
											</p>
											<div className="mt-2 flex flex-wrap gap-1">
												{key.scopes.map((scope) => (
													<Badge
														key={scope}
														variant="secondary"
														className="font-normal text-[10px]"
													>
														{t(`scope_${scope.replace(":", "_")}`)}
													</Badge>
												))}
											</div>
										</div>
										{!revoked && (
											<Button
												variant="ghost"
												className="text-destructive hover:text-destructive"
												onClick={() => revokeKey.mutate({ id: key.id })}
											>
												<XCircle className="size-4" />
												{t("revoke")}
											</Button>
										)}
									</div>
								);
							})
						) : (
							<div className="rounded-2xl bg-background/70 p-6 text-center text-muted-foreground text-sm">
								{t("no_keys")}
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<Card className="overflow-hidden border-0 bg-surface/70 shadow-none">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Webhook className="size-5 text-primary" />
						{t("webhooks")}
					</CardTitle>
					<p className="text-muted-foreground text-sm">
						{t("webhooks_description")}
					</p>
				</CardHeader>
				<CardContent className="space-y-5">
					<div className="grid gap-3 lg:grid-cols-[1fr_1.4fr_auto]">
						<div>
							<Label htmlFor="webhook-name">{t("webhook_name")}</Label>
							<Input
								id="webhook-name"
								className="mt-1 h-11"
								value={webhookName}
								onChange={(event) => setWebhookName(event.target.value)}
								placeholder={t("webhook_name_placeholder")}
							/>
						</div>
						<div>
							<Label htmlFor="webhook-url">{t("webhook_url")}</Label>
							<Input
								id="webhook-url"
								className="mt-1 h-11"
								value={webhookUrl}
								onChange={(event) => setWebhookUrl(event.target.value)}
								placeholder="https://example.com/webhooks/exterastore"
							/>
						</div>
						<Button
							className="h-11 self-end"
							disabled={
								!webhookName.trim() ||
								!webhookUrl.trim() ||
								selectedEvents.length === 0 ||
								createWebhook.isPending
							}
							onClick={() =>
								createWebhook.mutate({
									name: webhookName,
									url: webhookUrl,
									events: selectedEvents,
								})
							}
						>
							{createWebhook.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Plus className="size-4" />
							)}
							{t("create_webhook")}
						</Button>
					</div>
					<div>
						<Label>{t("events")}</Label>
						<div className="mt-2 grid gap-2 sm:grid-cols-2">
							{events.map((event) => (
								<TogglePill
									key={event}
									active={selectedEvents.includes(event)}
									onClick={() => toggleEvent(event)}
								>
									{t(`event_${event.replaceAll(".", "_")}`)}
								</TogglePill>
							))}
						</div>
					</div>
					<p className="rounded-xl bg-background/70 p-3 text-muted-foreground text-xs">
						{t("signature_hint")}
					</p>
					<div className="space-y-3">
						{webhooksQuery.isLoading ? (
							<div className="flex justify-center p-6">
								<Loader2 className="size-5 animate-spin text-primary" />
							</div>
						) : webhooksQuery.data?.length ? (
							webhooksQuery.data.map((hook) => (
								<div key={hook.id} className="rounded-2xl bg-background/80 p-4">
									<div className="flex flex-col gap-3 sm:flex-row sm:items-start">
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="font-semibold">{hook.name}</span>
												<Badge
													variant={hook.isActive ? "default" : "secondary"}
												>
													{hook.isActive ? t("active") : t("failed")}
												</Badge>
											</div>
											<p className="mt-1 truncate font-mono text-muted-foreground text-xs">
												{hook.url}
											</p>
											<div className="mt-2 flex flex-wrap gap-1">
												{hook.events.map((event) => (
													<Badge
														key={event}
														variant="secondary"
														className="font-normal text-[10px]"
													>
														{t(`event_${event.replaceAll(".", "_")}`)}
													</Badge>
												))}
											</div>
										</div>
										<div className="flex flex-wrap gap-1">
											<Button
												size="sm"
												variant="ghost"
												disabled={updateWebhook.isPending}
												onClick={() =>
													updateWebhook.mutate({
														id: hook.id,
														name: hook.name,
														url: hook.url,
														events: hook.events,
														isActive: !hook.isActive,
													})
												}
											>
												<Power className="size-3.5" />
												{hook.isActive ? t("disable") : t("enable")}
											</Button>
											<Button
												size="sm"
												variant="outline"
												disabled={testWebhook.isPending}
												onClick={() => testWebhook.mutate({ id: hook.id })}
											>
												<Send className="size-3.5" />
												{t("test")}
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => rotateWebhook.mutate({ id: hook.id })}
											>
												<RotateCcw className="size-3.5" />
												{t("rotate")}
											</Button>
											<Button
												size="icon"
												variant="ghost"
												className="text-destructive hover:text-destructive"
												onClick={() => deleteWebhook.mutate({ id: hook.id })}
												aria-label={t("delete")}
											>
												<Trash2 className="size-4" />
											</Button>
										</div>
									</div>
									<div className="mt-4 pt-3">
										<div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
											<Activity className="size-3.5" />
											{t("deliveries")}
										</div>
										{hook.deliveries.length ? (
											<div className="space-y-1.5">
												{hook.deliveries.slice(0, 4).map((delivery) => (
													<div
														key={delivery.id}
														className="flex items-center justify-between gap-3 text-xs"
													>
														<span className="flex min-w-0 items-center gap-2">
															{delivery.status === "delivered" ? (
																<Check className="size-3.5 shrink-0 text-success" />
															) : (
																<XCircle className="size-3.5 shrink-0 text-destructive" />
															)}
															<span className="truncate font-mono">
																{delivery.event}
															</span>
														</span>
														<span className="flex shrink-0 items-center gap-1 text-muted-foreground">
															<Clock3 className="size-3" />
															{date(delivery.createdAt)}
															{delivery.status !== "delivered" && (
																<button
																	type="button"
																	className="ml-1 inline-flex size-7 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
																	onClick={() =>
																		retryDelivery.mutate({ id: delivery.id })
																	}
																	aria-label={t("retry")}
																>
																	<RotateCcw className="size-3" />
																</button>
															)}
														</span>
													</div>
												))}
											</div>
										) : (
											<p className="text-muted-foreground text-xs">
												{t("no_deliveries")}
											</p>
										)}
									</div>
								</div>
							))
						) : (
							<div className="rounded-2xl bg-background/70 p-6 text-center text-muted-foreground text-sm">
								{t("no_webhooks")}
							</div>
						)}
					</div>
				</CardContent>
			</Card>
			<div className="flex justify-center">
				<Button variant="ghost" onClick={() => void refresh()}>
					<RefreshCw className="size-4" />
					{t("refresh")}
				</Button>
			</div>
		</div>
	);
}
