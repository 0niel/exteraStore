import { Skeleton } from "~/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="container mx-auto px-4 py-10 sm:py-14" aria-busy="true">
			<div className="mx-auto max-w-3xl space-y-4 text-center">
				<Skeleton className="mx-auto h-5 w-32 rounded-full" />
				<Skeleton className="mx-auto h-12 w-full max-w-xl rounded-xl" />
				<Skeleton className="mx-auto h-5 w-full max-w-md" />
			</div>
			<div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, index) => (
					<Skeleton key={index} className="h-72 rounded-2xl" />
				))}
			</div>
			<span className="sr-only">Загрузка страницы</span>
		</div>
	);
}
