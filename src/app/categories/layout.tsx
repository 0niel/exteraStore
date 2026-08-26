import type { Metadata } from "next";
import { absoluteUrl, OPEN_GRAPH_IMAGE } from "~/lib/site";

const description =
	"Категории плагинов exteraStore: безопасность, автоматизация, интерфейс, медиа, продуктивность и другие направления.";

export const metadata: Metadata = {
	title: "Категории плагинов",
	description,
	alternates: { canonical: "/categories" },
	openGraph: {
		title: "Категории плагинов exteraStore",
		description,
		url: absoluteUrl("/categories"),
		images: [OPEN_GRAPH_IMAGE],
	},
};

export default function CategoriesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
