"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	AlertTriangle,
	Eye,
	HeartHandshake,
	Info,
	Plus,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import {
	assessDonationMethod,
	DONATION_METHOD_TYPES,
	type DonationMethod,
	type DonationMethodType,
} from "~/lib/donation-requisites";

const TYPE_PLACEHOLDERS: Record<DonationMethodType, string> = {
	sbp: "https://qr.nspk.ru/...",
	card: "0000 0000 0000 0000",
	yoomoney: "4100...",
	boosty: "https://boosty.to/username",
	donationalerts: "https://www.donationalerts.com/r/...",
	ton: "UQ...",
	usdt_trc20: "T...",
	btc: "bc1...",
	custom: "https://...",
};

const ASSESSMENT_STYLES = {
	info: "bg-background/70 text-muted-foreground",
	safe: "bg-success/10 text-success",
	warning: "bg-warning/10 text-warning-foreground",
	danger: "bg-destructive/10 text-destructive",
} as const;

function inputMode(type: DonationMethodType) {
	if (type === "card") return "numeric" as const;
	if (["sbp", "boosty", "donationalerts", "custom"].includes(type)) {
		return "url" as const;
	}
	return "text" as const;
}

export function DonationRequisitesEditor({
	value,
	onChange,
}: {
	value: DonationMethod[];
	onChange: (next: DonationMethod[]) => void;
}) {
	const t = useTranslations("DonationEditor");
	const reduceMotion = useReducedMotion();
	const methods = value || [];
	const assessments = methods.map(assessDonationMethod);
	const riskCount = assessments.filter(
		(item) => item.level === "danger" || item.level === "warning",
	).length;

	const addMethod = () => {
		if (methods.length >= 8) return;
		onChange([...methods, { type: "boosty", value: "", label: "Boosty" }]);
	};

	const updateMethod = (index: number, patch: Partial<DonationMethod>) => {
		onChange(
			methods.map((method, i) =>
				i === index ? ({ ...method, ...patch } as DonationMethod) : method,
			),
		);
	};

	const removeMethod = (index: number) => {
		onChange(methods.filter((_, i) => i !== index));
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<CardTitle className="flex items-center gap-3">
						<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<HeartHandshake className="h-4 w-4" />
						</span>
						{t("title")}
					</CardTitle>
					{methods.length > 0 && (
						<Badge
							variant="secondary"
							className={
								riskCount > 0
									? "bg-warning/10 text-warning-foreground"
									: "bg-success/10 text-success"
							}
						>
							{riskCount > 0
								? t("risks_found", { count: riskCount })
								: t("safe_status")}
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-start gap-3 rounded-2xl bg-warning/10 p-4 text-sm leading-relaxed">
					<Eye className="mt-0.5 size-5 shrink-0 text-warning" />
					<div>
						<p className="font-semibold text-foreground">{t("public_title")}</p>
						<p className="mt-1 text-muted-foreground">{t("public_hint")}</p>
					</div>
				</div>
				<div className="space-y-3">
					{methods.length === 0 && (
						<p className="text-muted-foreground text-sm">{t("empty_hint")}</p>
					)}
					<AnimatePresence initial={false}>
						{methods.map((m, idx) => {
							const assessment = assessments[idx] || {
								code: "empty" as const,
								level: "info" as const,
							};
							const AssessmentIcon =
								assessment.level === "safe"
									? ShieldCheck
									: assessment.level === "info"
										? Info
										: AlertTriangle;
							return (
								<motion.div
									key={idx}
									layout={!reduceMotion}
									initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
									transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
									className="rounded-2xl bg-surface p-3 sm:p-4"
								>
									<div className="mb-3 flex items-center justify-between gap-3">
										<span className="font-semibold text-sm">
											{t("method_number", { number: idx + 1 })}
										</span>
										<Button
											variant="ghost"
											size="icon"
											className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
											onClick={() => removeMethod(idx)}
											aria-label={t("remove")}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-12">
										<div className="sm:col-span-2 md:col-span-3">
											<Label
												htmlFor={`donation-type-${idx}`}
												className="mb-2 px-0.5 text-muted-foreground text-xs"
											>
												{t("type_label")}
											</Label>
											<Select
												value={m.type}
												onValueChange={(v: DonationMethodType) =>
													updateMethod(idx, { type: v })
												}
											>
												<SelectTrigger
													id={`donation-type-${idx}`}
													className="w-full"
												>
													<SelectValue placeholder={t("type_label")} />
												</SelectTrigger>
												<SelectContent>
													{DONATION_METHOD_TYPES.map((type) => (
														<SelectItem key={type} value={type}>
															{t(`type_${type}`)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="md:col-span-5">
											<Label
												htmlFor={`donation-value-${idx}`}
												className="mb-2 px-0.5 text-muted-foreground text-xs"
											>
												{t("value_label")}
											</Label>
											<Input
												id={`donation-value-${idx}`}
												value={m.value}
												onChange={(e) =>
													updateMethod(idx, { value: e.target.value })
												}
												placeholder={TYPE_PLACEHOLDERS[m.type]}
												maxLength={500}
												inputMode={inputMode(m.type)}
												autoComplete="off"
												autoCapitalize="none"
												spellCheck={false}
												aria-describedby={`donation-assessment-${idx}`}
											/>
										</div>
										<div className="sm:col-span-2 md:col-span-4">
											<div className="flex-1">
												<Label
													htmlFor={`donation-label-${idx}`}
													className="mb-2 px-0.5 text-muted-foreground text-xs"
												>
													{t("label_label")}
												</Label>
												<Input
													id={`donation-label-${idx}`}
													value={m.label || ""}
													onChange={(e) =>
														updateMethod(idx, { label: e.target.value })
													}
													placeholder={t("label_placeholder")}
													maxLength={80}
												/>
											</div>
										</div>
									</div>
									<div
										id={`donation-assessment-${idx}`}
										role="status"
										aria-live="polite"
										className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-relaxed ${ASSESSMENT_STYLES[assessment.level]}`}
									>
										<AssessmentIcon className="mt-0.5 size-4 shrink-0" />
										<span>{t(`assessment_${assessment.code}`)}</span>
									</div>
								</motion.div>
							);
						})}
					</AnimatePresence>
				</div>

				<div className="flex gap-2">
					<Button
						variant="secondary"
						onClick={addMethod}
						disabled={methods.length >= 8}
						className="min-h-11 w-full bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary md:w-auto"
					>
						<Plus className="mr-2 h-4 w-4" />
						{t("add_method")}
					</Button>
				</div>
				<p className="text-muted-foreground text-xs">
					{methods.length >= 8 ? t("limit_reached") : t("fields_hint")}
				</p>
			</CardContent>
		</Card>
	);
}
