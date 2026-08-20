import { useFormatter, useTranslations } from "next-intl";
import { PageHeader } from "~/components/page-header";

const LAST_UPDATED = new Date("2026-08-20");

export default function PrivacyPage() {
	const t = useTranslations("Privacy");
	const format = useFormatter();

	return (
		<div className="container mx-auto px-4 py-8">
			<PageHeader
				badge={t("badge")}
				title={t("title")}
				description={t("description")}
			/>

			<div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
				<h2>{t("information_collection.title")}</h2>
				<p>{t("information_collection.content")}</p>

				<h2>{t("information_use.title")}</h2>
				<p>{t("information_use.content")}</p>

				<h2>{t("data_protection.title")}</h2>
				<p>{t("data_protection.content")}</p>

				<h2>{t("cookies.title")}</h2>
				<p>{t("cookies.content")}</p>

				<h2>{t("third_party.title")}</h2>
				<p>{t("third_party.content")}</p>

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
