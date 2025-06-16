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

interface MarkdownEditorProps {
	value: string;
	onChange: (value: string) => void;
	height?: number;
	placeholder?: string;
}

export function MarkdownEditor({
	value,
	onChange,
	height = 300,
	placeholder = "Use Markdown for formatting...",
}: MarkdownEditorProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const handleToolbarClick = (syntax: string) => {
		const newText = `${value}\n${syntax}`;
		onChange(newText);
	};

	const handleBold = () => {
		const start = textareaRef.current?.selectionStart ?? 0;
		const end = textareaRef.current?.selectionEnd ?? 0;
		const newValue = `${value.substring(0, start)}**${value.substring(start, end)}**${value.substring(end)}`;
		onChange(newValue);
	};

	const handleItalic = () => {
		const start = textareaRef.current?.selectionStart ?? 0;
		const end = textareaRef.current?.selectionEnd ?? 0;
		const newValue = `${value.substring(0, start)}*${value.substring(start, end)}*${value.substring(end)}`;
		onChange(newValue);
	};

	return (
		<div className="space-y-2">
			<Label htmlFor="description">Full Description</Label>
			<Tabs defaultValue="write" className="w-full rounded-md border">
				<TabsList className="w-full justify-start rounded-b-none border-b bg-muted/60">
					<TabsTrigger value="write">Write</TabsTrigger>
					<TabsTrigger value="preview">Preview</TabsTrigger>
					<div className="ml-auto flex items-center gap-1 pr-2">
						<Button
							size="icon"
							variant="ghost"
							type="button"
							onClick={() => handleToolbarClick("**Bold Text**")}
						>
							<Bold className="h-4 w-4" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							type="button"
							onClick={() => handleToolbarClick("_Italic Text_")}
						>
							<Italic className="h-4 w-4" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							type="button"
							onClick={() => handleToolbarClick("> Blockquote")}
						>
							<Quote className="h-4 w-4" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							type="button"
							onClick={() => handleToolbarClick("```\ncode\n```")}
						>
							<Code className="h-4 w-4" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							type="button"
							onClick={() => handleToolbarClick("* List Item")}
						>
							<List className="h-4 w-4" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							type="button"
							onClick={() => handleToolbarClick("[Link Text](url)")}
						>
							<Link className="h-4 w-4" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							type="button"
							onClick={() => handleToolbarClick("![Alt Text](url)")}
						>
							<ImageIcon className="h-4 w-4" />
						</Button>
					</div>
				</TabsList>
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
				<TabsContent value="preview" className="p-4">
					<div
						className="prose prose-neutral dark:prose-invert max-w-none"
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
