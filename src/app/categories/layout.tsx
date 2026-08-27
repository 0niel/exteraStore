import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { absoluteUrl, OPEN_GRAPH_IMAGE } from "~/lib/site";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale();
	const description =
		locale === "ru"
			? "Категории плагинов exteraStore: безопасность, автоматизация, интерфейс, медиа, продуктивность и другие направления."
			: "Browse exteraStore plugins by security, automation, interface, media, productivity and other categories.";
	return {
		title: locale === "ru" ? "Категории плагинов" : "Plugin categories",
		description,
		alternates: { canonical: "/categories" },
		openGraph: {
			title:
				locale === "ru"
					? "Категории плагинов exteraStore"
					: "exteraStore plugin categories",
			description,
			url: absoluteUrl("/categories"),
			images: [OPEN_GRAPH_IMAGE],
		},
	};
}

export default function CategoriesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
