import { useTranslations } from "next-intl";
import { PageHeader } from "~/components/page-header";

export default function PrivacyPage() {
	const t = useTranslations("Privacy");

	return (
		<div className="container mx-auto px-4 py-8">
			<PageHeader
				badge={t("badge")}
				title={t("title")}
				description={t("description")}
			/>
			
			<div className="mt-8 prose prose-neutral dark:prose-invert max-w-none">
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

				<p className="text-sm text-muted-foreground mt-8">
					{t("last_updated")}: {new Date().toLocaleDateString()}
				</p>
			</div>
		</div>
	);
} 