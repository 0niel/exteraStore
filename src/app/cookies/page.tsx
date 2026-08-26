import { useFormatter, useTranslations } from "next-intl";
import { LegalDocument } from "~/components/legal-document";

const LAST_UPDATED = new Date("2026-08-20");

const SECTIONS = [
	"what_are_cookies",
	"how_we_use",
	"types_of_cookies",
	"manage_cookies",
	"contact",
] as const;

export default function CookiesPage() {
	const t = useTranslations("Cookies");
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
