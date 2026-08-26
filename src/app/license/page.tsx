import { useFormatter, useTranslations } from "next-intl";
import { LegalDocument } from "~/components/legal-document";

const LAST_UPDATED = new Date("2026-08-20");

const SECTIONS = [
	"platform_license",
	"user_content",
	"third_party",
	"open_source",
	"contact",
] as const;

export default function LicensePage() {
	const t = useTranslations("License");
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
