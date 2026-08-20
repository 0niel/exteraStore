"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

interface TagSuggestProps {
	name: string;
	description: string;
	currentTags: string[];
	onAddTag: (tag: string) => void;
	onApplyCategory: (categorySlug: string) => void;
	categories?: Array<{ slug: string; name: string }>;
}

export function TagSuggest({
	name,
	description,
	currentTags,
	onAddTag,
	onApplyCategory,
	categories,
}: TagSuggestProps) {
	const t = useTranslations("AI");
	const rawLocale = useLocale();
	const locale = rawLocale === "en" ? ("en" as const) : ("ru" as const);
	const reduceMotion = useReducedMotion();
	const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
	const [suggestedCategory, setSuggestedCategory] = useState<string | null>(
		null,
	);

	const suggestMutation = api.ai.suggestTags.useMutation({
		onSuccess: (data) => {
			setSuggestedTags(data.tags);
			setSuggestedCategory(data.category);
		},
		onError: () => {
			toast.error(t("suggest_error"));
		},
	});

	const canSuggest = name.trim().length > 0 && description.trim().length > 0;
	const visibleTags = suggestedTags.filter((tag) => !currentTags.includes(tag));

	return (
		<div className="space-y-3">
			<Button
				type="button"
				variant="ghost"
				className="min-h-11 gap-2 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
				disabled={!canSuggest || suggestMutation.isPending}
				onClick={() =>
					suggestMutation.mutate({
						name: name.trim(),
						description: description.trim(),
						locale,
					})
				}
			>
				{suggestMutation.isPending ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Sparkles className="h-4 w-4" />
				)}
				{suggestMutation.isPending ? t("suggest_loading") : t("suggest_button")}
			</Button>

			{visibleTags.length > 0 && (
				<div className="flex flex-wrap gap-2">
					<AnimatePresence initial={!reduceMotion}>
						{visibleTags.map((tag, index) => (
							<motion.button
								key={tag}
								type="button"
								initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={reduceMotion ? undefined : { opacity: 0, scale: 0.8 }}
								transition={{
									duration: 0.2,
									ease: [0.16, 1, 0.3, 1],
									delay: reduceMotion ? 0 : index * 0.05,
								}}
								onClick={() => onAddTag(tag)}
								className="press-scale tap-highlight-none inline-flex min-h-11 items-center gap-1 rounded-full bg-primary/10 px-3 font-medium text-primary text-sm transition-colors hover:bg-primary/15 md:min-h-8"
							>
								<Plus className="h-3.5 w-3.5" />
								{tag}
							</motion.button>
						))}
					</AnimatePresence>
				</div>
			)}

			{suggestedCategory && (
				<div className="flex flex-wrap items-center gap-2 text-sm">
					<span className="text-muted-foreground">
						{t("suggest_category_label")}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="min-h-11 gap-1.5 rounded-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary md:min-h-8"
						onClick={() => {
							onApplyCategory(suggestedCategory);
							setSuggestedCategory(null);
							toast.success(t("suggest_category_applied"));
						}}
					>
						<Sparkles className="h-3.5 w-3.5 text-primary" />
						{categories?.find((category) => category.slug === suggestedCategory)
							?.name ?? suggestedCategory}
					</Button>
				</div>
			)}
		</div>
	);
}
