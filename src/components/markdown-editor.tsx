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
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { TextImprovementButton } from "~/components/text-improvement-button";

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
	placeholder = "Use Markdown for formatting...",
	showImproveButton = false,
	textType = "description",
	pluginName,
}: MarkdownEditorProps) {
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

	return (
		<div className="w-full rounded-md border">
			<Tabs defaultValue="write" className="w-full">
				<div className="flex items-center justify-between border-b px-2 py-1.5 sm:px-3 sm:py-2">
					<TabsList className="h-7 sm:h-8">
						<TabsTrigger value="write" className="text-xs sm:text-sm px-2 sm:px-3">
							Write
						</TabsTrigger>
						<TabsTrigger value="preview" className="text-xs sm:text-sm px-2 sm:px-3">
							Preview
						</TabsTrigger>
					</TabsList>
					<div className="flex items-center gap-0.5 sm:gap-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => insertMarkdown("**", "**")}
							className="h-6 w-6 p-0 sm:h-8 sm:w-8"
						>
							<Bold className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => insertMarkdown("*", "*")}
							className="h-6 w-6 p-0 sm:h-8 sm:w-8"
						>
							<Italic className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => insertMarkdown("`", "`")}
							className="h-6 w-6 p-0 sm:h-8 sm:w-8"
						>
							<Code className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => insertMarkdown("[", "](url)")}
							className="h-6 w-6 p-0 sm:h-8 sm:w-8"
						>
							<Link className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => insertMarkdown("\n- ", "")}
							className="h-6 w-6 p-0 sm:h-8 sm:w-8"
						>
							<List className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => insertMarkdown("\n> ", "")}
							className="h-6 w-6 p-0 sm:h-8 sm:w-8"
						>
							<Quote className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => insertMarkdown("\n![alt](", ")")}
							className="h-6 w-6 p-0 sm:h-8 sm:w-8"
						>
							<ImageIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
						</Button>
						{showImproveButton && (
							<>
								<div className="mx-0.5 h-4 w-px bg-border sm:mx-1" />
								<TextImprovementButton
									text={value}
									textType={textType}
									pluginName={pluginName}
									onImprovedText={onChange}
									size="sm"
									variant="ghost"
								/>
							</>
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
						placeholder={placeholder}
						className="w-full resize-y rounded-t-none border-0 focus:ring-0"
					/>
				</TabsContent>
				<TabsContent value="preview" className="p-3 sm:p-4">
					<div
						className="prose max-w-none"
						style={{ minHeight: `${height}px` }}
					>
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{value || "Nothing to preview."}
						</ReactMarkdown>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
