import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { StructuredData } from "~/components/structured-data";
import { absoluteUrl, OPEN_GRAPH_IMAGE } from "~/lib/site";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale();
	const description =
		locale === "ru"
			? "Каталог проверенных сообществом плагинов для exteraGram и exteraless с рейтингами, версиями, зависимостями и проверками безопасности."
			: "A community-reviewed catalog of exteraGram and exteraless plugins with ratings, releases, dependencies and security checks.";
	return {
		title: locale === "ru" ? "Каталог плагинов" : "Plugin catalog",
		description,
		alternates: { canonical: "/plugins" },
		openGraph: {
			title:
				locale === "ru"
					? "Каталог плагинов для exteraGram и exteraless"
					: "Plugin catalog for exteraGram and exteraless",
			description,
			url: absoluteUrl("/plugins"),
			images: [OPEN_GRAPH_IMAGE],
		},
	};
}

export default async function PluginsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const locale = await getLocale();
	const description =
		locale === "ru"
			? "Каталог проверенных сообществом плагинов для exteraGram и exteraless с рейтингами, версиями, зависимостями и проверками безопасности."
			: "A community-reviewed catalog of exteraGram and exteraless plugins with ratings, releases, dependencies and security checks.";
	return (
		<>
			<StructuredData
				data={{
					"@context": "https://schema.org",
					"@type": "CollectionPage",
					name:
						locale === "ru"
							? "Каталог плагинов exteraStore"
							: "exteraStore plugin catalog",
					description,
					url: absoluteUrl("/plugins"),
					isPartOf: { "@id": `${absoluteUrl("/")}#website` },
				}}
			/>
			{children}
		</>
	);
}
