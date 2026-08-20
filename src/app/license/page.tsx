import { useFormatter, useTranslations } from "next-intl";
import { PageHeader } from "~/components/page-header";

const LAST_UPDATED = new Date("2026-08-20");

export default function LicensePage() {
	const t = useTranslations("License");
	const format = useFormatter();

	return (
		<div className="container mx-auto px-4 py-8">
			<PageHeader
				badge={t("badge")}
				title={t("title")}
				description={t("description")}
			/>

			<div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
				<h2>{t("platform_license.title")}</h2>
				<p>{t("platform_license.content")}</p>

				<h2>{t("user_content.title")}</h2>
				<p>{t("user_content.content")}</p>

				<h2>{t("third_party.title")}</h2>
				<p>{t("third_party.content")}</p>

				<h2>{t("open_source.title")}</h2>
				<p>{t("open_source.content")}</p>

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
