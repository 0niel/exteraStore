import type { Metadata } from "next";
import { absoluteUrl, OPEN_GRAPH_IMAGE } from "~/lib/site";

const description =
	"Разработчики плагинов для exteraGram и exteraless: проекты, рейтинги, загрузки и публичные профили авторов.";

export const metadata: Metadata = {
	title: "Разработчики плагинов",
	description,
	alternates: { canonical: "/developers" },
	openGraph: {
		title: "Разработчики exteraStore",
		description,
		url: absoluteUrl("/developers"),
		images: [OPEN_GRAPH_IMAGE],
	},
};

export default function DevelopersLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
