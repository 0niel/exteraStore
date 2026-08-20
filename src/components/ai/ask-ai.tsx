"use client";

import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

interface AskAiProps {
	pluginId: number;
	pluginName: string;
}

export function AskAi({ pluginId, pluginName }: AskAiProps) {
	const t = useTranslations("AI");
	const rawLocale = useLocale();
	const locale = rawLocale === "en" ? ("en" as const) : ("ru" as const);
	const [open, setOpen] = useState(false);
	const [question, setQuestion] = useState("");
	const [answer, setAnswer] = useState<string | null>(null);
	const [limitReached, setLimitReached] = useState(false);
	const [failed, setFailed] = useState(false);

	const askMutation = api.ai.askAboutPlugin.useMutation({
		onSuccess: (data) => {
			setAnswer(data.answer);
		},
		onError: (error) => {
			if (error.data?.code === "TOO_MANY_REQUESTS") {
				setLimitReached(true);
			} else {
				setFailed(true);
			}
		},
	});

	const suggestions = [
		t("ask_suggestion_what"),
		t("ask_suggestion_safe"),
		t("ask_suggestion_setup"),
	];

	const submit = (text: string) => {
		const trimmed = text.trim();
		if (!trimmed || askMutation.isPending) return;
		setAnswer(null);
		setFailed(false);
		setLimitReached(false);
		setQuestion(trimmed);
		askMutation.mutate({ pluginId, question: trimmed.slice(0, 500), locale });
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					className="press-scale min-h-11 gap-2 border-primary/30"
				>
					<Sparkles className="h-4 w-4 text-primary" />
					{t("ask_button")}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="h-5 w-5 text-primary" />
						{t("ask_title", { name: pluginName })}
					</DialogTitle>
					<DialogDescription>{t("ask_description")}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex flex-wrap gap-2">
						{suggestions.map((suggestion) => (
							<button
								key={suggestion}
								type="button"
								onClick={() => submit(suggestion)}
								disabled={askMutation.isPending}
								className="press-scale tap-highlight-none min-h-11 rounded-full bg-primary/10 px-4 font-medium text-primary text-sm transition-colors hover:bg-primary/15 disabled:opacity-50"
							>
								{suggestion}
							</button>
						))}
					</div>

					<Textarea
						value={question}
						onChange={(event) => setQuestion(event.target.value)}
						placeholder={t("ask_placeholder")}
						maxLength={500}
						rows={3}
						className="resize-none"
					/>

					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground text-xs">
							{question.length}/500
						</span>
						<Button
							onClick={() => submit(question)}
							disabled={askMutation.isPending || !question.trim()}
							className="min-h-11"
						>
							<Sparkles className="mr-2 h-4 w-4" />
							{t("ask_submit")}
						</Button>
					</div>

					{askMutation.isPending && (
						<div className="flex items-center gap-2 rounded-lg bg-muted/50 p-4 text-muted-foreground text-sm">
							<span className="flex gap-1">
								{[0, 1, 2].map((dot) => (
									<span
										key={dot}
										className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary"
										style={{ animationDelay: `${dot * 200}ms` }}
									/>
								))}
							</span>
							{t("ask_thinking")}
						</div>
					)}

					{limitReached && (
						<p className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
							{t("ask_limit_note")}
						</p>
					)}

					{failed && (
						<p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
							{t("ask_error")}
						</p>
					)}

					{answer && (
						<div className="prose prose-neutral dark:prose-invert max-w-none rounded-lg border bg-card p-4 text-sm">
							<ReactMarkdown>{answer}</ReactMarkdown>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
