import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { absoluteUrl, OPEN_GRAPH_IMAGE } from "~/lib/site";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale();
	const description =
		locale === "ru"
			? "Разработчики плагинов для exteraGram и exteraless: проекты, рейтинги, загрузки и публичные профили авторов."
			: "Developers building plugins for exteraGram and exteraless, with projects, ratings, downloads and public profiles.";
	return {
		title: locale === "ru" ? "Разработчики плагинов" : "Plugin developers",
		description,
		alternates: { canonical: "/developers" },
		openGraph: {
			title:
				locale === "ru" ? "Разработчики exteraStore" : "exteraStore developers",
			description,
			url: absoluteUrl("/developers"),
			images: [OPEN_GRAPH_IMAGE],
		},
	};
}

export default function DevelopersLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
