"use client";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function ErrorPage({
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-12">
			<div className="w-full max-w-lg rounded-3xl border bg-card p-6 text-center shadow-sm sm:p-10">
				<div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
					<AlertTriangle className="size-7" />
				</div>
				<h1 className="mt-5 text-balance font-bold text-2xl tracking-tight sm:text-3xl">
					Что-то пошло не так
				</h1>
				<p className="mt-3 text-pretty text-muted-foreground">
					Не удалось загрузить страницу. Попробуйте ещё раз или вернитесь на
					главную.
				</p>
				<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button onClick={reset}>
						<RotateCcw />
						Повторить
					</Button>
					<Button asChild variant="outline">
						<Link href="/">
							<Home />
							На главную
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
