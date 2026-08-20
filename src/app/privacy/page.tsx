import { useFormatter, useTranslations } from "next-intl";
import { PageHeader } from "~/components/page-header";
import { Card, CardContent } from "~/components/ui/card";

const LAST_UPDATED = new Date("2026-08-20");

const SECTIONS = [
	"information_collection",
	"information_use",
	"data_protection",
	"cookies",
	"third_party",
	"contact",
] as const;

export default function PrivacyPage() {
	const t = useTranslations("Privacy");
	const format = useFormatter();

	return (
		<div className="relative isolate overflow-hidden">
			<div className="grid-fade absolute inset-x-0 top-0 -z-10 h-80" />
			<div className="absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
			<div className="container mx-auto max-w-4xl px-4 py-10 sm:py-14">
				<PageHeader
					badge={t("badge")}
					title={t("title")}
					description={t("description")}
				/>

				<Card className="animate-fade-up py-6 sm:py-8">
					<CardContent>
						<div className="prose prose-neutral dark:prose-invert">
							{SECTIONS.map((key, index) => (
								<section key={key}>
									<h2 className="flex items-baseline gap-3">
										<span className="font-mono font-semibold text-primary text-sm">
											{String(index + 1).padStart(2, "0")}
										</span>
										{t(`${key}.title`)}
									</h2>
									<p>{t(`${key}.content`)}</p>
								</section>
							))}
						</div>
					</CardContent>
				</Card>

				<p className="mt-6 flex items-center justify-center gap-2 font-mono text-muted-foreground text-xs uppercase tracking-wider">
					<span className="size-1.5 rounded-full bg-primary" />
					{t("last_updated")}:{" "}
					{format.dateTime(LAST_UPDATED, {
						year: "numeric",
						month: "long",
						day: "numeric",
					})}
				</p>
			</div>
		</div>
	);
}
