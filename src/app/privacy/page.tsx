import { useFormatter, useTranslations } from "next-intl";
import { LegalDocument } from "~/components/legal-document";

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
		<LegalDocument
			badge={t("badge")}
			title={t("title")}
			description={t("description")}
			sections={SECTIONS.map((key) => ({
				id: key,
				title: t(`${key}.title`),
				content: t(`${key}.content`),
			}))}
			lastUpdatedLabel={t("last_updated")}
			lastUpdated={format.dateTime(LAST_UPDATED, {
				year: "numeric",
				month: "long",
				day: "numeric",
			})}
		/>
	);
}
