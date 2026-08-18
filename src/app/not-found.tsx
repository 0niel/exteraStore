import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function NotFound() {
	return (
		<div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-12">
			<div className="max-w-xl text-center">
				<p className="font-bold text-6xl text-primary tracking-tight sm:text-8xl">
					404
				</p>
				<h1 className="mt-4 text-balance font-bold text-2xl tracking-tight sm:text-4xl">
					Такой страницы нет
				</h1>
				<p className="mt-3 text-pretty text-muted-foreground">
					Возможно, ссылка устарела. Найдите нужный плагин в каталоге или
					вернитесь назад.
				</p>
				<div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button asChild>
						<Link href="/plugins">
							<Search />
							Открыть каталог
						</Link>
					</Button>
					<Button asChild variant="outline">
						<Link href="/">
							<ArrowLeft />
							На главную
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
