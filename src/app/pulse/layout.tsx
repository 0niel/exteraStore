import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { absoluteUrl, OPEN_GRAPH_IMAGE } from "~/lib/site";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale();
	const description =
		locale === "ru"
			? "Свежие публикации, обновления, отзывы и активность сообщества плагинов exteraStore."
			: "Recent releases, updates, reviews and activity from the exteraStore plugin community.";
	return {
		title: locale === "ru" ? "Пульс сообщества" : "Community pulse",
		description,
		alternates: { canonical: "/pulse" },
		openGraph: {
			title:
				locale === "ru"
					? "Пульс сообщества exteraStore"
					: "exteraStore community pulse",
			description,
			url: absoluteUrl("/pulse"),
			images: [OPEN_GRAPH_IMAGE],
		},
	};
}

export default function PulseLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
