"use client";

import {
	Check,
	Copy,
	Loader2,
	LogIn,
	RotateCcw,
	Send,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
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

interface ConversationItem {
	question: string;
	answer: string;
}

export function AskAi({ pluginId, pluginName }: AskAiProps) {
	const t = useTranslations("AI");
	const rawLocale = useLocale();
	const locale = rawLocale === "en" ? ("en" as const) : ("ru" as const);
	const { status } = useSession();
	const [open, setOpen] = useState(false);
	const [question, setQuestion] = useState("");
	const [history, setHistory] = useState<ConversationItem[]>([]);
	const [remaining, setRemaining] = useState<number | null>(null);
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
	const [limitReached, setLimitReached] = useState(false);
	const [failed, setFailed] = useState(false);
	const [unavailable, setUnavailable] = useState(false);

	const askMutation = api.ai.askAboutPlugin.useMutation({
		onSuccess: (data, variables) => {
			setHistory((current) => [
				...current.slice(-4),
				{ question: variables.question, answer: data.answer },
			]);
			setRemaining(data.remaining);
			setQuestion("");
		},
		onError: (error) => {
			if (error.data?.code === "TOO_MANY_REQUESTS") {
				setLimitReached(true);
			} else if (error.data?.code === "SERVICE_UNAVAILABLE") {
				setUnavailable(true);
			} else {
				setFailed(true);
			}
		},
	});

	const suggestions = [
		t("ask_suggestion_what"),
		t("ask_suggestion_safe"),
		t("ask_suggestion_setup"),
		t("ask_suggestion_privacy"),
		t("ask_suggestion_fit"),
	];

	const submit = (text: string) => {
		const trimmed = text.trim();
		if (!trimmed || askMutation.isPending) return;
		setFailed(false);
		setUnavailable(false);
		setLimitReached(false);
		setQuestion(trimmed);
		askMutation.mutate({
			pluginId,
			question: trimmed.slice(0, 500),
			locale,
			history: history.slice(-5),
		});
	};

	const copyAnswer = async (answer: string, index: number) => {
		try {
			await navigator.clipboard.writeText(answer);
			setCopiedIndex(index);
			toast.success(t("ask_copied"));
			window.setTimeout(() => setCopiedIndex(null), 1600);
		} catch {
			toast.error(t("ask_copy_failed"));
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					className="press-scale min-h-11 gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10"
				>
					<Sparkles className="h-4 w-4 text-primary" />
					{t("ask_button")}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-3 pr-8">
						<span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
							<Sparkles className="size-5" />
						</span>
						{t("ask_title", { name: pluginName })}
					</DialogTitle>
					<DialogDescription>{t("ask_description")}</DialogDescription>
				</DialogHeader>

				{status === "loading" ? (
					<div className="flex min-h-56 items-center justify-center rounded-2xl border bg-surface">
						<Loader2 className="size-7 animate-spin text-primary" />
					</div>
				) : status === "unauthenticated" ? (
					<div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border bg-surface p-6 text-center">
						<span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
							<LogIn className="size-5" />
						</span>
						<h3 className="font-semibold">{t("ask_sign_in_title")}</h3>
						<p className="mt-2 max-w-sm text-muted-foreground text-sm">
							{t("ask_sign_in_description")}
						</p>
						<Button asChild className="mt-5 w-full sm:w-auto">
							<Link href="/auth/signin">
								<LogIn className="size-4" />
								{t("ask_sign_in")}
							</Link>
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						{history.length > 0 && (
							<div className="max-h-[42dvh] space-y-3 overflow-y-auto overscroll-contain pr-1">
								{history.map((item, index) => (
									<div key={`${item.question}-${index}`} className="space-y-2">
										<div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-contrast px-4 py-2.5 text-contrast-foreground text-sm">
											{item.question}
										</div>
										<div className="relative rounded-2xl rounded-tl-md border border-primary/20 bg-linear-to-br from-primary/7 via-card to-card p-4 pr-12">
											<div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
												<ReactMarkdown>{item.answer}</ReactMarkdown>
											</div>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="absolute top-2 right-2 size-9 rounded-xl"
												onClick={() => void copyAnswer(item.answer, index)}
												aria-label={t("ask_copy")}
											>
												{copiedIndex === index ? (
													<Check className="size-4 text-success" />
												) : (
													<Copy className="size-4" />
												)}
											</Button>
										</div>
									</div>
								))}
							</div>
						)}

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

						<div className="relative">
							<Textarea
								value={question}
								onChange={(event) => setQuestion(event.target.value)}
								onKeyDown={(event) => {
									if (
										event.key === "Enter" &&
										(event.metaKey || event.ctrlKey)
									) {
										event.preventDefault();
										submit(question);
									}
								}}
								placeholder={t("ask_placeholder")}
								maxLength={500}
								rows={3}
								className="resize-none rounded-2xl pr-14"
							/>
							<Button
								type="button"
								size="icon"
								className="absolute right-2 bottom-2 size-10 rounded-xl"
								onClick={() => submit(question)}
								disabled={askMutation.isPending || !question.trim()}
								aria-label={t("ask_submit")}
							>
								<Send className="size-4" />
							</Button>
						</div>

						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-3 text-muted-foreground text-xs">
								<span>{question.length}/500</span>
								{remaining !== null && (
									<span>{t("ask_remaining", { count: remaining })}</span>
								)}
							</div>
							{history.length > 0 && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="min-h-10"
									onClick={() => setHistory([])}
								>
									<RotateCcw className="size-3.5" />
									{t("ask_new")}
								</Button>
							)}
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

						{unavailable && (
							<p className="rounded-lg bg-muted p-3 text-muted-foreground text-sm">
								{t("unavailable")}
							</p>
						)}

						{failed && (
							<p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
								{t("ask_error")}
							</p>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
