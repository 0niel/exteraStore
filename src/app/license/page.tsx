import { useTranslations } from "next-intl";
import { PageHeader } from "~/components/page-header";

export default function LicensePage() {
	const t = useTranslations("License");

	return (
		<div className="container mx-auto px-4 py-8">
			<PageHeader
				badge={t("badge")}
				title={t("title")}
				description={t("description")}
			/>
			
			<div className="mt-8 prose prose-neutral dark:prose-invert max-w-none">
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

				<p className="text-sm text-muted-foreground mt-8">
					{t("last_updated")}: {new Date().toLocaleDateString()}
				</p>
			</div>
		</div>
	);
} 