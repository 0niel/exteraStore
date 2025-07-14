import { useTranslations } from "next-intl";
import { PageHeader } from "~/components/page-header";

export default function CookiesPage() {
	const t = useTranslations("Cookies");

	return (
		<div className="container mx-auto px-4 py-8">
			<PageHeader
				badge={t("badge")}
				title={t("title")}
				description={t("description")}
			/>
			
			<div className="mt-8 prose prose-neutral dark:prose-invert max-w-none">
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

				<p className="text-sm text-muted-foreground mt-8">
					{t("last_updated")}: {new Date().toLocaleDateString()}
				</p>
			</div>
		</div>
	);
} 