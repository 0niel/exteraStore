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
import {
	type DonationMethod,
	type DonationMethodType,
	getSafeDonationUrl,
} from "~/lib/donation-requisites";
import { cn } from "~/lib/utils";

export type {
	DonationMethod,
	DonationMethodType,
} from "~/lib/donation-requisites";

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
		const safeUrl = getSafeDonationUrl(method.value);
		if (meta.action === "open" || (method.type === "sbp" && safeUrl)) {
			if (!safeUrl) {
				toast.error(t("invalid_link"));
				return;
			}
			window.open(safeUrl, "_blank", "noopener,noreferrer");
		} else {
			navigator.clipboard
				.writeText(method.value)
				.then(() => toast.success(meta.hint || t("copied")))
				.catch(() => toast.error(t("copy_error")));
		}
	};

	return (
		<section
			className={cn("rounded-3xl bg-primary/[0.07] p-4 sm:p-5", className)}
		>
			<div className="flex items-start gap-3">
				<span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
					<HandCoins className="h-4 w-4" />
				</span>
				<div className="min-w-0 flex-1">
					<h3 className="font-semibold text-base">{t("support_author")}</h3>
					<p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-relaxed">
						{t("support_description")}
					</p>
				</div>
			</div>
			<div className="mt-4 flex flex-wrap gap-2">
				{methods.map((m, idx) => {
					const meta = getMethodMeta(m.type, t);
					const Icon = meta.icon;
					const showValue =
						m.type === "card" ? maskCard(m.value) : clipValue(m.value);
					return (
						<Button
							key={idx}
							variant="secondary"
							className="press-scale min-h-11 min-w-0 justify-start gap-2 bg-background/75 hover:bg-background"
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
			<div className="mt-4 flex items-start gap-2 text-muted-foreground text-xs leading-relaxed">
				<Badge variant="secondary" className="shrink-0 bg-background/70">
					{t("safe")}
				</Badge>
				<span>{t("disclaimer")}</span>
			</div>
		</section>
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
