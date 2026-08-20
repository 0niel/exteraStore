import { useFormatter, useTranslations } from "next-intl";
import { PageHeader } from "~/components/page-header";

const LAST_UPDATED = new Date("2026-08-20");

export default function CookiesPage() {
	const t = useTranslations("Cookies");
	const format = useFormatter();

	return (
		<div className="container mx-auto px-4 py-8">
			<PageHeader
				badge={t("badge")}
				title={t("title")}
				description={t("description")}
			/>

			<div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
				<h2>{t("what_are_cookies.title")}</h2>
				<p>{t("what_are_cookies.content")}</p>

				<h2>{t("how_we_use.title")}</h2>
				<p>{t("how_we_use.content")}</p>

				<h2>{t("types_of_cookies.title")}</h2>
				<p>{t("types_of_cookies.content")}</p>

				<h2>{t("manage_cookies.title")}</h2>
				<p>{t("manage_cookies.content")}</p>

				<h2>{t("contact.title")}</h2>
				<p>{t("contact.content")}</p>

				<p className="mt-8 text-muted-foreground text-sm">
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
