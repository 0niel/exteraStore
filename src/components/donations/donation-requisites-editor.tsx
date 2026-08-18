"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useMemo } from "react";
import type {
	DonationMethod,
	DonationMethodType,
} from "@/components/donations/donation-widget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const TYPES: {
	value: DonationMethodType;
	label: string;
	placeholder: string;
}[] = [
	{
		value: "sbp",
		label: "СБП (телефон/ссылка)",
		placeholder: "+7... или https://...",
	},
	{
		value: "card",
		label: "Банковская карта",
		placeholder: "0000 0000 0000 0000",
	},
	{ value: "yoomoney", label: "ЮMoney", placeholder: "4100..." },
	{
		value: "boosty",
		label: "Boosty",
		placeholder: "https://boosty.to/username",
	},
	{
		value: "donationalerts",
		label: "DonationAlerts",
		placeholder: "https://www.donationalerts.com/r/...",
	},
	{ value: "ton", label: "TON", placeholder: "UQ... кошелек" },
	{ value: "usdt_trc20", label: "USDT TRC20", placeholder: "T... адрес" },
	{ value: "btc", label: "BTC", placeholder: "bc1..." },
	{ value: "custom", label: "Другая ссылка", placeholder: "https://..." },
];

export function DonationRequisitesEditor({
	value,
	onChange,
}: {
	value: DonationMethod[];
	onChange: (next: DonationMethod[]) => void;
}) {
	const methods = value || [];

	const addMethod = () => {
		onChange([...methods, { type: "boosty", value: "", label: "Boosty" }]);
	};

	const updateMethod = (index: number, patch: Partial<DonationMethod>) => {
		const next = [...methods];
		next[index] = { ...next[index]!, ...patch } as DonationMethod;
		onChange(next);
	};

	const removeMethod = (index: number) => {
		onChange(methods.filter((_, i) => i !== index));
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Поддержка автора (реквизиты)</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-3">
					{methods.length === 0 && (
						<p className="text-muted-foreground text-sm">
							Добавьте способы поддержки: СБП, карта, ЮMoney, Boosty и т.д.
						</p>
					)}
					{methods.map((m, idx) => (
						<div key={idx} className="grid grid-cols-1 gap-3 md:grid-cols-12">
							<div className="md:col-span-3">
								<Label className="sr-only">Тип</Label>
								<Select
									value={m.type}
									onValueChange={(v: DonationMethodType) =>
										updateMethod(idx, { type: v })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Тип" />
									</SelectTrigger>
									<SelectContent>
										{TYPES.map((t) => (
											<SelectItem key={t.value} value={t.value}>
												{t.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="md:col-span-5">
								<Label className="sr-only">Значение</Label>
								<Input
									value={m.value}
									onChange={(e) => updateMethod(idx, { value: e.target.value })}
									placeholder={
										TYPES.find((t) => t.value === m.type)?.placeholder
									}
								/>
							</div>
							<div className="md:col-span-3">
								<Label className="sr-only">Метка</Label>
								<Input
									value={m.label || ""}
									onChange={(e) => updateMethod(idx, { label: e.target.value })}
									placeholder="Отображаемое имя"
								/>
							</div>
							<div className="flex items-center justify-end md:col-span-1">
								<Button
									variant="outline"
									size="icon"
									onClick={() => removeMethod(idx)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
					))}
				</div>

				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={addMethod}
						className="w-full md:w-auto"
					>
						<Plus className="mr-2 h-4 w-4" /> Добавить способ
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
