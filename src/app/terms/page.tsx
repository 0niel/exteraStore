import { useTranslations } from "next-intl";
import { PageHeader } from "~/components/page-header";

export default function TermsPage() {
	const t = useTranslations("Terms");

	return (
		<div className="container mx-auto px-4 py-8">
			<PageHeader
				badge={t("badge")}
				title={t("title")}
				description={t("description")}
			/>
			
			<div className="mt-8 prose prose-neutral dark:prose-invert max-w-none">
				<h2>{t("acceptance.title")}</h2>
				<p>{t("acceptance.content")}</p>

				<h2>{t("services.title")}</h2>
				<p>{t("services.content")}</p>

				<h2>{t("user_accounts.title")}</h2>
				<p>{t("user_accounts.content")}</p>

				<h2>{t("plugin_uploads.title")}</h2>
				<p>{t("plugin_uploads.content")}</p>

				<h2>{t("prohibited_uses.title")}</h2>
				<p>{t("prohibited_uses.content")}</p>

				<h2>{t("intellectual_property.title")}</h2>
				<p>{t("intellectual_property.content")}</p>

				<h2>{t("termination.title")}</h2>
				<p>{t("termination.content")}</p>

				<h2>{t("limitation_liability.title")}</h2>
				<p>{t("limitation_liability.content")}</p>

				<h2>{t("changes.title")}</h2>
				<p>{t("changes.content")}</p>

				<h2>{t("contact.title")}</h2>
				<p>{t("contact.content")}</p>

				<p className="text-sm text-muted-foreground mt-8">
					{t("last_updated")}: {new Date().toLocaleDateString()}
				</p>
			</div>
		</div>
	);
} 