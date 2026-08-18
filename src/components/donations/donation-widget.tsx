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
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
	value: string; // url, phone, wallet, card, etc.
	label?: string; // optional display label
}

function getMethodMeta(type: DonationMethodType): {
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
				title: "ЮMoney",
				icon: Wallet,
				action: "copy",
				hint: "Кошелек скопирован",
			};
		case "sbp":
			return {
				title: "СБП",
				icon: QrCode,
				action: "copy",
				hint: "Реквизиты СБП скопированы",
			};
		case "card":
			return {
				title: "Карта",
				icon: CreditCard,
				action: "copy",
				hint: "Номер карты скопирован",
			};
		case "ton":
			return {
				title: "TON",
				icon: Wallet,
				action: "copy",
				hint: "Адрес TON скопирован",
			};
		case "usdt_trc20":
			return {
				title: "USDT TRC20",
				icon: Banknote,
				action: "copy",
				hint: "Адрес USDT скопирован",
			};
		case "btc":
			return {
				title: "BTC",
				icon: Bitcoin,
				action: "copy",
				hint: "Адрес BTC скопирован",
			};
		case "custom":
		default:
			return { title: "Другое", icon: LinkIcon, action: "open" };
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
	if (!methods || methods.length === 0) return null;

	const handleAction = (method: DonationMethod) => {
		const meta = getMethodMeta(method.type);
		if (meta.action === "open" || isLikelyUrl(method.value)) {
			const url = isLikelyUrl(method.value)
				? method.value
				: `https://${method.value}`;
			window.open(url, "_blank", "noopener,noreferrer");
		} else {
			navigator.clipboard
				.writeText(method.value)
				.then(() => toast.success(meta.hint || "Скопировано"))
				.catch(() => toast.error("Не удалось скопировать"));
		}
	};

	return (
		<Card className={cn("border-primary/20", className)}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<HandCoins className="h-5 w-5" /> Поддержать автора
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground text-sm">
					Если вам нравится этот проект — поддержите автора. Это поможет
					развивать экосистему плагинов.
				</p>
				<Separator />
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{methods.map((m, idx) => {
						const meta = getMethodMeta(m.type);
						const Icon = meta.icon;
						const showValue =
							m.type === "card" ? maskCard(m.value) : clipValue(m.value);
						return (
							<Button
								key={idx}
								variant="outline"
								className="justify-start gap-2"
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
					<Badge variant="secondary">Безопасно</Badge>
					<span className="text-muted-foreground text-xs">
						Мы не храним платежные данные — только реквизиты, указанные автором.
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
