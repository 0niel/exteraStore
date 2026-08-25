"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";

interface TagInputProps {
	value: string[];
	onChange: (tags: string[]) => void;
	placeholder?: string;
	suggestions?: string[];
}

export function TagInput({
	value: tags,
	onChange,
	placeholder,
}: TagInputProps) {
	const t = useTranslations("TagInput");
	const reduceMotion = useReducedMotion();
	const [inputValue, setInputValue] = useState("");
	const handleAddTag = useCallback(
		(tagToAdd: string) => {
			const newTag = tagToAdd.trim();
			if (newTag && !tags.includes(newTag)) {
				onChange([...tags, newTag]);
			}
			setInputValue("");
		},
		[tags, onChange],
	);

	const handleRemoveTag = (tagToRemove: string) => {
		onChange(tags.filter((tag) => tag !== tagToRemove));
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			handleAddTag(inputValue);
		} else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
			handleRemoveTag(tags[tags.length - 1] as string);
		}
	};

	return (
		<div className="flex min-h-12 flex-wrap items-center gap-2 rounded-2xl bg-surface px-4 py-2.5 ring-1 ring-transparent transition-[background-color,box-shadow] duration-200 focus-within:bg-background focus-within:ring-[3px] focus-within:ring-primary/20 hover:bg-accent/75">
			<AnimatePresence initial={false}>
				{tags.map((tag) => (
					<motion.span
						key={tag}
						layout={!reduceMotion}
						initial={reduceMotion ? false : { opacity: 0, scale: 0.75 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={reduceMotion ? undefined : { opacity: 0, scale: 0.75 }}
						transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
						className="inline-flex"
					>
						<Badge
							variant="secondary"
							className="gap-1 rounded-full border-transparent bg-primary/10 py-1 pr-1 pl-2.5 text-primary"
						>
							{tag}
							<button
								type="button"
								onClick={() => handleRemoveTag(tag)}
								className="tap-highlight-none relative flex size-5 items-center justify-center rounded-full transition-colors before:absolute before:-inset-2 before:content-[''] hover:bg-primary/20"
								aria-label={t("remove_tag", { tag })}
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					</motion.span>
				))}
			</AnimatePresence>
			<Input
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder || t("add_tag")}
				className="m-0 h-auto min-h-8 min-w-24 flex-1 bg-transparent p-0 ring-0 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0"
			/>
		</div>
	);
}
