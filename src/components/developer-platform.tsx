"use client";

import {
	Activity,
	AlertCircle,
	Check,
	CheckCircle2,
	Clock3,
	Code2,
	Copy,
	KeyRound,
	Loader2,
	Pencil,
	Plus,
	Power,
	RefreshCw,
	RotateCcw,
	Send,
	ShieldCheck,
	Trash2,
	Webhook,
	XCircle,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
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
import { Textarea } from "~/components/ui/textarea";
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
	kind,
	open,
	onOpenChange,
}: {
	value: string;
	kind: "api-key" | "webhook";
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const t = useTranslations("DeveloperPlatform");
	const [testResult, setTestResult] = useState<{
		status: number;
		latency: number;
		ok: boolean;
	} | null>(null);
	const [isTesting, setIsTesting] = useState(false);
	const copy = async () => {
		await navigator.clipboard.writeText(value);
		toast.success(t("copied"));
	};
	const copyExample = async () => {
		await navigator.clipboard.writeText(
			`curl -H "Authorization: Bearer ${value}" ${window.location.origin}/api/v1/key`,
		);
		toast.success(t("example_copied"));
	};
	const testKey = async () => {
		setIsTesting(true);
		setTestResult(null);
		const startedAt = performance.now();
		try {
			const response = await fetch("/api/v1/key", {
				headers: { Authorization: `Bearer ${value}` },
			});
			setTestResult({
				status: response.status,
				latency: Math.round(performance.now() - startedAt),
				ok: response.ok,
			});
		} catch {
			setTestResult({
				status: 0,
				latency: Math.round(performance.now() - startedAt),
				ok: false,
			});
		} finally {
			setIsTesting(false);
		}
	};
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{kind === "api-key" ? t("secret_once") : t("webhook_secret_once")}
					</DialogTitle>
					<DialogDescription>
						{kind === "api-key"
							? t("api_keys_description")
							: t("webhook_secret_description")}
					</DialogDescription>
				</DialogHeader>
				<div className="break-all rounded-2xl bg-contrast p-4 font-mono text-contrast-foreground text-sm selection:bg-primary">
					{value}
				</div>
				{kind === "api-key" && (
					<div className="grid gap-2 sm:grid-cols-2">
						<Button variant="secondary" onClick={copyExample}>
							<Code2 className="size-4" />
							{t("copy_curl")}
						</Button>
						<Button variant="secondary" onClick={testKey} disabled={isTesting}>
							{isTesting ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Activity className="size-4" />
							)}
							{t("test_key")}
						</Button>
					</div>
				)}
				{kind === "api-key" && testResult && (
					<div
						role="status"
						className={cn(
							"flex items-center gap-3 rounded-2xl p-3 text-sm",
							testResult.ok
								? "bg-success/10 text-success"
								: "bg-destructive/10 text-destructive",
						)}
					>
						{testResult.ok ? (
							<CheckCircle2 className="size-5 shrink-0" />
						) : (
							<AlertCircle className="size-5 shrink-0" />
						)}
						<span>
							{testResult.ok ? t("key_works") : t("key_test_failed")} · HTTP{" "}
							{testResult.status || "—"} · {testResult.latency} ms
						</span>
					</div>
				)}
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

interface EditableWebhook {
	id: number;
	name: string;
	url: string;
	events: Event[];
	isActive: boolean;
}

type Confirmation =
	| { type: "revoke-key"; id: number; name: string }
	| { type: "delete-webhook"; id: number; name: string }
	| { type: "rotate-webhook"; id: number; name: string };

function ConfirmationDialog({
	confirmation,
	onOpenChange,
	onConfirm,
	pending,
}: {
	confirmation: Confirmation | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: (confirmation: Confirmation) => void;
	pending: boolean;
}) {
	const t = useTranslations("DeveloperPlatform");
	return (
		<AlertDialog open={Boolean(confirmation)} onOpenChange={onOpenChange}>
			<AlertDialogContent className="border-0 shadow-none">
				<AlertDialogHeader>
					<AlertDialogTitle>
						{confirmation ? t(`confirm_${confirmation.type}_title`) : ""}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{confirmation
							? t(`confirm_${confirmation.type}_description`, {
									name: confirmation.name,
								})
							: ""}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>
						{t("cancel")}
					</AlertDialogCancel>
					<AlertDialogAction
						disabled={pending || !confirmation}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						onClick={() => confirmation && onConfirm(confirmation)}
					>
						{pending && <Loader2 className="size-4 animate-spin" />}
						{confirmation?.type === "rotate-webhook"
							? t("rotate")
							: confirmation?.type === "revoke-key"
								? t("revoke")
								: t("delete")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function WebhookTestDialog({
	hook,
	onOpenChange,
	onDelivered,
}: {
	hook: EditableWebhook | null;
	onOpenChange: (open: boolean) => void;
	onDelivered: () => Promise<unknown>;
}) {
	const t = useTranslations("DeveloperPlatform");
	const [event, setEvent] = useState<Event>("plugin.updated");
	const [payload, setPayload] = useState(
		'{\n  "pluginId": 123,\n  "pluginName": "Demo plugin"\n}',
	);
	const [result, setResult] = useState<{
		status: string;
		responseStatus: number | null;
		errorMessage: string | null;
	} | null>(null);

	useEffect(() => {
		if (!hook) return;
		setEvent(hook.events[0] || "plugin.updated");
		setResult(null);
	}, [hook]);

	const parsedPayload = useMemo(() => {
		try {
			const parsed = JSON.parse(payload);
			return parsed && typeof parsed === "object" && !Array.isArray(parsed)
				? (parsed as Record<string, unknown>)
				: null;
		} catch {
			return null;
		}
	}, [payload]);
	const payloadSize = new TextEncoder().encode(payload).length;
	const test = api.developerPlatform.testWebhook.useMutation({
		onSuccess: async (delivery) => {
			setResult(delivery);
			await onDelivered();
			toast.success(t("test_completed"));
		},
		onError: (error) =>
			toast.error(
				error.data?.code === "TOO_MANY_REQUESTS"
					? t("test_rate_limited")
					: error.message || t("action_error"),
			),
	});

	return (
		<Dialog open={Boolean(hook)} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{t("test_webhook_title")}</DialogTitle>
					<DialogDescription>
						{hook ? t("test_webhook_description", { name: hook.name }) : ""}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<Label htmlFor="webhook-test-event">{t("test_event")}</Label>
						<Select
							value={event}
							onValueChange={(value: Event) => setEvent(value)}
						>
							<SelectTrigger id="webhook-test-event" className="mt-2 w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{hook?.events.map((item) => (
									<SelectItem key={item} value={item}>
										{t(`event_${item.replaceAll(".", "_")}`)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<div className="flex items-center justify-between gap-3">
							<Label htmlFor="webhook-test-payload">{t("test_payload")}</Label>
							<span className="text-muted-foreground text-xs">
								{payloadSize} / 16384 B
							</span>
						</div>
						<Textarea
							id="webhook-test-payload"
							value={payload}
							onChange={(event) => setPayload(event.target.value)}
							className="mt-2 min-h-40 font-mono text-sm"
							aria-invalid={!parsedPayload || payloadSize > 16_384}
						/>
						{!parsedPayload && (
							<p className="mt-2 text-destructive text-xs" role="alert">
								{t("invalid_json")}
							</p>
						)}
					</div>
					{result && (
						<div
							role="status"
							className={cn(
								"rounded-2xl p-4 text-sm",
								result.status === "delivered"
									? "bg-success/10 text-success"
									: "bg-destructive/10 text-destructive",
							)}
						>
							<div className="flex items-center gap-2 font-semibold">
								{result.status === "delivered" ? (
									<CheckCircle2 className="size-4" />
								) : (
									<AlertCircle className="size-4" />
								)}
								{result.status === "delivered"
									? t("test_delivered")
									: t("test_failed")}
							</div>
							<p className="mt-1 font-mono text-xs">
								HTTP {result.responseStatus || "—"}
								{result.errorMessage ? ` · ${result.errorMessage}` : ""}
							</p>
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("close")}
					</Button>
					<Button
						disabled={
							!hook || !parsedPayload || payloadSize > 16_384 || test.isPending
						}
						onClick={() =>
							hook &&
							parsedPayload &&
							test.mutate({ id: hook.id, event, data: parsedPayload })
						}
					>
						{test.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Send className="size-4" />
						)}
						{t("send_test")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function WebhookEditDialog({
	hook,
	onOpenChange,
	onSaved,
}: {
	hook: EditableWebhook | null;
	onOpenChange: (open: boolean) => void;
	onSaved: () => Promise<unknown>;
}) {
	const t = useTranslations("DeveloperPlatform");
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [selected, setSelected] = useState<Event[]>([]);

	useEffect(() => {
		if (!hook) return;
		setName(hook.name);
		setUrl(hook.url);
		setSelected(hook.events);
	}, [hook]);

	const update = api.developerPlatform.updateWebhook.useMutation({
		onSuccess: async () => {
			await onSaved();
			onOpenChange(false);
			toast.success(t("webhook_updated"));
		},
		onError: (error) => toast.error(error.message || t("action_error")),
	});
	const toggle = (event: Event) =>
		setSelected((current) =>
			current.includes(event)
				? current.filter((item) => item !== event)
				: [...current, event],
		);

	return (
		<Dialog open={Boolean(hook)} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{t("edit_webhook")}</DialogTitle>
					<DialogDescription>{t("edit_webhook_description")}</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<Label htmlFor="edit-webhook-name">{t("webhook_name")}</Label>
						<Input
							id="edit-webhook-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							className="mt-2"
							maxLength={80}
							autoComplete="off"
						/>
					</div>
					<div>
						<Label htmlFor="edit-webhook-url">{t("webhook_url")}</Label>
						<Input
							id="edit-webhook-url"
							type="url"
							value={url}
							onChange={(event) => setUrl(event.target.value)}
							className="mt-2"
							maxLength={2000}
							inputMode="url"
							autoComplete="url"
							autoCapitalize="none"
							spellCheck={false}
						/>
					</div>
				</div>
				<div>
					<Label>{t("events")}</Label>
					<div className="mt-2 grid gap-2 sm:grid-cols-2">
						{events.map((event) => (
							<TogglePill
								key={event}
								active={selected.includes(event)}
								onClick={() => toggle(event)}
							>
								{t(`event_${event.replaceAll(".", "_")}`)}
							</TogglePill>
						))}
					</div>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("close")}
					</Button>
					<Button
						disabled={
							!hook ||
							!name.trim() ||
							!url.trim() ||
							!selected.length ||
							update.isPending
						}
						onClick={() =>
							hook &&
							update.mutate({
								id: hook.id,
								name,
								url,
								events: selected,
								isActive: hook.isActive,
							})
						}
					>
						{update.isPending && <Loader2 className="size-4 animate-spin" />}
						{t("save")}
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
	const [revealedSecretKind, setRevealedSecretKind] = useState<
		"api-key" | "webhook"
	>("api-key");
	const [secretOpen, setSecretOpen] = useState(false);
	const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
	const [testingWebhook, setTestingWebhook] = useState<EditableWebhook | null>(
		null,
	);
	const [editingWebhook, setEditingWebhook] = useState<EditableWebhook | null>(
		null,
	);

	const keysQuery = api.developerPlatform.listApiKeys.useQuery();
	const webhooksQuery = api.developerPlatform.listWebhooks.useQuery();
	const refresh = async () =>
		Promise.all([
			utils.developerPlatform.listApiKeys.invalidate(),
			utils.developerPlatform.listWebhooks.invalidate(),
		]);
	const reveal = (secret: string, kind: "api-key" | "webhook") => {
		setRevealedSecret(secret);
		setRevealedSecretKind(kind);
		setSecretOpen(true);
	};

	const createKey = api.developerPlatform.createApiKey.useMutation({
		onSuccess: async (result) => {
			if (result.key) reveal(result.key, "api-key");
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
			reveal(result.secret, "webhook");
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
			reveal(result.secret, "webhook");
			await refresh();
			setConfirmation(null);
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
	const dateTime = (timestamp: number) =>
		format.dateTime(new Date(timestamp * 1000), {
			day: "2-digit",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		});
	const confirmAction = (action: Confirmation) => {
		if (action.type === "revoke-key") {
			revokeKey.mutate(
				{ id: action.id },
				{ onSuccess: () => setConfirmation(null) },
			);
			return;
		}
		if (action.type === "delete-webhook") {
			deleteWebhook.mutate(
				{ id: action.id },
				{ onSuccess: () => setConfirmation(null) },
			);
			return;
		}
		rotateWebhook.mutate({ id: action.id });
	};
	const confirmationPending =
		revokeKey.isPending || deleteWebhook.isPending || rotateWebhook.isPending;

	return (
		<div className="space-y-6">
			<SecretDialog
				value={revealedSecret}
				kind={revealedSecretKind}
				open={secretOpen}
				onOpenChange={setSecretOpen}
			/>
			<ConfirmationDialog
				confirmation={confirmation}
				onOpenChange={(open) => !open && setConfirmation(null)}
				onConfirm={confirmAction}
				pending={confirmationPending}
			/>
			<WebhookTestDialog
				hook={testingWebhook}
				onOpenChange={(open) => !open && setTestingWebhook(null)}
				onDelivered={refresh}
			/>
			<WebhookEditDialog
				hook={editingWebhook}
				onOpenChange={(open) => !open && setEditingWebhook(null)}
				onSaved={refresh}
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
								className="mt-2"
								value={keyName}
								onChange={(event) => setKeyName(event.target.value)}
								placeholder={t("key_name_placeholder")}
								maxLength={80}
								autoComplete="off"
							/>
						</div>
						<div>
							<Label>{t("expires")}</Label>
							<Select value={expiry} onValueChange={setExpiry}>
								<SelectTrigger className="mt-2 w-full">
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
							className="self-end"
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
					<div className="grid gap-2 sm:grid-cols-3">
						{[
							["GET", "/api/v1/key"],
							["GET", "/api/v1/plugins"],
							["POST", "/api/v1/webhooks/:id/test"],
						].map(([method, path]) => (
							<div
								key={path}
								className="flex min-w-0 items-center gap-2 rounded-xl bg-background/70 px-3 py-2.5 font-mono text-xs"
							>
								<Badge variant="secondary" className="shrink-0 font-mono">
									{method}
								</Badge>
								<span className="truncate">{path}</span>
							</div>
						))}
					</div>
					<p className="flex items-start gap-2 text-muted-foreground text-xs">
						<ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
						{t("rate_limit_hint")}
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
										{key.recentRequests.length > 0 && (
											<div className="mt-3 space-y-1.5 rounded-xl bg-surface p-2.5">
												<p className="px-1 font-medium text-muted-foreground text-xs">
													{t("recent_requests")}
												</p>
												{key.recentRequests.slice(0, 3).map((request) => (
													<div
														key={request.id}
														className="flex min-w-0 items-center gap-2 px-1 font-mono text-[11px]"
													>
														<span className="shrink-0 font-semibold">
															{request.method}
														</span>
														<span className="min-w-0 flex-1 truncate text-muted-foreground">
															{request.path}
														</span>
														<span
															className={
																request.statusCode < 400
																	? "text-success"
																	: "text-destructive"
															}
														>
															{request.statusCode}
														</span>
														<span className="text-muted-foreground">
															{request.latencyMs}ms
														</span>
													</div>
												))}
											</div>
										)}
										{!revoked && (
											<Button
												variant="ghost"
												className="text-destructive hover:text-destructive"
												onClick={() =>
													setConfirmation({
														type: "revoke-key",
														id: key.id,
														name: key.name,
													})
												}
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
								className="mt-2"
								value={webhookName}
								onChange={(event) => setWebhookName(event.target.value)}
								placeholder={t("webhook_name_placeholder")}
								maxLength={80}
								autoComplete="off"
							/>
						</div>
						<div>
							<Label htmlFor="webhook-url">{t("webhook_url")}</Label>
							<Input
								id="webhook-url"
								type="url"
								className="mt-2"
								value={webhookUrl}
								onChange={(event) => setWebhookUrl(event.target.value)}
								placeholder="https://example.com/webhooks/exterastore"
								maxLength={2000}
								inputMode="url"
								autoComplete="url"
								autoCapitalize="none"
								spellCheck={false}
							/>
						</div>
						<Button
							className="self-end"
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
												onClick={() => setEditingWebhook(hook)}
											>
												<Pencil className="size-3.5" />
												{t("edit")}
											</Button>
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
												variant="secondary"
												onClick={() => setTestingWebhook(hook)}
											>
												<Send className="size-3.5" />
												{t("send_test")}
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() =>
													setConfirmation({
														type: "rotate-webhook",
														id: hook.id,
														name: hook.name,
													})
												}
											>
												<RotateCcw className="size-3.5" />
												{t("rotate")}
											</Button>
											<Button
												size="icon"
												variant="ghost"
												className="text-destructive hover:text-destructive"
												onClick={() =>
													setConfirmation({
														type: "delete-webhook",
														id: hook.id,
														name: hook.name,
													})
												}
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
													<div key={delivery.id} className="space-y-1">
														<div className="flex items-center justify-between gap-3 text-xs">
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
																{dateTime(delivery.createdAt)}
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
														<div className="flex flex-wrap gap-x-3 pl-5 text-[11px] text-muted-foreground">
															<span>HTTP {delivery.responseStatus || "—"}</span>
															<span>
																{t("attempt", { count: delivery.attemptCount })}
															</span>
															{delivery.errorMessage && (
																<span className="truncate text-destructive">
																	{delivery.errorMessage}
																</span>
															)}
														</div>
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
