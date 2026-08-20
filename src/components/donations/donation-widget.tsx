"use client";

import {
	Banknote,
	Bitcoin,
	CreditCard,
	Gift,
	HandCoins,
	Link as LinkIcon,
	QrCode,
	Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";

export type DonationMethodType =
	| "sbp"
	| "card"
	| "yoomoney"
	| "boosty"
	| "donationalerts"
	| "ton"
	| "usdt_trc20"
	| "btc"
	| "custom";

export interface DonationMethod {
	type: DonationMethodType;
	value: string;
	label?: string;
}

type Translator = (key: string) => string;

function getMethodMeta(
	type: DonationMethodType,
	t: Translator,
): {
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	action: "open" | "copy";
	hint?: string;
} {
	switch (type) {
		case "boosty":
			return { title: "Boosty", icon: HandCoins, action: "open" };
		case "donationalerts":
			return { title: "DonationAlerts", icon: Gift, action: "open" };
		case "yoomoney":
			return {
				title: "YooMoney",
				icon: Wallet,
				action: "copy",
				hint: t("wallet_copied"),
			};
		case "sbp":
			return {
				title: t("sbp_title"),
				icon: QrCode,
				action: "copy",
				hint: t("sbp_copied"),
			};
		case "card":
			return {
				title: t("card_title"),
				icon: CreditCard,
				action: "copy",
				hint: t("card_copied"),
			};
		case "ton":
			return {
				title: "TON",
				icon: Wallet,
				action: "copy",
				hint: t("address_copied"),
			};
		case "usdt_trc20":
			return {
				title: "USDT TRC20",
				icon: Banknote,
				action: "copy",
				hint: t("address_copied"),
			};
		case "btc":
			return {
				title: "BTC",
				icon: Bitcoin,
				action: "copy",
				hint: t("address_copied"),
			};
		default:
			return { title: t("other_title"), icon: LinkIcon, action: "open" };
	}
}

function isLikelyUrl(value: string) {
	try {
		const u = new URL(value);
		return Boolean(u.protocol);
	} catch {
		return false;
	}
}

export function DonationWidget({
	methods,
	className,
}: {
	methods?: DonationMethod[] | null;
	className?: string;
}) {
	const t = useTranslations("DonationWidget");

	if (!methods || methods.length === 0) return null;

	const handleAction = (method: DonationMethod) => {
		const meta = getMethodMeta(method.type, t);
		if (meta.action === "open" || isLikelyUrl(method.value)) {
			const url = isLikelyUrl(method.value)
				? method.value
				: `https://${method.value}`;
			window.open(url, "_blank", "noopener,noreferrer");
		} else {
			navigator.clipboard
				.writeText(method.value)
				.then(() => toast.success(meta.hint || t("copied")))
				.catch(() => toast.error(t("copy_error")));
		}
	};

	return (
		<Card className={cn("border-primary/20", className)}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<HandCoins className="h-5 w-5" /> {t("support_author")}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground text-sm">
					{t("support_description")}
				</p>
				<Separator />
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{methods.map((m, idx) => {
						const meta = getMethodMeta(m.type, t);
						const Icon = meta.icon;
						const showValue =
							m.type === "card" ? maskCard(m.value) : clipValue(m.value);
						return (
							<Button
								key={idx}
								variant="outline"
								className="press-scale min-h-11 justify-start gap-2"
								onClick={() => handleAction(m)}
							>
								<Icon className="h-4 w-4" />
								<span className="truncate">
									{m.label || meta.title}
									<span className="text-muted-foreground"> · {showValue}</span>
								</span>
							</Button>
						);
					})}
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="secondary">{t("safe")}</Badge>
					<span className="text-muted-foreground text-xs">
						{t("disclaimer")}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}

function maskCard(value: string) {
	const digits = value.replace(/\D/g, "");
	if (digits.length < 8) return value;
	return `${digits.slice(0, 4)} •••• •••• ${digits.slice(-4)}`;
}

function clipValue(value: string, len = 24) {
	if (value.length <= len) return value;
	return `${value.slice(0, len - 3)}...`;
}
