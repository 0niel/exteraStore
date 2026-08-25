"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { HeartHandshake, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type {
	DonationMethod,
	DonationMethodType,
} from "~/components/donations/donation-widget";
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

const TYPE_PLACEHOLDERS: Record<DonationMethodType, string> = {
	sbp: "+7...",
	card: "0000 0000 0000 0000",
	yoomoney: "4100...",
	boosty: "https://boosty.to/username",
	donationalerts: "https://www.donationalerts.com/r/...",
	ton: "UQ...",
	usdt_trc20: "T...",
	btc: "bc1...",
	custom: "https://...",
};

const TYPE_VALUES = Object.keys(TYPE_PLACEHOLDERS) as DonationMethodType[];

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

	const addMethod = () => {
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
				<CardTitle className="flex items-center gap-3">
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<HeartHandshake className="h-4 w-4" />
					</span>
					{t("title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-3">
					{methods.length === 0 && (
						<p className="text-muted-foreground text-sm">{t("empty_hint")}</p>
					)}
					<AnimatePresence initial={false}>
						{methods.map((m, idx) => (
							<motion.div
								key={idx}
								layout={!reduceMotion}
								initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
								transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
								className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-12"
							>
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
											{TYPE_VALUES.map((type) => (
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
									/>
								</div>
								<div className="flex gap-3 sm:col-span-2 md:col-span-4 md:gap-3">
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
										/>
									</div>
									<Button
										variant="outline"
										size="icon"
										className="mt-6 shrink-0"
										onClick={() => removeMethod(idx)}
										aria-label={t("remove")}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</motion.div>
						))}
					</AnimatePresence>
				</div>

				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={addMethod}
						className="min-h-11 w-full border-primary/30 border-dashed text-primary hover:bg-primary/5 hover:text-primary md:w-auto"
					>
						<Plus className="mr-2 h-4 w-4" />
						{t("add_method")}
					</Button>
				</div>
				<p className="text-muted-foreground text-xs">{t("fields_hint")}</p>
			</CardContent>
		</Card>
	);
}
