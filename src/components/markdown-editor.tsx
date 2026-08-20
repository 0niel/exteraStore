"use client";

import {
	Bold,
	Code,
	Image as ImageIcon,
	Italic,
	Link,
	List,
	Quote,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { TextImprovementButton } from "~/components/text-improvement-button";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";

interface MarkdownEditorProps {
	value: string;
	onChange: (value: string) => void;
	height?: number;
	placeholder?: string;
	showImproveButton?: boolean;
	textType?: "description" | "changelog";
	pluginName?: string;
}

export function MarkdownEditor({
	value,
	onChange,
	height = 300,
	placeholder,
	showImproveButton = false,
	textType = "description",
	pluginName,
}: MarkdownEditorProps) {
	const t = useTranslations("MarkdownEditor");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const insertMarkdown = (before: string, after = "") => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selectedText = value.substring(start, end);
		const newValue =
			value.substring(0, start) +
			before +
			selectedText +
			after +
			value.substring(end);

		onChange(newValue);

		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(
				start + before.length,
				start + before.length + selectedText.length,
			);
		}, 10);
	};

	const toolbarActions = [
		{ label: t("bold"), icon: Bold, action: () => insertMarkdown("**", "**") },
		{
			label: t("italic"),
			icon: Italic,
			action: () => insertMarkdown("*", "*"),
		},
		{ label: t("code"), icon: Code, action: () => insertMarkdown("`", "`") },
		{
			label: t("link"),
			icon: Link,
			action: () => insertMarkdown("[", "](url)"),
		},
		{ label: t("list"), icon: List, action: () => insertMarkdown("\n- ", "") },
		{
			label: t("quote"),
			icon: Quote,
			action: () => insertMarkdown("\n> ", ""),
		},
		{
			label: t("image"),
			icon: ImageIcon,
			action: () => insertMarkdown("\n![alt](", ")"),
		},
	];

	return (
		<div className="w-full overflow-hidden rounded-xl border shadow-soft">
			<Tabs defaultValue="write" className="w-full">
				<div className="border-b bg-surface">
					<div className="flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2">
						<TabsList className="h-9 sm:h-8">
							<TabsTrigger value="write" className="px-3 text-xs sm:text-sm">
								{t("write")}
							</TabsTrigger>
							<TabsTrigger value="preview" className="px-3 text-xs sm:text-sm">
								{t("preview")}
							</TabsTrigger>
						</TabsList>
						{showImproveButton && (
							<TextImprovementButton
								text={value}
								textType={textType}
								pluginName={pluginName}
								onImprovedText={onChange}
								size="sm"
								variant="ghost"
								className="hidden sm:flex"
							/>
						)}
					</div>
					<div className="flex flex-wrap items-center gap-0.5 px-2 pb-1.5 sm:gap-1 sm:px-3 sm:pb-2">
						{toolbarActions.map((item) => (
							<Button
								key={item.label}
								type="button"
								variant="ghost"
								size="sm"
								onClick={item.action}
								className="h-11 w-11 p-0 sm:h-8 sm:w-8"
								title={item.label}
								aria-label={item.label}
							>
								<item.icon className="h-3.5 w-3.5" />
							</Button>
						))}
						{showImproveButton && (
							<TextImprovementButton
								text={value}
								textType={textType}
								pluginName={pluginName}
								onImprovedText={onChange}
								size="sm"
								variant="ghost"
								className="sm:hidden"
							/>
						)}
					</div>
				</div>

				<TabsContent value="write" className="p-0">
					<Textarea
						id="description"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						ref={textareaRef}
						style={{ height: `${height}px` }}
						placeholder={placeholder || t("placeholder")}
						className="w-full resize-y rounded-t-none border-0 focus:ring-0"
					/>
				</TabsContent>
				<TabsContent value="preview" className="p-3 sm:p-4">
					<div
						className="prose max-w-none"
						style={{ minHeight: `${height}px` }}
					>
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{value || t("nothing_to_preview")}
						</ReactMarkdown>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
