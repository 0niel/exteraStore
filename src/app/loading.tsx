import { useTranslations } from "next-intl";

export default function Loading() {
	const t = useTranslations("Errors");

	return (
		<div
			className="flex min-h-[60dvh] items-center justify-center px-4"
			aria-busy="true"
		>
			<div className="flex flex-col items-center gap-4">
				<div className="flex h-14 w-14 animate-pulse-dot items-center justify-center rounded-2xl bg-primary shadow-lg">
					<span className="font-bold text-lg text-primary-foreground">eS</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="size-1.5 animate-pulse-dot rounded-full bg-primary" />
					<span className="size-1.5 animate-pulse-dot rounded-full bg-primary [animation-delay:200ms]" />
					<span className="size-1.5 animate-pulse-dot rounded-full bg-primary [animation-delay:400ms]" />
				</div>
				<span className="sr-only">{t("loading")}</span>
			</div>
		</div>
	);
}
