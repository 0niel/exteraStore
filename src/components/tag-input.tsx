"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
	suggestions = [],
}: TagInputProps) {
	const t = useTranslations("TagInput");
	const [inputValue, setInputValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

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
		}
	};

	return (
		<div>
			<div className="flex flex-wrap gap-2 rounded-md border p-2">
				{tags.map((tag, index) => (
					<Badge key={index} variant="secondary">
						{tag}
						<button
							onClick={() => handleRemoveTag(tag)}
							className="ml-1 rounded-full hover:bg-muted-foreground/20"
						>
							<X className="h-3 w-3" />
						</button>
					</Badge>
				))}
				<Input
					ref={inputRef}
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder || t("add_tag")}
					className="m-0 h-auto flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
				/>
			</div>
			{/* Suggestions can be implemented here later */}
		</div>
	);
}
