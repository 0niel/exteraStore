"use client";

import { Sparkles, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

interface TextImprovementButtonProps {
	text: string;
	textType: "description" | "changelog";
	pluginName?: string;
	onImprovedText: (improvedText: string) => void;
	disabled?: boolean;
	size?: "default" | "sm" | "lg" | "icon";
	variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
	className?: string;
}

export function TextImprovementButton({
	text,
	textType,
	pluginName,
	onImprovedText,
	disabled = false,
	size = "sm",
	variant = "outline",
	className,
}: TextImprovementButtonProps) {
	const t = useTranslations("TextImprovement");
	const [isImproving, setIsImproving] = useState(false);

	const improveTextMutation = api.pluginPipeline.improveText.useMutation({
		onSuccess: (result) => {
			onImprovedText(result.improvedText);
			toast.success(t("improvement_success"));
			setIsImproving(false);
		},
		onError: (error) => {
			toast.error(t("improvement_error", { error: error.message }));
			setIsImproving(false);
		},
	});

	const handleImproveText = () => {
		if (!text.trim()) {
			toast.error(t("text_empty"));
			return;
		}

		setIsImproving(true);
		improveTextMutation.mutate({
			text: text.trim(),
			textType,
			pluginName,
		});
	};

	const isDisabled = disabled || isImproving || !text.trim();

	return (
		<Button
			type="button"
			variant={variant}
			size={size}
			onClick={handleImproveText}
			disabled={isDisabled}
			className={`flex items-center gap-1.5 ${className || ""}`}
		>
			{isImproving ? (
				<Loader2 className="h-4 w-4 animate-spin" />
			) : (
				<Sparkles className="h-4 w-4" />
			)}
			{isImproving ? t("improving") : t("improve_text")}
		</Button>
	);
} 